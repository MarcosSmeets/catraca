package mock

import (
	"context"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var _ repository.EventRepository = (*EventRepository)(nil)

type EventRepository struct {
	mu     sync.RWMutex
	events map[uuid.UUID]*entity.Event
}

func NewEventRepository() *EventRepository {
	return &EventRepository{
		events: make(map[uuid.UUID]*entity.Event),
	}
}

func (r *EventRepository) Create(_ context.Context, event *entity.Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events[event.ID] = event
	return nil
}

func (r *EventRepository) GetByID(_ context.Context, id uuid.UUID) (*entity.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	e, ok := r.events[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return e, nil
}

func (r *EventRepository) List(_ context.Context, filter repository.EventFilter) ([]*entity.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*entity.Event
	for _, e := range r.events {
		if filter.Sport != nil && e.Sport != *filter.Sport {
			continue
		}
		if filter.League != nil && e.League != *filter.League {
			continue
		}
		if filter.City != nil && e.Venue != nil && !strings.EqualFold(e.Venue.City, *filter.City) {
			continue
		}
		result = append(result, e)
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := filter.Offset
	if offset > len(result) {
		return nil, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}

	return result[offset:end], nil
}

func (r *EventRepository) Update(_ context.Context, event *entity.Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events[event.ID] = event
	return nil
}
