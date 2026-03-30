package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

// TicketWithDetails extends a Ticket with denormalized event and seat data.
type TicketWithDetails struct {
	entity.Ticket
	// Event fields
	EventTitle    string
	EventHomeTeam string
	EventAwayTeam string
	EventLeague   string
	EventSport    string
	EventStartsAt time.Time
	EventImageURL string
	VenueName     string
	VenueCity     string
	VenueState    string
	// Seat fields
	SeatSection    string
	SeatRow        string
	SeatNumber     string
	SeatPriceCents int64
}

type TicketRepository interface {
	Create(ctx context.Context, ticket *entity.Ticket) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Ticket, error)
	GetByIDWithDetails(ctx context.Context, id uuid.UUID) (*TicketWithDetails, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Ticket, error)
	ListByUserIDWithDetails(ctx context.Context, userID uuid.UUID) ([]*TicketWithDetails, error)
	ListByOrderID(ctx context.Context, orderID uuid.UUID) ([]*entity.Ticket, error)
}
