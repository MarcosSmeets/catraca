package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type VenueRepository interface {
	Create(ctx context.Context, venue *entity.Venue) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Venue, error)
	List(ctx context.Context) ([]*entity.Venue, error)
}
