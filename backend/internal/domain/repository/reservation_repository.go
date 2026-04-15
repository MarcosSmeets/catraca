package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

// ExpiredActiveReservationRow identifies an ACTIVE reservation past expires_at (for sweeper / cleanup).
type ExpiredActiveReservationRow struct {
	ReservationID uuid.UUID
	SeatID        uuid.UUID
	EventID       uuid.UUID
}

type ReservationRepository interface {
	Create(ctx context.Context, reservation *entity.Reservation) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Reservation, error)
	GetActiveBySeatID(ctx context.Context, seatID uuid.UUID) (*entity.Reservation, error)
	// GetActiveStatusBySeatID returns a reservation with status ACTIVE regardless of expires_at (for lock-expiry reconciliation).
	GetActiveStatusBySeatID(ctx context.Context, seatID uuid.UUID) (*entity.Reservation, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status entity.ReservationStatus) error
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Reservation, error)
	ListExpiredActive(ctx context.Context) ([]ExpiredActiveReservationRow, error)
}
