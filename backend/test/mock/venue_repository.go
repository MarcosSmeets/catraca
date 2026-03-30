package mock

import (
	"context"
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

func (r *VenueRepository) List(_ context.Context) ([]*entity.Venue, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]*entity.Venue, 0, len(r.venues))
	for _, v := range r.venues {
		result = append(result, v)
	}
	return result, nil
}
