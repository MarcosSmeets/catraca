package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type OrganizationRepository interface {
	Create(ctx context.Context, o *entity.Organization) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error)
	GetBySlug(ctx context.Context, slug string) (*entity.Organization, error)
	List(ctx context.Context, limit, offset int) ([]*entity.Organization, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, o *entity.Organization) error
	UpdateSubscription(ctx context.Context, id uuid.UUID, stripeCustomerID, stripeSubscriptionID, status string, currentPeriodEnd *time.Time) error
}
