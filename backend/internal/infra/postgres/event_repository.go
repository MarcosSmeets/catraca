package postgres

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.EventRepository = (*EventRepository)(nil)

type EventRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewEventRepository(pool *pgxpool.Pool) *EventRepository {
	return &EventRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *EventRepository) Create(ctx context.Context, e *entity.Event) error {
	_, err := r.queries.CreateEvent(ctx, pgdb.CreateEventParams{
		ID:                e.ID,
		Title:             e.Title,
		Sport:             e.Sport.String(),
		League:            e.League,
		VenueID:           e.VenueID,
		StartsAt:          e.StartsAt,
		Status:            e.Status.String(),
		ServiceFeePercent: numericFromFloat(e.ServiceFeePercent),
		HomeTeam:          e.HomeTeam,
		AwayTeam:          e.AwayTeam,
		ImageUrl:          e.ImageURL,
		VibeChips:         e.VibeChips,
	})
	if err != nil {
		return fmt.Errorf("EventRepository.Create: %w", err)
	}
	return nil
}

func (r *EventRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Event, error) {
	row, err := r.queries.GetEventByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("EventRepository.GetByID: %w", err)
	}
	return rowToEvent(row.ID, row.Title, row.Sport, row.League, row.VenueID, row.StartsAt,
		row.Status, row.ServiceFeePercent, row.HomeTeam, row.AwayTeam, row.ImageUrl,
		row.VibeChips, row.CreatedAt, row.UpdatedAt, row.DeletedAt,
		row.VenueID2, row.VenueName, row.VenueCity, row.VenueState, row.VenueCapacity,
		row.MinPriceCents, row.MaxPriceCents), nil
}

func (r *EventRepository) List(ctx context.Context, filter repository.EventFilter) ([]*entity.Event, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}

	orderBy := "e.starts_at ASC"
	if filter.Sort != nil {
		switch *filter.Sort {
		case "price-asc":
			orderBy = "COALESCE(ep.min_p, 0) ASC, e.starts_at ASC"
		case "price-desc":
			orderBy = "COALESCE(ep.min_p, 0) DESC, e.starts_at ASC"
		}
	}

	q := `
WITH event_prices AS (
    SELECT event_id, MIN(price_cents) AS min_p, MAX(price_cents) AS max_p
    FROM seats WHERE status = 'AVAILABLE' GROUP BY event_id
)
SELECT
    e.id, e.title, e.sport, e.league, e.venue_id, e.starts_at, e.status,
    e.service_fee_percent, e.home_team, e.away_team, e.image_url, e.vibe_chips,
    e.created_at, e.updated_at, e.deleted_at,
    v.id AS venue_id_2, v.name AS venue_name, v.city AS venue_city,
    v.state AS venue_state, v.capacity AS venue_capacity,
    COALESCE(ep.min_p, 0) AS min_price_cents,
    COALESCE(ep.max_p, 0) AS max_price_cents
FROM events e
JOIN venues v ON v.id = e.venue_id
LEFT JOIN event_prices ep ON ep.event_id = e.id
WHERE e.deleted_at IS NULL
  AND ($1::text IS NULL OR e.sport = $1)
  AND ($2::text IS NULL OR e.league = $2)
  AND ($3::text IS NULL OR v.city = $3)
  AND ($4::date IS NULL OR DATE(e.starts_at) >= $4::date)
  AND ($5::date IS NULL OR DATE(e.starts_at) <= $5::date)
  AND ($6::text IS NULL OR (
        e.title ILIKE '%' || $6 || '%' OR
        e.home_team ILIKE '%' || $6 || '%' OR
        e.away_team ILIKE '%' || $6 || '%' OR
        e.league ILIKE '%' || $6 || '%'
  ))
  AND ($7::bigint IS NULL OR COALESCE(ep.min_p, 0) >= $7)
  AND ($8::bigint IS NULL OR COALESCE(ep.max_p, 0) <= $8)
  AND ($9::text IS NULL OR e.status = $9)
ORDER BY ` + orderBy + `
LIMIT $10 OFFSET $11`

	args := buildEventFilterArgs(filter)
	args = append(args, int32(limit), int32(filter.Offset))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("EventRepository.List: %w", err)
	}
	defer rows.Close()

	events := make([]*entity.Event, 0)
	for rows.Next() {
		var (
			id                uuid.UUID
			title, sport, league string
			venueID           uuid.UUID
			startsAt          time.Time
			status            string
			serviceFee        pgtype.Numeric
			homeTeam, awayTeam, imageURL string
			vibeChips         []string
			createdAt, updatedAt time.Time
			deletedAt         pgtype.Timestamptz
			venueID2          uuid.UUID
			venueName, venueCity, venueState string
			venueCapacity     int32
			minPrice, maxPrice int64
		)
		if err := rows.Scan(
			&id, &title, &sport, &league, &venueID, &startsAt, &status,
			&serviceFee, &homeTeam, &awayTeam, &imageURL, &vibeChips,
			&createdAt, &updatedAt, &deletedAt,
			&venueID2, &venueName, &venueCity, &venueState, &venueCapacity,
			&minPrice, &maxPrice,
		); err != nil {
			return nil, fmt.Errorf("EventRepository.List scan: %w", err)
		}
		e := rowToEvent(id, title, sport, league, venueID, startsAt, status,
			serviceFee, homeTeam, awayTeam, imageURL, vibeChips, createdAt, updatedAt, deletedAt,
			venueID2, venueName, venueCity, venueState, venueCapacity,
			minPrice, maxPrice)
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("EventRepository.List rows: %w", err)
	}
	return events, nil
}

func (r *EventRepository) Count(ctx context.Context, filter repository.EventFilter) (int64, error) {
	q := `
WITH event_prices AS (
    SELECT event_id, MIN(price_cents) AS min_p, MAX(price_cents) AS max_p
    FROM seats WHERE status = 'AVAILABLE' GROUP BY event_id
)
SELECT COUNT(*)
FROM events e
JOIN venues v ON v.id = e.venue_id
LEFT JOIN event_prices ep ON ep.event_id = e.id
WHERE e.deleted_at IS NULL
  AND ($1::text IS NULL OR e.sport = $1)
  AND ($2::text IS NULL OR e.league = $2)
  AND ($3::text IS NULL OR v.city = $3)
  AND ($4::date IS NULL OR DATE(e.starts_at) >= $4::date)
  AND ($5::date IS NULL OR DATE(e.starts_at) <= $5::date)
  AND ($6::text IS NULL OR (
        e.title ILIKE '%' || $6 || '%' OR
        e.home_team ILIKE '%' || $6 || '%' OR
        e.away_team ILIKE '%' || $6 || '%' OR
        e.league ILIKE '%' || $6 || '%'
  ))
  AND ($7::bigint IS NULL OR COALESCE(ep.min_p, 0) >= $7)
  AND ($8::bigint IS NULL OR COALESCE(ep.max_p, 0) <= $8)
  AND ($9::text IS NULL OR e.status = $9)`

	args := buildEventFilterArgs(filter)

	var total int64
	if err := r.pool.QueryRow(ctx, q, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("EventRepository.Count: %w", err)
	}
	return total, nil
}

// buildEventFilterArgs returns the 9 positional args ($1–$9) shared by List and Count.
func buildEventFilterArgs(filter repository.EventFilter) []interface{} {
	var sport, league, city, dateFrom, dateTo, q, status interface{}
	var minPrice, maxPrice interface{}

	if filter.Sport != nil {
		sport = filter.Sport.String()
	}
	if filter.League != nil {
		league = *filter.League
	}
	if filter.City != nil {
		city = *filter.City
	}
	if filter.DateFrom != nil {
		dateFrom = *filter.DateFrom
	}
	if filter.DateTo != nil {
		dateTo = *filter.DateTo
	}
	if filter.Q != nil && *filter.Q != "" {
		q = *filter.Q
	}
	if filter.MinPrice != nil {
		minPrice = *filter.MinPrice
	}
	if filter.MaxPrice != nil {
		maxPrice = *filter.MaxPrice
	}
	if filter.Status != nil && *filter.Status != "" {
		status = filter.Status.String()
	}

	return []interface{}{sport, league, city, dateFrom, dateTo, q, minPrice, maxPrice, status}
}

func (r *EventRepository) Update(ctx context.Context, e *entity.Event) error {
	err := r.queries.UpdateEvent(ctx, pgdb.UpdateEventParams{
		ID:                e.ID,
		Title:             e.Title,
		Sport:             e.Sport.String(),
		League:            e.League,
		VenueID:           e.VenueID,
		StartsAt:          e.StartsAt,
		Status:            e.Status.String(),
		ServiceFeePercent: numericFromFloat(e.ServiceFeePercent),
		HomeTeam:          e.HomeTeam,
		AwayTeam:          e.AwayTeam,
		ImageUrl:          e.ImageURL,
		VibeChips:         e.VibeChips,
	})
	if err != nil {
		return fmt.Errorf("EventRepository.Update: %w", err)
	}
	return nil
}

// rowToEvent maps a flat sqlc JOIN row to an *entity.Event with embedded *entity.Venue.
func rowToEvent(
	id uuid.UUID, title, sport, league string, venueID uuid.UUID, startsAt time.Time,
	status string, serviceFee pgtype.Numeric, homeTeam, awayTeam, imageURL string,
	vibeChips []string, createdAt, updatedAt time.Time, deletedAt pgtype.Timestamptz,
	venueID2 uuid.UUID, venueName, venueCity, venueState string, venueCapacity int32,
	minPrice, maxPrice interface{},
) *entity.Event {
	var deletedAtPtr *time.Time
	if deletedAt.Valid {
		t := deletedAt.Time
		deletedAtPtr = &t
	}

	chips := vibeChips
	if chips == nil {
		chips = []string{}
	}

	return &entity.Event{
		ID:                id,
		Title:             title,
		Sport:             entity.SportType(sport),
		League:            league,
		VenueID:           venueID,
		StartsAt:          startsAt,
		Status:            entity.EventStatus(status),
		ServiceFeePercent: floatFromNumeric(serviceFee),
		HomeTeam:          homeTeam,
		AwayTeam:          awayTeam,
		ImageURL:          imageURL,
		VibeChips:         chips,
		MinPriceCents:     toInt64(minPrice),
		MaxPriceCents:     toInt64(maxPrice),
		CreatedAt:         createdAt,
		UpdatedAt:         updatedAt,
		DeletedAt:         deletedAtPtr,
		Venue: &entity.Venue{
			ID:       venueID2,
			Name:     venueName,
			City:     venueCity,
			State:    venueState,
			Capacity: int(venueCapacity),
		},
	}
}

// numericFromFloat converts a float64 to pgtype.Numeric by scanning its string representation.
func numericFromFloat(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	if err := n.Scan(fmt.Sprintf("%.10f", f)); err != nil {
		return pgtype.Numeric{}
	}
	return n
}

// floatFromNumeric converts pgtype.Numeric to float64 using big.Rat arithmetic.
func floatFromNumeric(n pgtype.Numeric) float64 {
	if !n.Valid || n.Int == nil {
		return 0
	}
	rat := new(big.Rat).SetInt(n.Int)
	if n.Exp >= 0 {
		exp := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(n.Exp)), nil)
		rat.Mul(rat, new(big.Rat).SetInt(exp))
	} else {
		exp := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(-n.Exp)), nil)
		rat.Quo(rat, new(big.Rat).SetInt(exp))
	}
	f, _ := rat.Float64()
	return f
}

// toInt64 safely casts interface{} (from sqlc COALESCE) to int64.
func toInt64(v interface{}) int64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case int64:
		return val
	case int32:
		return int64(val)
	case int:
		return int64(val)
	case float64:
		return int64(val)
	}
	return 0
}
