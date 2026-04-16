package resale

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var (
	ErrAlreadyListed     = errors.New("ticket already has an active resale listing")
	ErrConnectNotReady   = errors.New("complete Stripe Connect onboarding before listing tickets for resale")
	ErrPriceAboveCap     = errors.New("price is above the allowed cap for this seat")
	ErrTicketNotEligible = errors.New("ticket is not eligible for resale")
)

type CreateResaleListingInput struct {
	UserID     uuid.UUID
	TicketID   uuid.UUID
	PriceCents int64
}

type CreateResaleListingUseCase struct {
	tickets  repository.TicketRepository
	events   repository.EventRepository
	seats    repository.SeatRepository
	users    repository.UserRepository
	listings repository.ResaleListingRepository
}

func NewCreateResaleListingUseCase(
	tickets repository.TicketRepository,
	events repository.EventRepository,
	seats repository.SeatRepository,
	users repository.UserRepository,
	listings repository.ResaleListingRepository,
) *CreateResaleListingUseCase {
	return &CreateResaleListingUseCase{
		tickets: tickets, events: events, seats: seats, users: users, listings: listings,
	}
}

func (uc *CreateResaleListingUseCase) Execute(ctx context.Context, in CreateResaleListingInput) (*repository.ResaleListing, error) {
	if in.PriceCents <= 0 {
		return nil, fmt.Errorf("price must be positive")
	}
	tk, err := uc.tickets.GetByID(ctx, in.TicketID)
	if err != nil {
		return nil, err
	}
	if tk.HolderUserID != in.UserID {
		return nil, repository.ErrNotFound
	}
	if tk.Status != entity.TicketStatusValid {
		return nil, ErrTicketNotEligible
	}
	ev, err := uc.events.GetByID(ctx, tk.EventID)
	if err != nil {
		return nil, err
	}
	if !ev.StartsAt.After(time.Now()) {
		return nil, ErrTicketNotEligible
	}
	seat, err := uc.seats.GetByID(ctx, tk.SeatID)
	if err != nil {
		return nil, err
	}
	maxCents := seat.PriceCents + (seat.PriceCents / 2) // 150% of face
	if in.PriceCents > maxCents {
		return nil, ErrPriceAboveCap
	}
	u, err := uc.users.GetByID(ctx, in.UserID)
	if err != nil {
		return nil, err
	}
	if !u.StripeConnectChargesEnabled || u.StripeConnectAccountID == "" {
		return nil, ErrConnectNotReady
	}
	if _, err := uc.listings.GetActiveByTicketID(ctx, in.TicketID); err == nil {
		return nil, ErrAlreadyListed
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	lid := uuid.New()
	row := repository.ResaleListing{
		ID:           lid,
		TicketID:     in.TicketID,
		SellerUserID: in.UserID,
		PriceCents:   in.PriceCents,
		Status:       string(entity.ResaleListingStatusActive),
	}
	if err := uc.listings.Insert(ctx, row); err != nil {
		return nil, fmt.Errorf("insert listing: %w", err)
	}
	return uc.listings.GetByID(ctx, lid)
}

type CancelResaleListingInput struct {
	UserID    uuid.UUID
	ListingID uuid.UUID
}

type CancelResaleListingUseCase struct {
	listings repository.ResaleListingRepository
}

func NewCancelResaleListingUseCase(listings repository.ResaleListingRepository) *CancelResaleListingUseCase {
	return &CancelResaleListingUseCase{listings: listings}
}

func (uc *CancelResaleListingUseCase) Execute(ctx context.Context, in CancelResaleListingInput) error {
	l, err := uc.listings.GetByID(ctx, in.ListingID)
	if err != nil {
		return err
	}
	if l.SellerUserID != in.UserID {
		return repository.ErrNotFound
	}
	if l.Status != string(entity.ResaleListingStatusActive) {
		return fmt.Errorf("listing is not active")
	}
	return uc.listings.Cancel(ctx, in.ListingID, in.UserID)
}

type ListMyResaleListingsUseCase struct {
	listings repository.ResaleListingRepository
}

func NewListMyResaleListingsUseCase(listings repository.ResaleListingRepository) *ListMyResaleListingsUseCase {
	return &ListMyResaleListingsUseCase{listings: listings}
}

func (uc *ListMyResaleListingsUseCase) Execute(ctx context.Context, userID uuid.UUID) ([]repository.ResaleListing, error) {
	return uc.listings.ListBySellerUserID(ctx, userID)
}

type ListEventResaleListingsUseCase struct {
	listings repository.ResaleListingRepository
}

func NewListEventResaleListingsUseCase(listings repository.ResaleListingRepository) *ListEventResaleListingsUseCase {
	return &ListEventResaleListingsUseCase{listings: listings}
}

func (uc *ListEventResaleListingsUseCase) Execute(ctx context.Context, eventID uuid.UUID) ([]repository.ResaleListingEventRow, error) {
	return uc.listings.ListActiveByEventID(ctx, eventID)
}
