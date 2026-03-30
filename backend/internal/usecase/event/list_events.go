package event

import (
	"context"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

type ListEventsInput struct {
	Sport    *entity.SportType
	League   *string
	City     *string
	DateFrom *string
	DateTo   *string
	Q        *string
	MinPrice *int64
	MaxPrice *int64
	Sort     *string
	Limit    int
	Offset   int
}

type ListEventsOutput struct {
	Events []*entity.Event
	Total  int64
}

type ListEventsUseCase struct {
	eventRepo repository.EventRepository
}

func NewListEventsUseCase(eventRepo repository.EventRepository) *ListEventsUseCase {
	return &ListEventsUseCase{eventRepo: eventRepo}
}

func (uc *ListEventsUseCase) Execute(ctx context.Context, input ListEventsInput) (ListEventsOutput, error) {
	limit := input.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	filter := repository.EventFilter{
		Sport:    input.Sport,
		League:   input.League,
		City:     input.City,
		DateFrom: input.DateFrom,
		DateTo:   input.DateTo,
		Q:        input.Q,
		MinPrice: input.MinPrice,
		MaxPrice: input.MaxPrice,
		Sort:     input.Sort,
		Limit:    limit,
		Offset:   input.Offset,
	}

	events, err := uc.eventRepo.List(ctx, filter)
	if err != nil {
		return ListEventsOutput{}, err
	}

	total, err := uc.eventRepo.Count(ctx, filter)
	if err != nil {
		return ListEventsOutput{}, err
	}

	return ListEventsOutput{Events: events, Total: total}, nil
}
