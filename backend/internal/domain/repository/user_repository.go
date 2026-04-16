package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type UserRepository interface {
	Create(ctx context.Context, user *entity.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	Update(ctx context.Context, user *entity.User) error
	UpdateStripeConnect(ctx context.Context, userID uuid.UUID, stripeConnectAccountID string, chargesEnabled bool) error
	ExistsByCPFHash(ctx context.Context, cpfHash string) (bool, error)
	SetOrganizationAndRole(ctx context.Context, userID, organizationID uuid.UUID, role entity.UserRole) error
}
