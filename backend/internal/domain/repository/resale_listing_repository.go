package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ResaleListing is a row from ticket_resale_listings.
type ResaleListing struct {
	ID           uuid.UUID
	TicketID     uuid.UUID
	SellerUserID uuid.UUID
	PriceCents   int64
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// ResaleListingEventRow is an active listing joined to seat for public display.
type ResaleListingEventRow struct {
	ID           uuid.UUID
	TicketID     uuid.UUID
	SellerUserID uuid.UUID
	PriceCents   int64
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	EventID      uuid.UUID
	SeatSection  string
	SeatRow      string
	SeatNumber   string
}

// ResaleListingMarketplaceRow is an active listing with event/org context for the global resale feed.
type ResaleListingMarketplaceRow struct {
	ID               uuid.UUID
	TicketID         uuid.UUID
	PriceCents       int64
	Status           string
	CreatedAt        time.Time
	EventID          uuid.UUID
	EventStartsAt    time.Time
	HomeTeam         string
	AwayTeam         string
	OrganizationSlug string
	SeatSection      string
	SeatRow          string
	SeatNumber       string
}

type ResaleListingRepository interface {
	Insert(ctx context.Context, listing ResaleListing) error
	GetByID(ctx context.Context, id uuid.UUID) (*ResaleListing, error)
	GetActiveByTicketID(ctx context.Context, ticketID uuid.UUID) (*ResaleListing, error)
	ListActiveByEventID(ctx context.Context, eventID uuid.UUID) ([]ResaleListingEventRow, error)
	ListActiveMarketplace(ctx context.Context) ([]ResaleListingMarketplaceRow, error)
	ListBySellerUserID(ctx context.Context, sellerUserID uuid.UUID) ([]ResaleListing, error)
	Cancel(ctx context.Context, id, sellerUserID uuid.UUID) error
	MarkSold(ctx context.Context, id uuid.UUID) error
	HasPendingOrderForListing(ctx context.Context, listingID uuid.UUID) (bool, error)
}
