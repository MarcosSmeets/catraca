package ticket

import (
	"context"
	"errors"
	"fmt"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

// ErrTicketAlreadyUsed is returned when a ticket has already been scanned.
var ErrTicketAlreadyUsed = errors.New("ticket already used")

// ErrTicketCancelled is returned when a ticket is cancelled and cannot be used.
var ErrTicketCancelled = errors.New("ticket is cancelled")

// ScanTicketUseCase validates a ticket by its QR code and marks it as USED.
type ScanTicketUseCase struct {
	ticketRepo repository.TicketRepository
}

func NewScanTicketUseCase(ticketRepo repository.TicketRepository) *ScanTicketUseCase {
	return &ScanTicketUseCase{ticketRepo: ticketRepo}
}

func (uc *ScanTicketUseCase) Execute(ctx context.Context, qrCode string) (*entity.Ticket, error) {
	ticket, err := uc.ticketRepo.GetByQRCode(ctx, qrCode)
	if err != nil {
		return nil, err
	}

	if ticket.Status == entity.TicketStatusUsed {
		return ticket, ErrTicketAlreadyUsed
	}
	if ticket.Status == entity.TicketStatusCancelled {
		return nil, ErrTicketCancelled
	}

	if err := ticket.Use(); err != nil {
		return nil, fmt.Errorf("scan ticket: %w", err)
	}

	if err := uc.ticketRepo.UpdateStatus(ctx, ticket.ID, ticket.Status, ticket.UsedAt); err != nil {
		return nil, fmt.Errorf("scan ticket: %w", err)
	}

	return ticket, nil
}
