package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type VenueFilter struct {
	Q              *string
	State          *string
	City           *string
	OrganizationID *uuid.UUID
	Limit          int
	Offset         int
}

type VenueRepository interface {
	Create(ctx context.Context, venue *entity.Venue) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Venue, error)
	List(ctx context.Context, filter VenueFilter) ([]*entity.Venue, error)
	Count(ctx context.Context, filter VenueFilter) (int64, error)
	ListStates(ctx context.Context) ([]string, error)
}
