package event

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

type ListSeatsUseCase struct {
	seatRepo repository.SeatRepository
}

func NewListSeatsUseCase(seatRepo repository.SeatRepository) *ListSeatsUseCase {
	return &ListSeatsUseCase{seatRepo: seatRepo}
}

func (uc *ListSeatsUseCase) Execute(ctx context.Context, eventID uuid.UUID) ([]*entity.Seat, error) {
	return uc.seatRepo.ListByEventID(ctx, eventID)
}
