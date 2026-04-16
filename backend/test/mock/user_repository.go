package mock

import (
	"context"
	"sync"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var _ repository.UserRepository = (*UserRepository)(nil)

type UserRepository struct {
	mu    sync.RWMutex
	users map[uuid.UUID]*entity.User
}

func NewUserRepository() *UserRepository {
	return &UserRepository{
		users: make(map[uuid.UUID]*entity.User),
	}
}

func (r *UserRepository) Create(_ context.Context, user *entity.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users[user.ID] = user
	return nil
}

func (r *UserRepository) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return u, nil
}

func (r *UserRepository) GetByEmail(_ context.Context, email string) (*entity.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (r *UserRepository) Update(_ context.Context, user *entity.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users[user.ID] = user
	return nil
}

func (r *UserRepository) ExistsByCPFHash(_ context.Context, cpfHash string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.CPFHash == cpfHash {
			return true, nil
		}
	}
	return false, nil
}

func (r *UserRepository) UpdateStripeConnect(_ context.Context, userID uuid.UUID, stripeConnectAccountID string, chargesEnabled bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	u.StripeConnectAccountID = stripeConnectAccountID
	u.StripeConnectChargesEnabled = chargesEnabled
	return nil
}

func (r *UserRepository) SetOrganizationAndRole(_ context.Context, userID, organizationID uuid.UUID, role entity.UserRole) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	u.OrganizationID = &organizationID
	u.Role = role
	return nil
}
