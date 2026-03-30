package event

import (
	"context"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

type ListEventsInput struct {
	Sport  *entity.SportType
	League *string
	City   *string
	Date   *string
	Limit  int
	Offset int
}

type ListEventsUseCase struct {
	eventRepo repository.EventRepository
}

func NewListEventsUseCase(eventRepo repository.EventRepository) *ListEventsUseCase {
	return &ListEventsUseCase{eventRepo: eventRepo}
}

func (uc *ListEventsUseCase) Execute(ctx context.Context, input ListEventsInput) ([]*entity.Event, error) {
	limit := input.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return uc.eventRepo.List(ctx, repository.EventFilter{
		Sport:  input.Sport,
		League: input.League,
		City:   input.City,
		Date:   input.Date,
		Limit:  limit,
		Offset: input.Offset,
	})
}
