package event

import (
	"context"

	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
)

type GetEventInput struct {
	EventID            uuid.UUID
	OrganizationID     *uuid.UUID
	TenantBuyerCatalog bool
}

type GetEventUseCase struct {
	eventRepo repository.EventRepository
	orgRepo   repository.OrganizationRepository
}

func NewGetEventUseCase(eventRepo repository.EventRepository, orgRepo repository.OrganizationRepository) *GetEventUseCase {
	return &GetEventUseCase{
		eventRepo: eventRepo,
		orgRepo:   orgRepo,
	}
}

func (uc *GetEventUseCase) Execute(ctx context.Context, in GetEventInput) (*entity.Event, error) {
	e, err := uc.eventRepo.GetByID(ctx, in.EventID)
	if err != nil {
		return nil, err
	}
	if in.OrganizationID != nil {
		if e.Venue == nil || e.Venue.OrganizationID != *in.OrganizationID {
			return nil, repository.ErrNotFound
		}
	}
	if in.TenantBuyerCatalog {
		if e.Status != entity.EventStatusOnSale && e.Status != entity.EventStatusSoldOut {
			return nil, repository.ErrNotFound
		}
		if e.Status == entity.EventStatusOnSale {
			org, err := uc.orgRepo.GetByID(ctx, e.Venue.OrganizationID)
			if err != nil {
				return nil, err
			}
			if !entity.SubscriptionAllowsMutations(org.SubscriptionStatus) {
				return nil, repository.ErrNotFound
			}
		}
	}
	return e, nil
}
