package redis

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"

	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

const seatLockTTL = 10 * time.Minute

var _ service.SeatLockerService = (*SeatLocker)(nil)

// SeatLocker implements SeatLockerService using Redis SETNX with TTL.
// Key format: seat_lock:{eventID}:{seatID}
type SeatLocker struct {
	client *goredis.Client
}

func NewSeatLocker(client *goredis.Client) *SeatLocker {
	return &SeatLocker{client: client}
}

func seatLockKey(eventID, seatID uuid.UUID) string {
	return fmt.Sprintf("seat_lock:%s:%s", eventID, seatID)
}

func (s *SeatLocker) Lock(ctx context.Context, eventID, seatID, userID uuid.UUID) error {
	key := seatLockKey(eventID, seatID)
	ok, err := s.client.SetNX(ctx, key, userID.String(), seatLockTTL).Result()
	if err != nil {
		return fmt.Errorf("SeatLocker.Lock: %w", err)
	}
	if !ok {
		return service.ErrSeatAlreadyLocked
	}
	return nil
}

func (s *SeatLocker) Unlock(ctx context.Context, eventID, seatID uuid.UUID) error {
	key := seatLockKey(eventID, seatID)
	if err := s.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("SeatLocker.Unlock: %w", err)
	}
	return nil
}

func (s *SeatLocker) IsLocked(ctx context.Context, eventID, seatID uuid.UUID) (bool, error) {
	key := seatLockKey(eventID, seatID)
	_, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, goredis.Nil) {
			return false, nil
		}
		return false, fmt.Errorf("SeatLocker.IsLocked: %w", err)
	}
	return true, nil
}
