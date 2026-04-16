package mock

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

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

	matched := filterEventsLocked(r.events, filter)
	sortEvents(matched, filter)

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	if offset >= len(matched) {
		return []*entity.Event{}, nil
	}
	end := offset + limit
	if end > len(matched) {
		end = len(matched)
	}
	out := make([]*entity.Event, end-offset)
	copy(out, matched[offset:end])
	return out, nil
}

func (r *EventRepository) Update(_ context.Context, event *entity.Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events[event.ID] = event
	return nil
}

func (r *EventRepository) Count(_ context.Context, filter repository.EventFilter) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return int64(len(filterEventsLocked(r.events, filter))), nil
}

func filterEventsLocked(events map[uuid.UUID]*entity.Event, filter repository.EventFilter) []*entity.Event {
	var matched []*entity.Event
	for _, e := range events {
		if eventMatchesFilter(e, filter) {
			matched = append(matched, e)
		}
	}
	return matched
}

func eventDateUTC(t time.Time) time.Time {
	u := t.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC)
}

func eventMatchesFilter(e *entity.Event, filter repository.EventFilter) bool {
	if e.DeletedAt != nil {
		return false
	}
	if filter.Sport != nil && e.Sport != *filter.Sport {
		return false
	}
	if filter.League != nil && e.League != *filter.League {
		return false
	}
	if filter.City != nil {
		if e.Venue == nil || !strings.EqualFold(e.Venue.City, *filter.City) {
			return false
		}
	}
	if filter.DateFrom != nil && *filter.DateFrom != "" {
		from, err := time.Parse("2006-01-02", *filter.DateFrom)
		if err == nil && eventDateUTC(e.StartsAt).Before(eventDateUTC(from)) {
			return false
		}
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		to, err := time.Parse("2006-01-02", *filter.DateTo)
		if err == nil && eventDateUTC(e.StartsAt).After(eventDateUTC(to)) {
			return false
		}
	}
	if filter.Date != nil && *filter.Date != "" {
		exact, err := time.Parse("2006-01-02", *filter.Date)
		if err == nil && !eventDateUTC(e.StartsAt).Equal(eventDateUTC(exact)) {
			return false
		}
	}
	if filter.Q != nil && *filter.Q != "" {
		q := strings.ToLower(strings.TrimSpace(*filter.Q))
		if q == "" {
			// no-op
		} else {
			title := strings.ToLower(e.Title)
			home := strings.ToLower(e.HomeTeam)
			away := strings.ToLower(e.AwayTeam)
			league := strings.ToLower(e.League)
			if !strings.Contains(title, q) && !strings.Contains(home, q) &&
				!strings.Contains(away, q) && !strings.Contains(league, q) {
				return false
			}
		}
	}
	if filter.MinPrice != nil && e.MinPriceCents < *filter.MinPrice {
		return false
	}
	if filter.MaxPrice != nil && e.MaxPriceCents > *filter.MaxPrice {
		return false
	}
	if filter.Status != nil && *filter.Status != "" && e.Status != *filter.Status {
		return false
	}
	return true
}

func sortEvents(events []*entity.Event, filter repository.EventFilter) {
	if filter.Sort != nil {
		switch *filter.Sort {
		case "price-asc":
			sort.Slice(events, func(i, j int) bool {
				if events[i].MinPriceCents != events[j].MinPriceCents {
					return events[i].MinPriceCents < events[j].MinPriceCents
				}
				return events[i].StartsAt.Before(events[j].StartsAt)
			})
			return
		case "price-desc":
			sort.Slice(events, func(i, j int) bool {
				if events[i].MinPriceCents != events[j].MinPriceCents {
					return events[i].MinPriceCents > events[j].MinPriceCents
				}
				return events[i].StartsAt.Before(events[j].StartsAt)
			})
			return
		}
	}
	sort.Slice(events, func(i, j int) bool {
		return events[i].StartsAt.Before(events[j].StartsAt)
	})
}
