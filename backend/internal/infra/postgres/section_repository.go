package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

var _ repository.SectionRepository = (*SectionRepository)(nil)

type SectionRepository struct {
	pool *pgxpool.Pool
}

func NewSectionRepository(pool *pgxpool.Pool) *SectionRepository {
	return &SectionRepository{pool: pool}
}

func (r *SectionRepository) Create(ctx context.Context, s *entity.Section) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO sections (id, event_id, name, image_url, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		s.ID, s.EventID, s.Name, s.ImageURL, s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("SectionRepository.Create: %w", err)
	}
	return nil
}

func (r *SectionRepository) ListByEventID(ctx context.Context, eventID uuid.UUID) ([]*entity.Section, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, event_id, name, image_url, created_at, updated_at
		 FROM sections
		 WHERE event_id = $1
		 ORDER BY name ASC`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("SectionRepository.ListByEventID: %w", err)
	}
	defer rows.Close()

	var sections []*entity.Section
	for rows.Next() {
		var s entity.Section
		var imageURL *string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&s.ID, &s.EventID, &s.Name, &imageURL, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("SectionRepository.ListByEventID scan: %w", err)
		}
		if imageURL != nil {
			s.ImageURL = *imageURL
		}
		s.CreatedAt = createdAt
		s.UpdatedAt = updatedAt
		sections = append(sections, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("SectionRepository.ListByEventID rows: %w", err)
	}
	return sections, nil
}
