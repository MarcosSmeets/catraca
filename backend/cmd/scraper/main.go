package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/marcos-smeets/catraca/backend/internal/config"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	"github.com/marcos-smeets/catraca/backend/internal/infra/scraper/nbb"
)

const (
	pgUniqueViolation     = "23505"
	defaultBasketballImage = "https://images.unsplash.com/photo-1546519638405-a9d1b2e7c6b7?w=800&q=80"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	if cfg.AppEnv == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// --- Database ---
	pool, err := pginfra.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	eventRepo := pginfra.NewEventRepository(pool)
	venueRepo := pginfra.NewVenueRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)

	// --- Skip if NBB events already exist (run-once guard) ---
	var nbbCount int
	if err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM events WHERE league = 'NBB' AND deleted_at IS NULL`,
	).Scan(&nbbCount); err != nil {
		log.Fatal().Err(err).Msg("failed to check existing NBB events")
	}
	if nbbCount > 0 {
		log.Info().Int("events", nbbCount).Msg("NBB events already present, skipping scrape")
		return
	}

	// --- Backfill existing basketball events (image + seats) ---
	if err := backfillExistingEvents(ctx, pool, seatRepo); err != nil {
		log.Warn().Err(err).Msg("backfill had errors (continuing)")
	}

	// --- Scrape ---
	log.Info().Str("url", "https://lnb.com.br/nbb/tabela-de-jogos").Msg("starting NBB scrape")

	scraper := nbb.NewScraper()
	tableHTML, err := scraper.Fetch(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("scrape failed")
	}
	log.Info().Int("html_bytes", len(tableHTML)).Msg("page fetched")

	// --- Parse ---
	games, err := nbb.ParseTable(tableHTML)
	if err != nil {
		log.Fatal().Err(err).Msg("parse failed")
	}
	log.Info().Int("games", len(games)).Msg("games parsed")

	if len(games) == 0 {
		log.Warn().Msg("no games found; the page structure may have changed")
		return
	}

	// --- Venues ---
	venueMap, err := nbb.MapVenues(ctx, games, venueRepo)
	if err != nil {
		log.Fatal().Err(err).Msg("venue mapping failed")
	}
	log.Info().Int("venues", len(venueMap)).Msg("venues resolved")

	// --- Fallback venue for games with unknown/empty venue name ---
	fallbackVenueID := resolveFallbackVenue(ctx, venueRepo)

	// --- Persist events + seats ---
	league := "NBB"

	var (
		inserted      int
		skipped       int
		failed        int
		seatsInserted int
	)

	for _, g := range games {
		venueID, ok := venueMap[g.VenueName]
		if !ok || venueID == uuid.Nil {
			if g.VenueName != "" {
				log.Warn().Str("venue", g.VenueName).Msg("venue not resolved, using fallback")
			}
			venueID = fallbackVenueID
		}

		status := entity.EventStatusOnSale
		if g.Played || g.Date.Before(time.Now()) {
			status = entity.EventStatusExpired
		}

		title := fmt.Sprintf("%s vs %s", g.HomeTeam, g.AwayTeam)

		event := &entity.Event{
			ID:                uuid.New(),
			Title:             title,
			Sport:             entity.SportBasketball,
			League:            league,
			VenueID:           venueID,
			StartsAt:          g.Date,
			Status:            status,
			ServiceFeePercent: 10,
			HomeTeam:          g.HomeTeam,
			AwayTeam:          g.AwayTeam,
			ImageURL:          defaultBasketballImage,
			VibeChips:         nil,
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}

		if err := event.Validate(); err != nil {
			log.Warn().Err(err).Str("title", title).Msg("event validation failed, skipping")
			failed++
			continue
		}

		// Skip if a matching event already exists (prevents duplicate inserts on re-runs).
		var existingCount int
		if err := pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM events
			 WHERE sport = $1 AND home_team = $2 AND away_team = $3 AND starts_at = $4 AND deleted_at IS NULL`,
			entity.SportBasketball.String(), g.HomeTeam, g.AwayTeam, g.Date,
		).Scan(&existingCount); err != nil {
			log.Warn().Err(err).Str("title", title).Msg("could not check for existing event, skipping")
			skipped++
			continue
		}
		if existingCount > 0 {
			skipped++
			continue
		}

		if err := eventRepo.Create(ctx, event); err != nil {
			if isUniqueViolation(err) {
				skipped++
				continue
			}
			log.Error().Err(err).Str("title", title).Msg("failed to insert event")
			failed++
			continue
		}

		seats := generateBasketballSeats(event.ID, g.Played)
		if err := seatRepo.CreateBatch(ctx, seats); err != nil {
			log.Warn().Err(err).Str("title", title).Msg("failed to insert seats")
		} else {
			seatsInserted += len(seats)
		}

		inserted++
		log.Debug().
			Str("title", title).
			Str("date", g.Date.Format("02/01/2006 15:04")).
			Str("venue", g.VenueName).
			Bool("played", g.Played).
			Int("seats", len(seats)).
			Msg("event inserted")
	}

	log.Info().
		Int("inserted", inserted).
		Int("skipped_duplicate", skipped).
		Int("failed", failed).
		Int("seats_inserted", seatsInserted).
		Msg("NBB scrape complete")
}

// backfillExistingEvents patches basketball events inserted by a previous run:
// sets the default image and generates seats for events that have none.
func backfillExistingEvents(ctx context.Context, pool *pgxpool.Pool, seatRepo *pginfra.SeatRepository) error {
	// 1. Set default image on events that have an empty image_url.
	tag, err := pool.Exec(ctx,
		`UPDATE events SET image_url = $1 WHERE sport = 'BASKETBALL' AND image_url = ''`,
		defaultBasketballImage,
	)
	if err != nil {
		return fmt.Errorf("backfill image update: %w", err)
	}
	log.Info().Int64("rows", tag.RowsAffected()).Msg("backfill: image URLs updated")

	// 2. Find basketball events that have no seats yet.
	rows, err := pool.Query(ctx, `
		SELECT e.id
		FROM   events e
		LEFT   JOIN seats s ON s.event_id = e.id
		WHERE  e.sport = 'BASKETBALL'
		GROUP  BY e.id
		HAVING COUNT(s.id) = 0
	`)
	if err != nil {
		return fmt.Errorf("backfill query events without seats: %w", err)
	}
	defer rows.Close()

	var eventIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return fmt.Errorf("backfill scan event id: %w", err)
		}
		eventIDs = append(eventIDs, id)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("backfill rows error: %w", err)
	}

	if len(eventIDs) == 0 {
		log.Info().Msg("backfill: all basketball events already have seats")
		return nil
	}

	log.Info().Int("events", len(eventIDs)).Msg("backfill: generating seats for events")

	var totalSeats int
	for _, id := range eventIDs {
		seats := generateBasketballSeats(id, false)
		if err := seatRepo.CreateBatch(ctx, seats); err != nil {
			if !isUniqueViolation(err) {
				log.Warn().Err(err).Str("event_id", id.String()).Msg("backfill: failed to insert seats")
			}
			continue
		}
		totalSeats += len(seats)
	}

	log.Info().Int("seats", totalSeats).Msg("backfill: seats generated")
	return nil
}

// basketballSectionDef describes a seating section with court-proximity pricing.
type basketballSectionDef struct {
	name       string
	rows       int
	cols       int
	startPrice int64 // cents for the row closest to the court
	endPrice   int64 // cents for the row farthest from the court
}

// generateBasketballSeats creates seats for all sections of a basketball arena.
// Prices decrease linearly with distance from the court (row index increases).
// Sections are ordered from sideline (most expensive) to upper tier (cheapest).
func generateBasketballSeats(eventID uuid.UUID, played bool) []*entity.Seat {
	sections := []basketballSectionDef{
		// Sideline (most expensive — courtside experience)
		{name: "Leste Premium", rows: 4, cols: 10, startPrice: 50000, endPrice: 30000},
		{name: "Oeste Premium", rows: 4, cols: 10, startPrice: 50000, endPrice: 30000},
		// Behind baskets
		{name: "Norte", rows: 6, cols: 12, startPrice: 20000, endPrice: 8000},
		{name: "Sul", rows: 6, cols: 12, startPrice: 20000, endPrice: 8000},
		// Upper tier (cheapest)
		{name: "Cadeiras Superiores", rows: 5, cols: 14, startPrice: 6000, endPrice: 2000},
	}

	// For future games: varied availability. For played games: all sold.
	futureWeights := []entity.SeatStatus{
		entity.SeatStatusAvailable, entity.SeatStatusAvailable, entity.SeatStatusAvailable,
		entity.SeatStatusAvailable, entity.SeatStatusAvailable,
		entity.SeatStatusReserved,
		entity.SeatStatusSold, entity.SeatStatusSold,
		entity.SeatStatusBlocked,
	}

	var seats []*entity.Seat
	for sIdx, section := range sections {
		for r := 0; r < section.rows; r++ {
			// Linear price interpolation: row 0 (closest) = startPrice, last row = endPrice.
			price := section.startPrice
			if section.rows > 1 {
				price = section.startPrice +
					(section.endPrice-section.startPrice)*int64(r)/int64(section.rows-1)
			}

			for c := 0; c < section.cols; c++ {
				var status entity.SeatStatus
				if played {
					status = entity.SeatStatusSold
				} else {
					roll := ((sIdx*100 + r*10 + c) * 7919) % len(futureWeights)
					status = futureWeights[roll]
				}

				seats = append(seats, &entity.Seat{
					ID:         uuid.New(),
					EventID:    eventID,
					Section:    section.name,
					Row:        string(rune('A' + r)),
					Number:     fmt.Sprintf("%d", c+1),
					PriceCents: price,
					Status:     status,
					Col:        c,
					RowIndex:   r,
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				})
			}
		}
	}
	return seats
}

// extractSeason returns the most common season string from the scraped games,
// falling back to "2025/2026" if none is found.
func extractSeason(games []nbb.ScrapedGame) string {
	counts := make(map[string]int)
	for _, g := range games {
		if g.Season != "" {
			counts[g.Season]++
		}
	}
	best, bestCount := "2025/2026", 0
	for s, c := range counts {
		if c > bestCount {
			best, bestCount = s, c
		}
	}
	return best
}

// resolveFallbackVenue returns a venue ID to use when a game has no venue name.
// It creates a stub venue "Arena NBB" if none exists.
func resolveFallbackVenue(ctx context.Context, venueRepo *pginfra.VenueRepository) uuid.UUID {
	existing, err := venueRepo.List(ctx)
	if err == nil {
		for _, v := range existing {
			if strings.EqualFold(v.Name, "Arena NBB") {
				return v.ID
			}
		}
	}

	stub, err := entity.NewVenue("Arena NBB", "Brasil", "SP", 5000)
	if err != nil {
		log.Warn().Err(err).Msg("could not create fallback venue entity")
		return uuid.Nil
	}

	if err := venueRepo.Create(ctx, stub); err != nil {
		if !isUniqueViolation(err) {
			log.Warn().Err(err).Msg("could not persist fallback venue")
		}
	}

	return stub.ID
}

// isUniqueViolation reports whether err is a PostgreSQL unique-constraint violation.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == pgUniqueViolation
	}
	return false
}
