package event_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/event"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/marcos-smeets/catraca/backend/test/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListSeats_ByEventID(t *testing.T) {
	org := factory.NewTestOrganization()
	org.SubscriptionStatus = entity.SubscriptionActive
	orgRepo := mock.NewOrganizationRepository()
	orgRepo.Seed(org)

	eventRepo := mock.NewEventRepository()
	venue := factory.NewTestVenue(org.ID)
	ev := factory.NewTestEvent(venue.ID)
	ev.Venue = venue
	require.NoError(t, eventRepo.Create(context.Background(), ev))

	getEventUC := event.NewGetEventUseCase(eventRepo, orgRepo)
	seatRepo := mock.NewSeatRepository()
	uc := event.NewListSeatsUseCase(getEventUC, seatRepo)

	otherEventID := uuid.New()

	s1 := factory.NewTestSeat(ev.ID)
	s2 := factory.NewTestSeat(ev.ID)
	s2.Section = "Sul"
	s3 := factory.NewTestSeat(otherEventID)

	require.NoError(t, seatRepo.CreateBatch(context.Background(), []*entity.Seat{s1, s2, s3}))

	seats, err := uc.Execute(context.Background(), event.ListSeatsInput{
		EventID:            ev.ID,
		OrganizationID:     &org.ID,
		TenantBuyerCatalog: true,
	})
	require.NoError(t, err)
	assert.Len(t, seats, 2)
}

func TestListSeats_EventNotFound(t *testing.T) {
	org := factory.NewTestOrganization()
	org.SubscriptionStatus = entity.SubscriptionActive
	orgRepo := mock.NewOrganizationRepository()
	orgRepo.Seed(org)
	eventRepo := mock.NewEventRepository()
	getEventUC := event.NewGetEventUseCase(eventRepo, orgRepo)
	seatRepo := mock.NewSeatRepository()
	uc := event.NewListSeatsUseCase(getEventUC, seatRepo)

	_, err := uc.Execute(context.Background(), event.ListSeatsInput{
		EventID:            uuid.New(),
		OrganizationID:     &org.ID,
		TenantBuyerCatalog: true,
	})
	require.ErrorIs(t, err, repository.ErrNotFound)
}
