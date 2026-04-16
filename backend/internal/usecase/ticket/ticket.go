package ticket

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

// ListTicketsUseCase lists all tickets for a user, with enriched event+seat data.
type ListTicketsUseCase struct {
	ticketRepo repository.TicketRepository
}

func NewListTicketsUseCase(ticketRepo repository.TicketRepository) *ListTicketsUseCase {
	return &ListTicketsUseCase{ticketRepo: ticketRepo}
}

func (uc *ListTicketsUseCase) Execute(ctx context.Context, userID uuid.UUID) ([]*repository.TicketWithDetails, error) {
	return uc.ticketRepo.ListByUserIDWithDetails(ctx, userID)
}

// GetTicketUseCase fetches a single ticket with enriched data, enforcing ownership by current holder.
type GetTicketUseCase struct {
	ticketRepo repository.TicketRepository
}

func NewGetTicketUseCase(ticketRepo repository.TicketRepository) *GetTicketUseCase {
	return &GetTicketUseCase{ticketRepo: ticketRepo}
}

func (uc *GetTicketUseCase) Execute(ctx context.Context, ticketID, userID uuid.UUID) (*repository.TicketWithDetails, error) {
	ticket, err := uc.ticketRepo.GetByIDWithDetails(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if ticket.HolderUserID != userID {
		return nil, repository.ErrNotFound
	}
	return ticket, nil
}
