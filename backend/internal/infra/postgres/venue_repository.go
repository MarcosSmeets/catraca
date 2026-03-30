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
		ID:       v.ID,
		Name:     v.Name,
		City:     v.City,
		State:    v.State,
		Capacity: int32(v.Capacity),
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

func (r *VenueRepository) List(ctx context.Context) ([]*entity.Venue, error) {
	rows, err := r.queries.ListVenues(ctx)
	if err != nil {
		return nil, fmt.Errorf("VenueRepository.List: %w", err)
	}
	venues := make([]*entity.Venue, 0, len(rows))
	for _, row := range rows {
		venues = append(venues, dbVenueToEntity(row))
	}
	return venues, nil
}

func dbVenueToEntity(v pgdb.Venue) *entity.Venue {
	var deletedAt *time.Time
	if v.DeletedAt.Valid {
		t := v.DeletedAt.Time
		deletedAt = &t
	}
	return &entity.Venue{
		ID:        v.ID,
		Name:      v.Name,
		City:      v.City,
		State:     v.State,
		Capacity:  int(v.Capacity),
		CreatedAt: v.CreatedAt,
		UpdatedAt: v.UpdatedAt,
		DeletedAt: deletedAt,
	}
}
