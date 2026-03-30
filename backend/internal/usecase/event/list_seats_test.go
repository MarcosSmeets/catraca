package event_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/event"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/marcos-smeets/catraca/backend/test/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListSeats_ByEventID(t *testing.T) {
	repo := mock.NewSeatRepository()
	uc := event.NewListSeatsUseCase(repo)

	eventID := uuid.New()
	otherEventID := uuid.New()

	s1 := factory.NewTestSeat(eventID)
	s2 := factory.NewTestSeat(eventID)
	s2.Section = "Sul"
	s3 := factory.NewTestSeat(otherEventID)

	repo.CreateBatch(context.Background(), []*entity.Seat{s1, s2, s3})

	seats, err := uc.Execute(context.Background(), eventID)
	require.NoError(t, err)
	assert.Len(t, seats, 2)
}

func TestListSeats_EmptyEvent(t *testing.T) {
	repo := mock.NewSeatRepository()
	uc := event.NewListSeatsUseCase(repo)

	seats, err := uc.Execute(context.Background(), uuid.New())
	require.NoError(t, err)
	assert.Empty(t, seats)
}
