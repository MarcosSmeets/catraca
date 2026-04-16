package resale

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

const resaleListingHoldStatusActive = "ACTIVE"

var (
	ErrResaleHoldListingNotActive = errors.New("listing is not available")
	ErrResaleHoldConflict         = errors.New("another buyer is finalizing this listing")
)

type ReserveResaleListingInput struct {
	UserID    uuid.UUID
	ListingID uuid.UUID
}

type ReserveResaleListingOutput struct {
	HoldID    uuid.UUID
	ExpiresAt time.Time
}

type ReserveResaleListingUseCase struct {
	listings repository.ResaleListingRepository
	holds    repository.ResaleListingHoldRepository
}

func NewReserveResaleListingUseCase(
	listings repository.ResaleListingRepository,
	holds repository.ResaleListingHoldRepository,
) *ReserveResaleListingUseCase {
	return &ReserveResaleListingUseCase{listings: listings, holds: holds}
}

func (uc *ReserveResaleListingUseCase) Execute(ctx context.Context, in ReserveResaleListingInput) (*ReserveResaleListingOutput, error) {
	l, err := uc.listings.GetByID(ctx, in.ListingID)
	if err != nil {
		return nil, err
	}
	if l.Status != string(entity.ResaleListingStatusActive) {
		return nil, ErrResaleHoldListingNotActive
	}
	if l.SellerUserID == in.UserID {
		return nil, ErrCannotBuyOwnListing
	}
	pending, err := uc.listings.HasPendingOrderForListing(ctx, l.ID)
	if err != nil {
		return nil, fmt.Errorf("reserve resale listing: pending check: %w", err)
	}
	if pending {
		return nil, ErrResaleHoldConflict
	}

	existing, err := uc.holds.GetActiveByListingID(ctx, l.ID)
	if err == nil && existing != nil {
		if existing.UserID == in.UserID {
			return &ReserveResaleListingOutput{HoldID: existing.ID, ExpiresAt: existing.ExpiresAt}, nil
		}
		return nil, ErrResaleHoldConflict
	}
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	holdID := uuid.New()
	expiresAt := time.Now().Add(entity.ReservationTTL)
	row := repository.ResaleListingHold{
		ID:              holdID,
		ResaleListingID: l.ID,
		UserID:          in.UserID,
		ExpiresAt:       expiresAt,
		Status:          resaleListingHoldStatusActive,
	}
	inserted, err := uc.holds.Insert(ctx, row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrResaleHoldConflict
		}
		return nil, fmt.Errorf("reserve resale listing: insert hold: %w", err)
	}
	return &ReserveResaleListingOutput{HoldID: inserted.ID, ExpiresAt: inserted.ExpiresAt}, nil
}
