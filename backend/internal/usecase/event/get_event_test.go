package event_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/event"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/marcos-smeets/catraca/backend/test/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetEvent_Found(t *testing.T) {
	repo := mock.NewEventRepository()
	uc := event.NewGetEventUseCase(repo)

	venue := factory.NewTestVenue()
	e := factory.NewTestEvent(venue.ID)
	repo.Create(context.Background(), e)

	found, err := uc.Execute(context.Background(), e.ID)
	require.NoError(t, err)
	assert.Equal(t, e.ID, found.ID)
	assert.Equal(t, e.Title, found.Title)
}

func TestGetEvent_NotFound(t *testing.T) {
	repo := mock.NewEventRepository()
	uc := event.NewGetEventUseCase(repo)

	_, err := uc.Execute(context.Background(), uuid.New())
	assert.ErrorIs(t, err, repository.ErrNotFound)
}
