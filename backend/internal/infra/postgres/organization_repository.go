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
	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

var _ repository.OrganizationRepository = (*OrganizationRepository)(nil)

type OrganizationRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewOrganizationRepository(pool *pgxpool.Pool) *OrganizationRepository {
	return &OrganizationRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *OrganizationRepository) Create(ctx context.Context, o *entity.Organization) error {
	_, err := r.queries.CreateOrganization(ctx, pgdb.CreateOrganizationParams{
		ID:                 o.ID,
		Name:               o.Name,
		Slug:               o.Slug,
		SubscriptionStatus: o.SubscriptionStatus,
	})
	if err != nil {
		return fmt.Errorf("OrganizationRepository.Create: %w", err)
	}
	return nil
}

func (r *OrganizationRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	row, err := r.queries.GetOrganizationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("OrganizationRepository.GetByID: %w", err)
	}
	return dbOrgToEntity(row), nil
}

func (r *OrganizationRepository) GetBySlug(ctx context.Context, slug string) (*entity.Organization, error) {
	row, err := r.queries.GetOrganizationBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("OrganizationRepository.GetBySlug: %w", err)
	}
	return dbOrgToEntity(row), nil
}

func (r *OrganizationRepository) List(ctx context.Context, limit, offset int) ([]*entity.Organization, error) {
	rows, err := r.queries.ListOrganizations(ctx, pgdb.ListOrganizationsParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("OrganizationRepository.List: %w", err)
	}
	out := make([]*entity.Organization, 0, len(rows))
	for i := range rows {
		out = append(out, dbOrgToEntity(rows[i]))
	}
	return out, nil
}

func (r *OrganizationRepository) Count(ctx context.Context) (int64, error) {
	n, err := r.queries.CountOrganizations(ctx)
	if err != nil {
		return 0, fmt.Errorf("OrganizationRepository.Count: %w", err)
	}
	return n, nil
}

func (r *OrganizationRepository) Update(ctx context.Context, o *entity.Organization) error {
	err := r.queries.UpdateOrganization(ctx, pgdb.UpdateOrganizationParams{
		ID:   o.ID,
		Name: o.Name,
		Slug: o.Slug,
	})
	if err != nil {
		return fmt.Errorf("OrganizationRepository.Update: %w", err)
	}
	return nil
}

func (r *OrganizationRepository) UpdateSubscription(ctx context.Context, id uuid.UUID, stripeCustomerID, stripeSubscriptionID, status string, currentPeriodEnd *time.Time) error {
	var end pgtype.Timestamptz
	if currentPeriodEnd != nil {
		end = pgtype.Timestamptz{Time: *currentPeriodEnd, Valid: true}
	}
	err := r.queries.UpdateOrganizationSubscription(ctx, pgdb.UpdateOrganizationSubscriptionParams{
		ID:                   id,
		StripeCustomerID:     stripeCustomerID,
		StripeSubscriptionID: stripeSubscriptionID,
		SubscriptionStatus:   status,
		CurrentPeriodEnd:     end,
	})
	if err != nil {
		return fmt.Errorf("OrganizationRepository.UpdateSubscription: %w", err)
	}
	return nil
}

func dbOrgToEntity(o pgdb.Organization) *entity.Organization {
	var deletedAt *time.Time
	if o.DeletedAt.Valid {
		t := o.DeletedAt.Time
		deletedAt = &t
	}
	var periodEnd *time.Time
	if o.CurrentPeriodEnd.Valid {
		t := o.CurrentPeriodEnd.Time
		periodEnd = &t
	}
	return &entity.Organization{
		ID:                   o.ID,
		Name:                 o.Name,
		Slug:                 o.Slug,
		StripeCustomerID:     o.StripeCustomerID,
		StripeSubscriptionID: o.StripeSubscriptionID,
		SubscriptionStatus:   o.SubscriptionStatus,
		CurrentPeriodEnd:     periodEnd,
		CreatedAt:            o.CreatedAt,
		UpdatedAt:            o.UpdatedAt,
		DeletedAt:            deletedAt,
	}
}
