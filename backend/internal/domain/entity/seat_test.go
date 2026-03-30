package entity_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSeat_Valid(t *testing.T) {
	eventID := uuid.New()
	s, err := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)
	require.NoError(t, err)
	assert.Equal(t, entity.SeatStatusAvailable, s.Status)
	assert.Equal(t, int64(4000), s.PriceCents)
}

func TestNewSeat_ZeroPrice(t *testing.T) {
	_, err := entity.NewSeat(uuid.New(), "Norte", "A", "1", 0, 0, 0)
	assert.EqualError(t, err, "seat price must be positive")
}

func TestSeat_Reserve(t *testing.T) {
	eventID := uuid.New()
	s, _ := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)

	err := s.Reserve()
	require.NoError(t, err)
	assert.Equal(t, entity.SeatStatusReserved, s.Status)
}

func TestSeat_ReserveNotAvailable(t *testing.T) {
	eventID := uuid.New()
	s, _ := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)
	_ = s.Reserve()

	err := s.Reserve()
	assert.ErrorIs(t, err, entity.ErrSeatNotAvailable)
}

func TestSeat_Sell(t *testing.T) {
	eventID := uuid.New()
	s, _ := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)
	_ = s.Reserve()

	err := s.Sell()
	require.NoError(t, err)
	assert.Equal(t, entity.SeatStatusSold, s.Status)
}

func TestSeat_SellNotReserved(t *testing.T) {
	eventID := uuid.New()
	s, _ := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)

	err := s.Sell()
	assert.ErrorIs(t, err, entity.ErrSeatNotReserved)
}

func TestSeat_Release(t *testing.T) {
	eventID := uuid.New()
	s, _ := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)
	_ = s.Reserve()

	err := s.Release()
	require.NoError(t, err)
	assert.Equal(t, entity.SeatStatusAvailable, s.Status)
}

func TestSeat_Block(t *testing.T) {
	eventID := uuid.New()
	s, _ := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)

	err := s.Block()
	require.NoError(t, err)
	assert.Equal(t, entity.SeatStatusBlocked, s.Status)
}

func TestSeat_BlockSold(t *testing.T) {
	eventID := uuid.New()
	s, _ := entity.NewSeat(eventID, "Norte", "A", "1", 4000, 0, 0)
	_ = s.Reserve()
	_ = s.Sell()

	err := s.Block()
	assert.Error(t, err)
}
