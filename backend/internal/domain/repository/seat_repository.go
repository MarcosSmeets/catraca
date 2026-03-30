package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type SeatRepository interface {
	CreateBatch(ctx context.Context, seats []*entity.Seat) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Seat, error)
	ListByEventID(ctx context.Context, eventID uuid.UUID) ([]*entity.Seat, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status entity.SeatStatus) error
}
