package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReservationRepository_GetActiveBySeatID_ExcludesPastExpiry(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	eventRepo := pginfra.NewEventRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)
	userRepo := pginfra.NewUserRepository(pool, "test-phone-encryption-key-32bytes!!")
	reservationRepo := pginfra.NewReservationRepository(pool)

	org := createTestOrg(t, ctx, pool)
	venue := createTestVenue(t, ctx, pool, org.ID)
	event := factory.NewTestEvent(venue.ID)
	require.NoError(t, eventRepo.Create(ctx, event))
	seat := factory.NewTestSeat(event.ID)
	require.NoError(t, seatRepo.CreateBatch(ctx, []*entity.Seat{seat}))
	user := factory.NewTestUser()
	require.NoError(t, userRepo.Create(ctx, user))

	past := time.Now().Add(-30 * time.Minute)
	res := &entity.Reservation{
		ID:        uuid.New(),
		SeatID:    seat.ID,
		UserID:    user.ID,
		ExpiresAt: past,
		Status:    entity.ReservationStatusActive,
		CreatedAt: past,
		UpdatedAt: past,
	}
	require.NoError(t, reservationRepo.Create(ctx, res))

	_, err := reservationRepo.GetActiveBySeatID(ctx, seat.ID)
	assert.ErrorIs(t, err, repository.ErrNotFound)

	got, err := reservationRepo.GetActiveStatusBySeatID(ctx, seat.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, res.ID, got.ID)
	assert.Equal(t, entity.ReservationStatusActive, got.Status)
	assert.True(t, got.ExpiresAt.Before(time.Now()))
}

func TestReservationRepository_ListExpiredActive(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	eventRepo := pginfra.NewEventRepository(pool)
	seatRepo := pginfra.NewSeatRepository(pool)
	userRepo := pginfra.NewUserRepository(pool, "test-phone-encryption-key-32bytes!!")
	reservationRepo := pginfra.NewReservationRepository(pool)

	org := createTestOrg(t, ctx, pool)
	venue := createTestVenue(t, ctx, pool, org.ID)
	event := factory.NewTestEvent(venue.ID)
	require.NoError(t, eventRepo.Create(ctx, event))
	seat := factory.NewTestSeat(event.ID)
	require.NoError(t, seatRepo.CreateBatch(ctx, []*entity.Seat{seat}))
	user := factory.NewTestUser()
	require.NoError(t, userRepo.Create(ctx, user))

	past := time.Now().Add(-30 * time.Minute)
	res := &entity.Reservation{
		ID:        uuid.New(),
		SeatID:    seat.ID,
		UserID:    user.ID,
		ExpiresAt: past,
		Status:    entity.ReservationStatusActive,
		CreatedAt: past,
		UpdatedAt: past,
	}
	require.NoError(t, reservationRepo.Create(ctx, res))

	rows, err := reservationRepo.ListExpiredActive(ctx)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, res.ID, rows[0].ReservationID)
	assert.Equal(t, seat.ID, rows[0].SeatID)
	assert.Equal(t, event.ID, rows[0].EventID)
}
