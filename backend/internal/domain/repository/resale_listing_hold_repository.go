package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ResaleListingHold is a time-limited checkout lock on a resale listing.
type ResaleListingHold struct {
	ID              uuid.UUID
	ResaleListingID uuid.UUID
	UserID          uuid.UUID
	ExpiresAt       time.Time
	Status          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type ResaleListingHoldRepository interface {
	Insert(ctx context.Context, hold ResaleListingHold) (*ResaleListingHold, error)
	GetByID(ctx context.Context, id uuid.UUID) (*ResaleListingHold, error)
	GetActiveByListingID(ctx context.Context, listingID uuid.UUID) (*ResaleListingHold, error)
	MarkConverted(ctx context.Context, holdID, userID uuid.UUID) (*ResaleListingHold, error)
	ExpireByUser(ctx context.Context, holdID, userID uuid.UUID) error
	RevertToActive(ctx context.Context, holdID, userID uuid.UUID) error
	ExpireStale(ctx context.Context) error
}
