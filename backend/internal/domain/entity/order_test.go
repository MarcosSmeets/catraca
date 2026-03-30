package entity_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewOrder_Valid(t *testing.T) {
	resIDs := []uuid.UUID{uuid.New()}
	o, err := entity.NewOrder(uuid.New(), resIDs, 5700, "pi_test")
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusPending, o.Status)
	assert.Equal(t, int64(5700), o.TotalCents)
}

func TestNewOrder_EmptyReservations(t *testing.T) {
	_, err := entity.NewOrder(uuid.New(), nil, 5700, "pi_test")
	assert.EqualError(t, err, "order must have at least one reservation")
}

func TestNewOrder_ZeroTotal(t *testing.T) {
	_, err := entity.NewOrder(uuid.New(), []uuid.UUID{uuid.New()}, 0, "pi_test")
	assert.EqualError(t, err, "order total must be positive")
}

func TestOrder_MarkPaid(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), []uuid.UUID{uuid.New()}, 5700, "pi_test")

	err := o.MarkPaid()
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusPaid, o.Status)
}

func TestOrder_MarkPaidNotPending(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), []uuid.UUID{uuid.New()}, 5700, "pi_test")
	_ = o.MarkPaid()

	err := o.MarkPaid()
	assert.ErrorIs(t, err, entity.ErrOrderNotPending)
}

func TestOrder_MarkFailed(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), []uuid.UUID{uuid.New()}, 5700, "pi_test")

	err := o.MarkFailed()
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusFailed, o.Status)
}

func TestOrder_Refund(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), []uuid.UUID{uuid.New()}, 5700, "pi_test")
	_ = o.MarkPaid()

	err := o.Refund()
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusRefunded, o.Status)
}

func TestOrder_RefundNotPaid(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), []uuid.UUID{uuid.New()}, 5700, "pi_test")

	err := o.Refund()
	assert.ErrorIs(t, err, entity.ErrOrderNotPaid)
}
