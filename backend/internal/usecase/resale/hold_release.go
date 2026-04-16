package resale

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

type ReleaseResaleListingHoldInput struct {
	UserID uuid.UUID
	HoldID uuid.UUID
}

type ReleaseResaleListingHoldUseCase struct {
	holds repository.ResaleListingHoldRepository
}

func NewReleaseResaleListingHoldUseCase(holds repository.ResaleListingHoldRepository) *ReleaseResaleListingHoldUseCase {
	return &ReleaseResaleListingHoldUseCase{holds: holds}
}

func (uc *ReleaseResaleListingHoldUseCase) Execute(ctx context.Context, in ReleaseResaleListingHoldInput) error {
	h, err := uc.holds.GetByID(ctx, in.HoldID)
	if err != nil {
		return err
	}
	if h.UserID != in.UserID {
		return repository.ErrNotFound
	}
	if h.Status != resaleListingHoldStatusActive {
		return nil
	}
	return uc.holds.ExpireByUser(ctx, in.HoldID, in.UserID)
}
