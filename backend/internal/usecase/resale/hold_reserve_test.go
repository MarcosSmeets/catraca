package resale_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	resaleuc "github.com/marcos-smeets/catraca/backend/internal/usecase/resale"
)

type fakeListings struct {
	listing *repository.ResaleListing
	pending bool
}

func (f *fakeListings) Insert(context.Context, repository.ResaleListing) error { return nil }
func (f *fakeListings) GetByID(context.Context, uuid.UUID) (*repository.ResaleListing, error) {
	if f.listing == nil {
		return nil, repository.ErrNotFound
	}
	return f.listing, nil
}
func (f *fakeListings) GetActiveByTicketID(context.Context, uuid.UUID) (*repository.ResaleListing, error) {
	return nil, repository.ErrNotFound
}
func (f *fakeListings) ListActiveByEventID(context.Context, uuid.UUID) ([]repository.ResaleListingEventRow, error) {
	return nil, nil
}
func (f *fakeListings) ListActiveMarketplace(context.Context) ([]repository.ResaleListingMarketplaceRow, error) {
	return nil, nil
}
func (f *fakeListings) ListBySellerUserID(context.Context, uuid.UUID) ([]repository.ResaleListing, error) {
	return nil, nil
}
func (f *fakeListings) Cancel(context.Context, uuid.UUID, uuid.UUID) error { return nil }
func (f *fakeListings) MarkSold(context.Context, uuid.UUID) error           { return nil }
func (f *fakeListings) HasPendingOrderForListing(context.Context, uuid.UUID) (bool, error) {
	return f.pending, nil
}

type fakeHolds struct {
	active *repository.ResaleListingHold
	insert *repository.ResaleListingHold
}

func (f *fakeHolds) Insert(_ context.Context, hold repository.ResaleListingHold) (*repository.ResaleListingHold, error) {
	if f.insert != nil {
		return f.insert, nil
	}
	h := hold
	return &h, nil
}
func (f *fakeHolds) GetByID(context.Context, uuid.UUID) (*repository.ResaleListingHold, error) {
	return nil, repository.ErrNotFound
}
func (f *fakeHolds) GetActiveByListingID(context.Context, uuid.UUID) (*repository.ResaleListingHold, error) {
	if f.active == nil {
		return nil, repository.ErrNotFound
	}
	return f.active, nil
}
func (f *fakeHolds) MarkConverted(context.Context, uuid.UUID, uuid.UUID) (*repository.ResaleListingHold, error) {
	return nil, nil
}
func (f *fakeHolds) ExpireByUser(context.Context, uuid.UUID, uuid.UUID) error { return nil }
func (f *fakeHolds) RevertToActive(context.Context, uuid.UUID, uuid.UUID) error {
	return nil
}
func (f *fakeHolds) ExpireStale(context.Context) error { return nil }

func TestReserveResaleListing_ConflictWhenOtherUserHolds(t *testing.T) {
	lid := uuid.New()
	other := uuid.New()
	buyer := uuid.New()

	listings := &fakeListings{
		listing: &repository.ResaleListing{
			ID: lid, TicketID: uuid.New(), SellerUserID: uuid.New(), PriceCents: 1000,
			Status: string(entity.ResaleListingStatusActive),
		},
		pending: false,
	}
	holds := &fakeHolds{
		active: &repository.ResaleListingHold{
			ID: uuid.New(), ResaleListingID: lid, UserID: other, Status: "ACTIVE",
		},
	}
	uc := resaleuc.NewReserveResaleListingUseCase(listings, holds)
	_, err := uc.Execute(context.Background(), resaleuc.ReserveResaleListingInput{
		UserID: buyer, ListingID: lid,
	})
	require.Error(t, err)
	assert.ErrorIs(t, err, resaleuc.ErrResaleHoldConflict)
}

func TestReserveResaleListing_IdempotentSameUser(t *testing.T) {
	lid := uuid.New()
	user := uuid.New()
	holdID := uuid.New()

	listings := &fakeListings{
		listing: &repository.ResaleListing{
			ID: lid, TicketID: uuid.New(), SellerUserID: uuid.New(), PriceCents: 1000,
			Status: string(entity.ResaleListingStatusActive),
		},
	}
	holds := &fakeHolds{
		active: &repository.ResaleListingHold{
			ID: holdID, ResaleListingID: lid, UserID: user, Status: "ACTIVE",
		},
	}
	uc := resaleuc.NewReserveResaleListingUseCase(listings, holds)
	out, err := uc.Execute(context.Background(), resaleuc.ReserveResaleListingInput{
		UserID: user, ListingID: lid,
	})
	require.NoError(t, err)
	assert.Equal(t, holdID, out.HoldID)
}
