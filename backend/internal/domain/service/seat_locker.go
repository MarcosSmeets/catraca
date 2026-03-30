package service

import (
	"context"

	"github.com/google/uuid"
)

type SeatLockerService interface {
	Lock(ctx context.Context, eventID, seatID, userID uuid.UUID) error
	Unlock(ctx context.Context, eventID, seatID uuid.UUID) error
	IsLocked(ctx context.Context, eventID, seatID uuid.UUID) (bool, error)
}
