package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.SeatRepository = (*SeatRepository)(nil)

type SeatRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewSeatRepository(pool *pgxpool.Pool) *SeatRepository {
	return &SeatRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *SeatRepository) CreateBatch(ctx context.Context, seats []*entity.Seat) error {
	for _, s := range seats {
		_, err := r.queries.CreateSeat(ctx, pgdb.CreateSeatParams{
			ID:         s.ID,
			EventID:    s.EventID,
			Section:    s.Section,
			Row:        s.Row,
			Number:     s.Number,
			PriceCents: s.PriceCents,
			Status:     s.Status.String(),
			Col:        int32(s.Col),
			RowIndex:   int32(s.RowIndex),
		})
		if err != nil {
			return fmt.Errorf("SeatRepository.CreateBatch seat %s: %w", s.ID, err)
		}
	}
	return nil
}

func (r *SeatRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Seat, error) {
	row, err := r.queries.GetSeatByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("SeatRepository.GetByID: %w", err)
	}
	return dbSeatToEntity(row), nil
}

func (r *SeatRepository) ListByEventID(ctx context.Context, eventID uuid.UUID) ([]*entity.Seat, error) {
	rows, err := r.queries.ListSeatsByEventID(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("SeatRepository.ListByEventID: %w", err)
	}

	seats := make([]*entity.Seat, 0, len(rows))
	for _, row := range rows {
		seats = append(seats, dbSeatToEntity(row))
	}
	return seats, nil
}

func (r *SeatRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status entity.SeatStatus) error {
	err := r.queries.UpdateSeatStatus(ctx, pgdb.UpdateSeatStatusParams{
		ID:     id,
		Status: status.String(),
	})
	if err != nil {
		return fmt.Errorf("SeatRepository.UpdateStatus: %w", err)
	}
	return nil
}

func dbSeatToEntity(s pgdb.Seat) *entity.Seat {
	return &entity.Seat{
		ID:         s.ID,
		EventID:    s.EventID,
		Section:    s.Section,
		Row:        s.Row,
		Number:     s.Number,
		PriceCents: s.PriceCents,
		Status:     entity.SeatStatus(s.Status),
		Col:        int(s.Col),
		RowIndex:   int(s.RowIndex),
		CreatedAt:  s.CreatedAt,
		UpdatedAt:  s.UpdatedAt,
	}
}
