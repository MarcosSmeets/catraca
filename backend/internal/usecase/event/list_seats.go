package event

import (
	"context"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

type ListSeatsInput struct {
	EventID            uuid.UUID
	OrganizationID     *uuid.UUID
	TenantBuyerCatalog bool
}

type ListSeatsUseCase struct {
	getEvent *GetEventUseCase
	seatRepo repository.SeatRepository
}

func NewListSeatsUseCase(getEvent *GetEventUseCase, seatRepo repository.SeatRepository) *ListSeatsUseCase {
	return &ListSeatsUseCase{
		getEvent: getEvent,
		seatRepo: seatRepo,
	}
}

func (uc *ListSeatsUseCase) Execute(ctx context.Context, in ListSeatsInput) ([]*entity.Seat, error) {
	_, err := uc.getEvent.Execute(ctx, GetEventInput{
		EventID:            in.EventID,
		OrganizationID:     in.OrganizationID,
		TenantBuyerCatalog: in.TenantBuyerCatalog,
	})
	if err != nil {
		return nil, err
	}
	return uc.seatRepo.ListByEventID(ctx, in.EventID)
}
