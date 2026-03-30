package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.UserRepository = (*UserRepository)(nil)

type UserRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *UserRepository) Create(ctx context.Context, u *entity.User) error {
	_, err := r.queries.CreateUser(ctx, pgdb.CreateUserParams{
		ID:           u.ID,
		Name:         u.Name,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
		CpfHash:      u.CPFHash,
		Phone:        u.Phone,
		Role:         string(u.Role),
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
	return dbUserToEntity(row), nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	row, err := r.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("UserRepository.GetByEmail: %w", err)
	}
	return dbUserToEntity(row), nil
}

func (r *UserRepository) Update(ctx context.Context, u *entity.User) error {
	err := r.queries.UpdateUser(ctx, pgdb.UpdateUserParams{
		ID:    u.ID,
		Name:  u.Name,
		Email: u.Email,
		Phone: u.Phone,
	})
	if err != nil {
		return fmt.Errorf("UserRepository.Update: %w", err)
	}
	// Also update password hash if set (uses raw query since sqlc query is not regenerated yet)
	if u.PasswordHash != "" {
		_, err = r.pool.Exec(ctx,
			`UPDATE users SET password_hash = $1 WHERE id = $2 AND deleted_at IS NULL`,
			u.PasswordHash, u.ID,
		)
		if err != nil {
			return fmt.Errorf("UserRepository.Update password_hash: %w", err)
		}
	}
	return nil
}

func dbUserToEntity(u pgdb.User) *entity.User {
	var deletedAt *time.Time
	if u.DeletedAt.Valid {
		t := u.DeletedAt.Time
		deletedAt = &t
	}
	return &entity.User{
		ID:           u.ID,
		Name:         u.Name,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
		CPFHash:      u.CpfHash,
		Phone:        u.Phone,
		Role:         entity.UserRole(u.Role),
		CreatedAt:    u.CreatedAt,
		UpdatedAt:    u.UpdatedAt,
		DeletedAt:    deletedAt,
	}
}
