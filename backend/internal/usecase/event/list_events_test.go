package event_test

import (
	"context"
	"testing"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/event"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/marcos-smeets/catraca/backend/test/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListEvents_All(t *testing.T) {
	repo := mock.NewEventRepository()
	uc := event.NewListEventsUseCase(repo)

	org := factory.NewTestOrganization()
	venue := factory.NewTestVenue(org.ID)
	e1 := factory.NewTestEvent(venue.ID)
	e1.Venue = venue
	e2 := factory.NewTestEvent(venue.ID)
	e2.Venue = venue
	e2.Title = "Corinthians vs Palmeiras"

	repo.Create(context.Background(), e1)
	repo.Create(context.Background(), e2)

	events, err := uc.Execute(context.Background(), event.ListEventsInput{})
	require.NoError(t, err)
	assert.Len(t, events.Events, 2)
}

func TestListEvents_FilterBySport(t *testing.T) {
	repo := mock.NewEventRepository()
	uc := event.NewListEventsUseCase(repo)

	org := factory.NewTestOrganization()
	venue := factory.NewTestVenue(org.ID)

	e1 := factory.NewTestEvent(venue.ID)
	e1.Venue = venue
	e1.Sport = entity.SportFootball

	e2 := factory.NewTestEvent(venue.ID)
	e2.Venue = venue
	e2.Sport = entity.SportBasketball

	repo.Create(context.Background(), e1)
	repo.Create(context.Background(), e2)

	sport := entity.SportFootball
	events, err := uc.Execute(context.Background(), event.ListEventsInput{
		Sport: &sport,
	})
	require.NoError(t, err)
	assert.Len(t, events.Events, 1)
	assert.Equal(t, entity.SportFootball, events.Events[0].Sport)
}

func TestListEvents_DefaultLimit(t *testing.T) {
	repo := mock.NewEventRepository()
	uc := event.NewListEventsUseCase(repo)

	// Zero limit should default to 20
	events, err := uc.Execute(context.Background(), event.ListEventsInput{Limit: 0})
	require.NoError(t, err)
	assert.Empty(t, events.Events)
}
