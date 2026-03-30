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

	params := pgdb.ListEventsParams{
		QueryLimit:  int32(limit),
		QueryOffset: int32(filter.Offset),
	}

	if filter.Sport != nil {
		params.Sport = pgtype.Text{String: filter.Sport.String(), Valid: true}
	}
	if filter.League != nil {
		params.League = pgtype.Text{String: *filter.League, Valid: true}
	}
	if filter.City != nil {
		params.City = pgtype.Text{String: *filter.City, Valid: true}
	}
	if filter.Date != nil {
		t, err := time.Parse("2006-01-02", *filter.Date)
		if err == nil {
			params.Date = pgtype.Date{Time: t, Valid: true}
		}
	}

	rows, err := r.queries.ListEvents(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("EventRepository.List: %w", err)
	}

	events := make([]*entity.Event, 0, len(rows))
	for _, row := range rows {
		e := rowToEvent(row.ID, row.Title, row.Sport, row.League, row.VenueID, row.StartsAt,
			row.Status, row.ServiceFeePercent, row.HomeTeam, row.AwayTeam, row.ImageUrl,
			row.VibeChips, row.CreatedAt, row.UpdatedAt, row.DeletedAt,
			row.VenueID2, row.VenueName, row.VenueCity, row.VenueState, row.VenueCapacity,
			row.MinPriceCents, row.MaxPriceCents)
		events = append(events, e)
	}
	return events, nil
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
