package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrSeatAlreadyLocked = errors.New("seat is already locked by another user")

type SeatLockerService interface {
	Lock(ctx context.Context, eventID, seatID, userID uuid.UUID) error
	Unlock(ctx context.Context, eventID, seatID uuid.UUID) error
	IsLocked(ctx context.Context, eventID, seatID uuid.UUID) (bool, error)
}
