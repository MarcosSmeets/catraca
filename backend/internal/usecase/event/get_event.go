package event

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

type GetEventUseCase struct {
	eventRepo repository.EventRepository
}

func NewGetEventUseCase(eventRepo repository.EventRepository) *GetEventUseCase {
	return &GetEventUseCase{eventRepo: eventRepo}
}

func (uc *GetEventUseCase) Execute(ctx context.Context, id uuid.UUID) (*entity.Event, error) {
	return uc.eventRepo.GetByID(ctx, id)
}
