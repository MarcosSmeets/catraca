package seed

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

const pgUniqueViolation = "23505"

// isAlreadyExists returns true if the error is a Postgres unique constraint violation.
func isAlreadyExists(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == pgUniqueViolation
	}
	return false
}

// LoadDemoData populates the database with demo venues, events, and seats.
// It is idempotent: if a record already exists (unique key collision) it is skipped.
func LoadDemoData(ctx context.Context, orgRepo repository.OrganizationRepository, eventRepo repository.EventRepository, venueRepo repository.VenueRepository, seatRepo repository.SeatRepository) error {
	org, err := orgRepo.GetBySlug(ctx, "legado")
	if err != nil {
		return fmt.Errorf("seed: resolve organization slug legado: %w", err)
	}
	venues := createVenues(org.ID)
	for _, v := range venues {
		if err := venueRepo.Create(ctx, v); err != nil {
			if isAlreadyExists(err) {
				continue
			}
			return fmt.Errorf("seed venue %s: %w", v.Name, err)
		}
	}

	events := createEvents(venues)
	for _, e := range events {
		if err := eventRepo.Create(ctx, e); err != nil {
			if isAlreadyExists(err) {
				continue
			}
			return fmt.Errorf("seed event %s: %w", e.Title, err)
		}

		seats := generateSeats(e.ID)
		if err := seatRepo.CreateBatch(ctx, seats); err != nil {
			if isAlreadyExists(err) {
				continue
			}
			return fmt.Errorf("seed seats for event %s: %w", e.Title, err)
		}

		// Compute min/max from seats for reference (stored on the Event entity;
		// the DB computes these via aggregate queries at read time).
		var minPrice, maxPrice int64
		for _, s := range seats {
			if s.Status == entity.SeatStatusAvailable {
				if minPrice == 0 || s.PriceCents < minPrice {
					minPrice = s.PriceCents
				}
				if s.PriceCents > maxPrice {
					maxPrice = s.PriceCents
				}
			}
		}
		e.MinPriceCents = minPrice
		e.MaxPriceCents = maxPrice
	}

	return nil
}

func createVenues(organizationID uuid.UUID) []*entity.Venue {
	return []*entity.Venue{
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000001"), OrganizationID: organizationID, Name: "Arena MRV", City: "Belo Horizonte", State: "MG", Capacity: 46000, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000002"), OrganizationID: organizationID, Name: "Neo Química Arena", City: "São Paulo", State: "SP", Capacity: 49205, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000003"), OrganizationID: organizationID, Name: "Maracanã", City: "Rio de Janeiro", State: "RJ", Capacity: 78838, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000004"), OrganizationID: organizationID, Name: "Ginásio do Ibirapuera", City: "São Paulo", State: "SP", Capacity: 8000, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000005"), OrganizationID: organizationID, Name: "Arena da Baixada", City: "Curitiba", State: "PR", Capacity: 42372, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000006"), OrganizationID: organizationID, Name: "Castelão", City: "Fortaleza", State: "CE", Capacity: 63903, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}
}

func createEvents(venues []*entity.Venue) []*entity.Event {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.UTC
	}

	return []*entity.Event{
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000001"), Title: "Atletico MG vs Flamengo", Sport: entity.SportFootball, League: "Série A",
			VenueID: venues[0].ID, Venue: venues[0], StartsAt: time.Date(2026, 4, 12, 16, 0, 0, 0, loc), Status: entity.EventStatusOnSale,
			ServiceFeePercent: 8, HomeTeam: "Atlético MG", AwayTeam: "Flamengo",
			ImageURL: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80", VibeChips: []string{"Vendendo Rápido"},
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000002"), Title: "Corinthians vs Palmeiras", Sport: entity.SportFootball, League: "Série A",
			VenueID: venues[1].ID, Venue: venues[1], StartsAt: time.Date(2026, 4, 19, 17, 0, 0, 0, loc), Status: entity.EventStatusOnSale,
			ServiceFeePercent: 8, HomeTeam: "Corinthians", AwayTeam: "Palmeiras",
			ImageURL: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80", VibeChips: []string{"Clássico", "Vendendo Rápido"},
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000003"), Title: "Flamengo vs Fluminense", Sport: entity.SportFootball, League: "Série A",
			VenueID: venues[2].ID, Venue: venues[2], StartsAt: time.Date(2026, 4, 26, 18, 30, 0, 0, loc), Status: entity.EventStatusSoldOut,
			ServiceFeePercent: 8, HomeTeam: "Flamengo", AwayTeam: "Fluminense",
			ImageURL: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80", VibeChips: []string{"Esgotado", "Clássico"},
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000004"), Title: "Flamengo Basquete vs Franca", Sport: entity.SportBasketball, League: "NBB",
			VenueID: venues[3].ID, Venue: venues[3], StartsAt: time.Date(2026, 4, 15, 20, 0, 0, 0, loc), Status: entity.EventStatusOnSale,
			ServiceFeePercent: 8, HomeTeam: "Flamengo Basquete", AwayTeam: "Franca",
			ImageURL: "https://images.unsplash.com/photo-1546519638405-a9d1b2e7c6b7?w=800&q=80", VibeChips: []string{"Final"},
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000005"), Title: "Athletico PR vs Grêmio", Sport: entity.SportFootball, League: "Série A",
			VenueID: venues[4].ID, Venue: venues[4], StartsAt: time.Date(2026, 5, 3, 16, 0, 0, 0, loc), Status: entity.EventStatusOnSale,
			ServiceFeePercent: 8, HomeTeam: "Athletico PR", AwayTeam: "Grêmio",
			ImageURL: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&q=80",
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000006"), Title: "Fortaleza vs Ceará", Sport: entity.SportFootball, League: "Série A",
			VenueID: venues[5].ID, Venue: venues[5], StartsAt: time.Date(2026, 5, 10, 19, 0, 0, 0, loc), Status: entity.EventStatusOnSale,
			ServiceFeePercent: 8, HomeTeam: "Fortaleza", AwayTeam: "Ceará",
			ImageURL: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80", VibeChips: []string{"Clássico Nordestino"},
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000007"), Title: "Minas Tênis vs Sada Cruzeiro", Sport: entity.SportVolleyball, League: "Superliga",
			VenueID: venues[3].ID, Venue: venues[3], StartsAt: time.Date(2026, 4, 20, 15, 0, 0, 0, loc), Status: entity.EventStatusOnSale,
			ServiceFeePercent: 8, HomeTeam: "Minas Tênis", AwayTeam: "Sada Cruzeiro",
			ImageURL: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80", VibeChips: []string{"Final"},
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: uuid.MustParse("10000000-0000-0000-0000-000000000008"), Title: "São Paulo FC vs Internacional", Sport: entity.SportFootball, League: "Série A",
			VenueID: venues[1].ID, Venue: venues[1], StartsAt: time.Date(2026, 5, 17, 18, 30, 0, 0, loc), Status: entity.EventStatusOnSale,
			ServiceFeePercent: 8, HomeTeam: "São Paulo FC", AwayTeam: "Internacional",
			ImageURL: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
	}
}

type sectionDef struct {
	name      string
	rows      int
	cols      int
	basePrice int64
}

func generateSeats(eventID uuid.UUID) []*entity.Seat {
	sections := []sectionDef{
		{name: "Norte", rows: 6, cols: 12, basePrice: 4000},
		{name: "Sul", rows: 6, cols: 12, basePrice: 4000},
		{name: "Leste Premium", rows: 4, cols: 10, basePrice: 18000},
		{name: "Oeste Premium", rows: 4, cols: 10, basePrice: 18000},
		{name: "Cadeiras Superiores", rows: 5, cols: 14, basePrice: 6500},
	}

	statusWeights := []entity.SeatStatus{
		entity.SeatStatusAvailable, entity.SeatStatusAvailable, entity.SeatStatusAvailable,
		entity.SeatStatusAvailable, entity.SeatStatusAvailable,
		entity.SeatStatusReserved,
		entity.SeatStatusSold, entity.SeatStatusSold,
		entity.SeatStatusBlocked,
	}

	var seats []*entity.Seat
	for sIdx, section := range sections {
		for r := 0; r < section.rows; r++ {
			for c := 0; c < section.cols; c++ {
				roll := ((sIdx*100 + r*10 + c) * 7919) % len(statusWeights)
				seats = append(seats, &entity.Seat{
					ID:         uuid.New(),
					EventID:    eventID,
					Section:    section.name,
					Row:        string(rune('A' + r)),
					Number:     fmt.Sprintf("%d", c+1),
					PriceCents: section.basePrice,
					Status:     statusWeights[roll],
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
