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

var _ repository.ReservationRepository = (*ReservationRepository)(nil)

type ReservationRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewReservationRepository(pool *pgxpool.Pool) *ReservationRepository {
	return &ReservationRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *ReservationRepository) Create(ctx context.Context, res *entity.Reservation) error {
	_, err := r.queries.CreateReservation(ctx, pgdb.CreateReservationParams{
		ID:        res.ID,
		SeatID:    res.SeatID,
		UserID:    res.UserID,
		ExpiresAt: res.ExpiresAt,
		Status:    res.Status.String(),
	})
	if err != nil {
		return fmt.Errorf("ReservationRepository.Create: %w", err)
	}
	return nil
}

func (r *ReservationRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Reservation, error) {
	row, err := r.queries.GetReservationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ReservationRepository.GetByID: %w", err)
	}
	return dbReservationToEntity(row), nil
}

func (r *ReservationRepository) GetActiveBySeatID(ctx context.Context, seatID uuid.UUID) (*entity.Reservation, error) {
	row, err := r.queries.GetActiveReservationBySeatID(ctx, seatID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ReservationRepository.GetActiveBySeatID: %w", err)
	}
	return dbReservationToEntity(row), nil
}

func (r *ReservationRepository) GetActiveStatusBySeatID(ctx context.Context, seatID uuid.UUID) (*entity.Reservation, error) {
	row, err := r.queries.GetActiveStatusReservationBySeatID(ctx, seatID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ReservationRepository.GetActiveStatusBySeatID: %w", err)
	}
	return dbReservationToEntity(row), nil
}

func (r *ReservationRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status entity.ReservationStatus) error {
	err := r.queries.UpdateReservationStatus(ctx, pgdb.UpdateReservationStatusParams{
		ID:     id,
		Status: status.String(),
	})
	if err != nil {
		return fmt.Errorf("ReservationRepository.UpdateStatus: %w", err)
	}
	return nil
}

func (r *ReservationRepository) ListExpiredActive(ctx context.Context) ([]repository.ExpiredActiveReservationRow, error) {
	rows, err := r.queries.ListExpiredActiveReservations(ctx)
	if err != nil {
		return nil, fmt.Errorf("ReservationRepository.ListExpiredActive: %w", err)
	}
	out := make([]repository.ExpiredActiveReservationRow, 0, len(rows))
	for _, row := range rows {
		out = append(out, repository.ExpiredActiveReservationRow{
			ReservationID: row.ReservationID,
			SeatID:        row.SeatID,
			EventID:       row.EventID,
		})
	}
	return out, nil
}

func (r *ReservationRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Reservation, error) {
	rows, err := r.queries.ListReservationsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ReservationRepository.ListByUserID: %w", err)
	}
	reservations := make([]*entity.Reservation, 0, len(rows))
	for _, row := range rows {
		reservations = append(reservations, dbReservationToEntity(row))
	}
	return reservations, nil
}

func dbReservationToEntity(r pgdb.Reservation) *entity.Reservation {
	return &entity.Reservation{
		ID:        r.ID,
		SeatID:    r.SeatID,
		UserID:    r.UserID,
		ExpiresAt: r.ExpiresAt,
		Status:    entity.ReservationStatus(r.Status),
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}
