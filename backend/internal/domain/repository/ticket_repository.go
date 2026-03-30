package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type TicketRepository interface {
	Create(ctx context.Context, ticket *entity.Ticket) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Ticket, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Ticket, error)
	ListByOrderID(ctx context.Context, orderID uuid.UUID) ([]*entity.Ticket, error)
}
