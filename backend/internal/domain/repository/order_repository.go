package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type OrderRepository interface {
	Create(ctx context.Context, order *entity.Order) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Order, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*entity.Order, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status entity.OrderStatus) error
	UpdateStripePaymentID(ctx context.Context, id uuid.UUID, stripePaymentID string) error
}
