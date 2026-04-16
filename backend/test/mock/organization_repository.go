package mock

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var _ repository.OrganizationRepository = (*OrganizationRepository)(nil)

// OrganizationRepository is a minimal in-memory stub for tests.
type OrganizationRepository struct {
	mu   sync.RWMutex
	orgs map[uuid.UUID]*entity.Organization
}

func NewOrganizationRepository() *OrganizationRepository {
	return &OrganizationRepository{orgs: make(map[uuid.UUID]*entity.Organization)}
}

func (r *OrganizationRepository) Seed(org *entity.Organization) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.orgs[org.ID] = org
}

func (r *OrganizationRepository) Create(_ context.Context, o *entity.Organization) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.orgs[o.ID] = o
	return nil
}

func (r *OrganizationRepository) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if o, ok := r.orgs[id]; ok {
		return o, nil
	}
	return &entity.Organization{
		ID:                 id,
		SubscriptionStatus: entity.SubscriptionActive,
	}, nil
}

func (r *OrganizationRepository) GetBySlug(_ context.Context, slug string) (*entity.Organization, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, o := range r.orgs {
		if o.Slug == slug {
			return o, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (r *OrganizationRepository) List(_ context.Context, _, _ int) ([]*entity.Organization, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*entity.Organization, 0, len(r.orgs))
	for _, o := range r.orgs {
		out = append(out, o)
	}
	return out, nil
}

func (r *OrganizationRepository) Count(_ context.Context) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return int64(len(r.orgs)), nil
}

func (r *OrganizationRepository) Update(_ context.Context, o *entity.Organization) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.orgs[o.ID] = o
	return nil
}

func (r *OrganizationRepository) UpdateSubscription(_ context.Context, id uuid.UUID, stripeCustomerID, stripeSubscriptionID, status string, currentPeriodEnd *time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	o, ok := r.orgs[id]
	if !ok {
		o = &entity.Organization{ID: id}
		r.orgs[id] = o
	}
	o.StripeCustomerID = stripeCustomerID
	o.StripeSubscriptionID = stripeSubscriptionID
	o.SubscriptionStatus = status
	o.CurrentPeriodEnd = currentPeriodEnd
	return nil
}
