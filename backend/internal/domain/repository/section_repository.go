package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

type SectionRepository interface {
	Create(ctx context.Context, section *entity.Section) error
	ListByEventID(ctx context.Context, eventID uuid.UUID) ([]*entity.Section, error)
}
