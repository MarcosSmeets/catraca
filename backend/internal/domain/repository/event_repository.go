package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type EventFilter struct {
	Sport     *entity.SportType
	League    *string
	City      *string
	Date      *string
	DateFrom  *string
	DateTo    *string
	Q         *string
	MinPrice  *int64
	MaxPrice  *int64
	Sort      *string
	Limit     int
	Offset    int
}

type EventRepository interface {
	Create(ctx context.Context, event *entity.Event) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Event, error)
	List(ctx context.Context, filter EventFilter) ([]*entity.Event, error)
	Count(ctx context.Context, filter EventFilter) (int64, error)
	Update(ctx context.Context, event *entity.Event) error
}
