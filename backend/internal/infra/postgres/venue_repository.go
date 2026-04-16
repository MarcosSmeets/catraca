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

var _ repository.VenueRepository = (*VenueRepository)(nil)

type VenueRepository struct {
	pool    *pgxpool.Pool
	queries *pgdb.Queries
}

func NewVenueRepository(pool *pgxpool.Pool) *VenueRepository {
	return &VenueRepository{
		pool:    pool,
		queries: pgdb.New(pool),
	}
}

func (r *VenueRepository) Create(ctx context.Context, v *entity.Venue) error {
	_, err := r.queries.CreateVenue(ctx, pgdb.CreateVenueParams{
		ID:             v.ID,
		Name:           v.Name,
		City:           v.City,
		State:          v.State,
		Capacity:       int32(v.Capacity),
		OrganizationID: v.OrganizationID,
	})
	if err != nil {
		return fmt.Errorf("VenueRepository.Create: %w", err)
	}
	return nil
}

func (r *VenueRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Venue, error) {
	row, err := r.queries.GetVenueByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("VenueRepository.GetByID: %w", err)
	}
	return dbVenueToEntity(row), nil
}

func (r *VenueRepository) List(ctx context.Context, filter repository.VenueFilter) ([]*entity.Venue, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}

	q := `
SELECT id, name, city, state, capacity, organization_id, created_at, updated_at, deleted_at
FROM venues
WHERE deleted_at IS NULL
  AND ($1::text IS NULL OR state = $1)
  AND ($2::text IS NULL OR city ILIKE '%' || $2 || '%')
  AND ($3::text IS NULL OR (
        name ILIKE '%' || $3 || '%' OR
        city ILIKE '%' || $3 || '%' OR
        state ILIKE '%' || $3 || '%'
  ))
  AND ($4::uuid IS NULL OR organization_id = $4)
ORDER BY name
LIMIT $5 OFFSET $6`

	args := buildVenueFilterArgs(filter)
	args = append(args, int32(limit), int32(filter.Offset))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("VenueRepository.List: %w", err)
	}
	defer rows.Close()

	venues := make([]*entity.Venue, 0)
	for rows.Next() {
		var v pgdb.Venue
		if err := rows.Scan(
			&v.ID, &v.Name, &v.City, &v.State, &v.Capacity, &v.OrganizationID,
			&v.CreatedAt, &v.UpdatedAt, &v.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("VenueRepository.List scan: %w", err)
		}
		venues = append(venues, dbVenueToEntity(v))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("VenueRepository.List rows: %w", err)
	}
	return venues, nil
}

func (r *VenueRepository) Count(ctx context.Context, filter repository.VenueFilter) (int64, error) {
	q := `
SELECT COUNT(*)
FROM venues
WHERE deleted_at IS NULL
  AND ($1::text IS NULL OR state = $1)
  AND ($2::text IS NULL OR city ILIKE '%' || $2 || '%')
  AND ($3::text IS NULL OR (
        name ILIKE '%' || $3 || '%' OR
        city ILIKE '%' || $3 || '%' OR
        state ILIKE '%' || $3 || '%'
  ))
  AND ($4::uuid IS NULL OR organization_id = $4)`

	args := buildVenueFilterArgs(filter)
	var total int64
	if err := r.pool.QueryRow(ctx, q, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("VenueRepository.Count: %w", err)
	}
	return total, nil
}

func (r *VenueRepository) ListStates(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT DISTINCT state FROM venues WHERE deleted_at IS NULL ORDER BY state`)
	if err != nil {
		return nil, fmt.Errorf("VenueRepository.ListStates: %w", err)
	}
	defer rows.Close()

	states := make([]string, 0)
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, fmt.Errorf("VenueRepository.ListStates scan: %w", err)
		}
		states = append(states, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("VenueRepository.ListStates rows: %w", err)
	}
	return states, nil
}

// buildVenueFilterArgs returns the 4 positional args ($1–$4) shared by List and Count.
func buildVenueFilterArgs(filter repository.VenueFilter) []interface{} {
	var state, city, q interface{}
	var orgID interface{}
	if filter.OrganizationID != nil {
		orgID = *filter.OrganizationID
	}
	if filter.State != nil && *filter.State != "" {
		state = *filter.State
	}
	if filter.City != nil && *filter.City != "" {
		city = *filter.City
	}
	if filter.Q != nil && *filter.Q != "" {
		q = *filter.Q
	}
	return []interface{}{state, city, q, orgID}
}

func dbVenueToEntity(v pgdb.Venue) *entity.Venue {
	var deletedAt *time.Time
	if v.DeletedAt.Valid {
		t := v.DeletedAt.Time
		deletedAt = &t
	}
	return &entity.Venue{
		ID:             v.ID,
		OrganizationID: v.OrganizationID,
		Name:           v.Name,
		City:           v.City,
		State:          v.State,
		Capacity:       int(v.Capacity),
		CreatedAt:      v.CreatedAt,
		UpdatedAt:      v.UpdatedAt,
		DeletedAt:      deletedAt,
	}
}
