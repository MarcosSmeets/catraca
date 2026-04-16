package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/infra/crypto"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.UserRepository = (*UserRepository)(nil)

type UserRepository struct {
	pool     *pgxpool.Pool
	queries  *pgdb.Queries
	phoneKey string
}

func NewUserRepository(pool *pgxpool.Pool, phoneKey string) *UserRepository {
	return &UserRepository{
		pool:     pool,
		queries:  pgdb.New(pool),
		phoneKey: phoneKey,
	}
}

func (r *UserRepository) Create(ctx context.Context, u *entity.User) error {
	encPhone, err := crypto.Encrypt(u.Phone, r.phoneKey)
	if err != nil {
		return fmt.Errorf("UserRepository.Create: encrypt phone: %w", err)
	}
	var orgID pgtype.UUID
	if u.OrganizationID != nil {
		orgID = pgtype.UUID{Bytes: *u.OrganizationID, Valid: true}
	}
	_, err = r.queries.CreateUser(ctx, pgdb.CreateUserParams{
		ID:             u.ID,
		Name:           u.Name,
		Email:          u.Email,
		PasswordHash:   u.PasswordHash,
		CpfHash:        u.CPFHash,
		Phone:          encPhone,
		Role:           string(u.Role),
		OrganizationID: orgID,
	})
	if err != nil {
		return fmt.Errorf("UserRepository.Create: %w", err)
	}
	return nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	row, err := r.queries.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("UserRepository.GetByID: %w", err)
	}
	return r.dbUserToEntity(row)
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	row, err := r.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("UserRepository.GetByEmail: %w", err)
	}
	return r.dbUserToEntity(row)
}

func (r *UserRepository) Update(ctx context.Context, u *entity.User) error {
	encPhone, err := crypto.Encrypt(u.Phone, r.phoneKey)
	if err != nil {
		return fmt.Errorf("UserRepository.Update: encrypt phone: %w", err)
	}
	err = r.queries.UpdateUser(ctx, pgdb.UpdateUserParams{
		ID:    u.ID,
		Name:  u.Name,
		Email: u.Email,
		Phone: encPhone,
	})
	if err != nil {
		return fmt.Errorf("UserRepository.Update: %w", err)
	}
	if u.PasswordHash != "" {
		if err := r.queries.UpdateUserPassword(ctx, pgdb.UpdateUserPasswordParams{
			ID:           u.ID,
			PasswordHash: u.PasswordHash,
		}); err != nil {
			return fmt.Errorf("UserRepository.Update password_hash: %w", err)
		}
	}
	return nil
}

func (r *UserRepository) UpdateStripeConnect(ctx context.Context, userID uuid.UUID, stripeConnectAccountID string, chargesEnabled bool) error {
	if err := r.queries.UpdateUserStripeConnect(ctx, pgdb.UpdateUserStripeConnectParams{
		ID:                          userID,
		StripeConnectAccountID:      stripeConnectAccountID,
		StripeConnectChargesEnabled: chargesEnabled,
	}); err != nil {
		return fmt.Errorf("UserRepository.UpdateStripeConnect: %w", err)
	}
	return nil
}

func (r *UserRepository) SetOrganizationAndRole(ctx context.Context, userID, organizationID uuid.UUID, role entity.UserRole) error {
	err := r.queries.SetUserOrganizationAndRole(ctx, pgdb.SetUserOrganizationAndRoleParams{
		ID:             userID,
		OrganizationID: pgtype.UUID{Bytes: organizationID, Valid: true},
		Role:           string(role),
	})
	if err != nil {
		return fmt.Errorf("UserRepository.SetOrganizationAndRole: %w", err)
	}
	return nil
}

func (r *UserRepository) ExistsByCPFHash(ctx context.Context, cpfHash string) (bool, error) {
	exists, err := r.queries.ExistsByCPFHash(ctx, cpfHash)
	if err != nil {
		return false, fmt.Errorf("UserRepository.ExistsByCPFHash: %w", err)
	}
	return exists, nil
}

func (r *UserRepository) dbUserToEntity(u pgdb.User) (*entity.User, error) {
	var deletedAt *time.Time
	if u.DeletedAt.Valid {
		t := u.DeletedAt.Time
		deletedAt = &t
	}
	phone, err := crypto.Decrypt(u.Phone, r.phoneKey)
	if err != nil {
		return nil, fmt.Errorf("UserRepository: decrypt phone: %w", err)
	}
	var orgPtr *uuid.UUID
	if u.OrganizationID.Valid {
		id := uuid.UUID(u.OrganizationID.Bytes)
		orgPtr = &id
	}
	return &entity.User{
		ID:                          u.ID,
		Name:                        u.Name,
		Email:                       u.Email,
		PasswordHash:                u.PasswordHash,
		CPFHash:                     u.CpfHash,
		Phone:                       phone,
		Role:                        entity.UserRole(u.Role),
		OrganizationID:              orgPtr,
		StripeConnectAccountID:      u.StripeConnectAccountID,
		StripeConnectChargesEnabled: u.StripeConnectChargesEnabled,
		CreatedAt:                   u.CreatedAt,
		UpdatedAt:                   u.UpdatedAt,
		DeletedAt:                   deletedAt,
	}, nil
}
