package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.ResaleListingHoldRepository = (*ResaleListingHoldRepository)(nil)

type ResaleListingHoldRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewResaleListingHoldRepository(pool *pgxpool.Pool) *ResaleListingHoldRepository {
	return &ResaleListingHoldRepository{pool: pool, queries: pgdb.New(pool)}
}

func (r *ResaleListingHoldRepository) Insert(ctx context.Context, hold repository.ResaleListingHold) (*repository.ResaleListingHold, error) {
	row, err := r.queries.InsertResaleListingHold(ctx, pgdb.InsertResaleListingHoldParams{
		ID:              hold.ID,
		ResaleListingID: hold.ResaleListingID,
		UserID:          hold.UserID,
		ExpiresAt:       hold.ExpiresAt,
		Status:          hold.Status,
	})
	if err != nil {
		return nil, fmt.Errorf("ResaleListingHoldRepository.Insert: %w", err)
	}
	return dbHoldToRepo(row), nil
}

func (r *ResaleListingHoldRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.ResaleListingHold, error) {
	row, err := r.queries.GetResaleListingHoldByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ResaleListingHoldRepository.GetByID: %w", err)
	}
	return dbHoldToRepo(row), nil
}

func (r *ResaleListingHoldRepository) GetActiveByListingID(ctx context.Context, listingID uuid.UUID) (*repository.ResaleListingHold, error) {
	row, err := r.queries.GetActiveResaleListingHoldByListingID(ctx, listingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ResaleListingHoldRepository.GetActiveByListingID: %w", err)
	}
	return dbHoldToRepo(row), nil
}

func (r *ResaleListingHoldRepository) MarkConverted(ctx context.Context, holdID, userID uuid.UUID) (*repository.ResaleListingHold, error) {
	row, err := r.queries.MarkResaleListingHoldConverted(ctx, pgdb.MarkResaleListingHoldConvertedParams{
		ID:     holdID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("ResaleListingHoldRepository.MarkConverted: %w", err)
	}
	return dbHoldToRepo(row), nil
}

func (r *ResaleListingHoldRepository) ExpireByUser(ctx context.Context, holdID, userID uuid.UUID) error {
	if err := r.queries.MarkResaleListingHoldExpiredByUser(ctx, pgdb.MarkResaleListingHoldExpiredByUserParams{
		ID:     holdID,
		UserID: userID,
	}); err != nil {
		return fmt.Errorf("ResaleListingHoldRepository.ExpireByUser: %w", err)
	}
	return nil
}

func (r *ResaleListingHoldRepository) RevertToActive(ctx context.Context, holdID, userID uuid.UUID) error {
	if err := r.queries.RevertResaleListingHoldToActive(ctx, pgdb.RevertResaleListingHoldToActiveParams{
		ID:     holdID,
		UserID: userID,
	}); err != nil {
		return fmt.Errorf("ResaleListingHoldRepository.RevertToActive: %w", err)
	}
	return nil
}

func (r *ResaleListingHoldRepository) ExpireStale(ctx context.Context) error {
	if err := r.queries.ExpireStaleResaleListingHolds(ctx); err != nil {
		return fmt.Errorf("ResaleListingHoldRepository.ExpireStale: %w", err)
	}
	return nil
}

func dbHoldToRepo(row pgdb.ResaleListingHold) *repository.ResaleListingHold {
	return &repository.ResaleListingHold{
		ID:              row.ID,
		ResaleListingID: row.ResaleListingID,
		UserID:          row.UserID,
		ExpiresAt:       row.ExpiresAt,
		Status:          row.Status,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
	}
}
