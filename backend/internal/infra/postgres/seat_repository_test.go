package postgres_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSeatRepository_CreateBatchAndListByEventID(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	eventRepo := pginfra.NewEventRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)

	org := createTestOrg(t, ctx, pool)
	venue := createTestVenue(t, ctx, pool, org.ID)
	event := factory.NewTestEvent(venue.ID)
	require.NoError(t, eventRepo.Create(ctx, event))

	seats := []*entity.Seat{
		factory.NewTestSeat(event.ID),
		factory.NewTestSeat(event.ID),
		factory.NewTestSeat(event.ID),
	}
	seats[1].Row = "B"
	seats[1].Number = "2"
	seats[2].Row = "C"
	seats[2].Number = "3"

	require.NoError(t, seatRepo.CreateBatch(ctx, seats))

	got, err := seatRepo.ListByEventID(ctx, event.ID)
	require.NoError(t, err)
	assert.Len(t, got, 3)
}

func TestSeatRepository_GetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	eventRepo := pginfra.NewEventRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)

	org := createTestOrg(t, ctx, pool)
	venue := createTestVenue(t, ctx, pool, org.ID)
	event := factory.NewTestEvent(venue.ID)
	require.NoError(t, eventRepo.Create(ctx, event))

	seat := factory.NewTestSeat(event.ID)
	require.NoError(t, seatRepo.CreateBatch(ctx, []*entity.Seat{seat}))

	got, err := seatRepo.GetByID(ctx, seat.ID)
	require.NoError(t, err)
	assert.Equal(t, seat.ID, got.ID)
	assert.Equal(t, seat.Section, got.Section)
	assert.Equal(t, seat.PriceCents, got.PriceCents)
	assert.Equal(t, entity.SeatStatusAvailable, got.Status)
}

func TestSeatRepository_GetByID_NotFound(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	seatRepo := pginfra.NewSeatRepository(pool)

	_, err := seatRepo.GetByID(ctx, uuid.New())
	assert.ErrorIs(t, err, repository.ErrNotFound)
}

func TestSeatRepository_UpdateStatus(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	eventRepo := pginfra.NewEventRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)

	org := createTestOrg(t, ctx, pool)
	venue := createTestVenue(t, ctx, pool, org.ID)
	event := factory.NewTestEvent(venue.ID)
	require.NoError(t, eventRepo.Create(ctx, event))

	seat := factory.NewTestSeat(event.ID)
	require.NoError(t, seatRepo.CreateBatch(ctx, []*entity.Seat{seat}))

	require.NoError(t, seatRepo.UpdateStatus(ctx, seat.ID, entity.SeatStatusReserved))

	got, err := seatRepo.GetByID(ctx, seat.ID)
	require.NoError(t, err)
	assert.Equal(t, entity.SeatStatusReserved, got.Status)
}

func TestSeatRepository_ListByEventID_Empty(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	seatRepo := pginfra.NewSeatRepository(pool)

	seats, err := seatRepo.ListByEventID(ctx, uuid.New())
	require.NoError(t, err)
	assert.Empty(t, seats)
}
