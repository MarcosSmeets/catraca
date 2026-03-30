package entity_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewReservation_Valid(t *testing.T) {
	r, err := entity.NewReservation(uuid.New(), uuid.New())
	require.NoError(t, err)
	assert.Equal(t, entity.ReservationStatusActive, r.Status)
	assert.True(t, r.ExpiresAt.After(time.Now()))
}

func TestNewReservation_NilSeatID(t *testing.T) {
	_, err := entity.NewReservation(uuid.Nil, uuid.New())
	assert.EqualError(t, err, "reservation seat ID is required")
}

func TestReservation_Expire(t *testing.T) {
	r, _ := entity.NewReservation(uuid.New(), uuid.New())

	err := r.Expire()
	require.NoError(t, err)
	assert.Equal(t, entity.ReservationStatusExpired, r.Status)
}

func TestReservation_ExpireNonActive(t *testing.T) {
	r, _ := entity.NewReservation(uuid.New(), uuid.New())
	_ = r.Expire()

	err := r.Expire()
	assert.Error(t, err)
}

func TestReservation_Convert(t *testing.T) {
	r, _ := entity.NewReservation(uuid.New(), uuid.New())

	err := r.Convert()
	require.NoError(t, err)
	assert.Equal(t, entity.ReservationStatusConverted, r.Status)
}

func TestReservation_ConvertExpired(t *testing.T) {
	r, _ := entity.NewReservation(uuid.New(), uuid.New())
	r.ExpiresAt = time.Now().Add(-1 * time.Minute)

	err := r.Convert()
	assert.Error(t, err)
}
