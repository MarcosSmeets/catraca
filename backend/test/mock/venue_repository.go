package mock

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var _ repository.VenueRepository = (*VenueRepository)(nil)

type VenueRepository struct {
	mu     sync.RWMutex
	venues map[uuid.UUID]*entity.Venue
}

func NewVenueRepository() *VenueRepository {
	return &VenueRepository{
		venues: make(map[uuid.UUID]*entity.Venue),
	}
}

func (r *VenueRepository) Create(_ context.Context, venue *entity.Venue) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.venues[venue.ID] = venue
	return nil
}

func (r *VenueRepository) GetByID(_ context.Context, id uuid.UUID) (*entity.Venue, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	v, ok := r.venues[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return v, nil
}

func (r *VenueRepository) List(_ context.Context, filter repository.VenueFilter) ([]*entity.Venue, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := r.filterVenues(filter)

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	start := filter.Offset
	if start > len(filtered) {
		start = len(filtered)
	}
	end := start + limit
	if end > len(filtered) {
		end = len(filtered)
	}
	return filtered[start:end], nil
}

func (r *VenueRepository) Count(_ context.Context, filter repository.VenueFilter) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return int64(len(r.filterVenues(filter))), nil
}

func (r *VenueRepository) ListStates(_ context.Context) ([]string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	set := make(map[string]struct{})
	for _, v := range r.venues {
		set[v.State] = struct{}{}
	}
	states := make([]string, 0, len(set))
	for s := range set {
		states = append(states, s)
	}
	sort.Strings(states)
	return states, nil
}

func (r *VenueRepository) filterVenues(filter repository.VenueFilter) []*entity.Venue {
	result := make([]*entity.Venue, 0, len(r.venues))
	for _, v := range r.venues {
		if filter.State != nil && *filter.State != "" && v.State != *filter.State {
			continue
		}
		if filter.City != nil && *filter.City != "" && !strings.Contains(strings.ToLower(v.City), strings.ToLower(*filter.City)) {
			continue
		}
		if filter.Q != nil && *filter.Q != "" {
			q := strings.ToLower(*filter.Q)
			if !strings.Contains(strings.ToLower(v.Name), q) &&
				!strings.Contains(strings.ToLower(v.City), q) &&
				!strings.Contains(strings.ToLower(v.State), q) {
				continue
			}
		}
		result = append(result, v)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result
}
