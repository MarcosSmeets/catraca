package mock

import (
	"context"
	"sync"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var _ repository.SeatRepository = (*SeatRepository)(nil)

type SeatRepository struct {
	mu    sync.RWMutex
	seats map[uuid.UUID]*entity.Seat
}

func NewSeatRepository() *SeatRepository {
	return &SeatRepository{
		seats: make(map[uuid.UUID]*entity.Seat),
	}
}

func (r *SeatRepository) CreateBatch(_ context.Context, seats []*entity.Seat) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, s := range seats {
		r.seats[s.ID] = s
	}
	return nil
}

func (r *SeatRepository) GetByID(_ context.Context, id uuid.UUID) (*entity.Seat, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	s, ok := r.seats[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return s, nil
}

func (r *SeatRepository) ListByEventID(_ context.Context, eventID uuid.UUID) ([]*entity.Seat, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*entity.Seat
	for _, s := range r.seats {
		if s.EventID == eventID {
			result = append(result, s)
		}
	}
	return result, nil
}

func (r *SeatRepository) UpdateStatus(_ context.Context, id uuid.UUID, status entity.SeatStatus) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	s, ok := r.seats[id]
	if !ok {
		return repository.ErrNotFound
	}
	s.Status = status
	return nil
}
