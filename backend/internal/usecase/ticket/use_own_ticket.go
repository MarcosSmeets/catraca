package ticket

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

// UseOwnTicketUseCase marks a ticket as used when the authenticated user owns it.
type UseOwnTicketUseCase struct {
	ticketRepo repository.TicketRepository
	orderRepo  repository.OrderRepository
}

func NewUseOwnTicketUseCase(ticketRepo repository.TicketRepository, orderRepo repository.OrderRepository) *UseOwnTicketUseCase {
	return &UseOwnTicketUseCase{ticketRepo: ticketRepo, orderRepo: orderRepo}
}

func (uc *UseOwnTicketUseCase) Execute(ctx context.Context, ticketID, userID uuid.UUID) (*entity.Ticket, error) {
	td, err := uc.ticketRepo.GetByIDWithDetails(ctx, ticketID)
	if err != nil {
		return nil, err
	}

	order, err := uc.orderRepo.GetByID(ctx, td.OrderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, repository.ErrNotFound
	}

	t := td.Ticket
	if t.Status == entity.TicketStatusUsed {
		return &t, ErrTicketAlreadyUsed
	}
	if t.Status == entity.TicketStatusCancelled {
		return nil, ErrTicketCancelled
	}

	if err := t.Use(); err != nil {
		return nil, fmt.Errorf("use own ticket: %w", err)
	}

	if err := uc.ticketRepo.UpdateStatus(ctx, t.ID, t.Status, t.UsedAt); err != nil {
		return nil, fmt.Errorf("use own ticket: %w", err)
	}

	return &t, nil
}
