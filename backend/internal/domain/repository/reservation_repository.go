package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type ReservationRepository interface {
	Create(ctx context.Context, reservation *entity.Reservation) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Reservation, error)
	GetActiveBySeatID(ctx context.Context, seatID uuid.UUID) (*entity.Reservation, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status entity.ReservationStatus) error
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Reservation, error)
}
