package entity_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testBuyer() entity.BuyerDetails {
	return entity.BuyerDetails{
		Name: "Test", Email: "t@test.com", CPF: "00000000000",
		Phone: "11999999999", CEP: "01310100", Street: "Rua A", Neighborhood: "Centro",
		City: "SP", State: "SP",
	}
}

func TestNewOrder_Valid(t *testing.T) {
	resIDs := []uuid.UUID{uuid.New()}
	o, err := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, resIDs, nil, 5700, "pi_test", testBuyer())
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusPending, o.Status)
	assert.Equal(t, int64(5700), o.TotalCents)
}

func TestNewOrder_EmptyReservations(t *testing.T) {
	_, err := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, nil, nil, 5700, "pi_test", testBuyer())
	assert.EqualError(t, err, "order must have at least one reservation")
}

func TestNewOrder_ZeroTotal(t *testing.T) {
	_, err := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, []uuid.UUID{uuid.New()}, nil, 0, "pi_test", testBuyer())
	assert.EqualError(t, err, "order total must be positive")
}

func TestNewOrder_Resale_Valid(t *testing.T) {
	lid := uuid.New()
	o, err := entity.NewOrder(uuid.New(), entity.OrderKindResale, nil, &lid, 10000, "", testBuyer())
	require.NoError(t, err)
	assert.Equal(t, entity.OrderKindResale, o.Kind)
	assert.Equal(t, lid, *o.ResaleListingID)
}

func TestNewOrder_Resale_MissingListing(t *testing.T) {
	_, err := entity.NewOrder(uuid.New(), entity.OrderKindResale, nil, nil, 10000, "", testBuyer())
	assert.EqualError(t, err, "resale order requires resale listing id")
}

func TestNewOrder_Resale_WithReservations(t *testing.T) {
	lid := uuid.New()
	_, err := entity.NewOrder(uuid.New(), entity.OrderKindResale, []uuid.UUID{uuid.New()}, &lid, 10000, "", testBuyer())
	assert.EqualError(t, err, "resale order must not have seat reservations")
}

func TestOrder_MarkPaid(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, []uuid.UUID{uuid.New()}, nil, 5700, "pi_test", testBuyer())

	err := o.MarkPaid()
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusPaid, o.Status)
}

func TestOrder_MarkPaidNotPending(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, []uuid.UUID{uuid.New()}, nil, 5700, "pi_test", testBuyer())
	_ = o.MarkPaid()

	err := o.MarkPaid()
	assert.ErrorIs(t, err, entity.ErrOrderNotPending)
}

func TestOrder_MarkFailed(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, []uuid.UUID{uuid.New()}, nil, 5700, "pi_test", testBuyer())

	err := o.MarkFailed()
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusFailed, o.Status)
}

func TestOrder_Refund(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, []uuid.UUID{uuid.New()}, nil, 5700, "pi_test", testBuyer())
	_ = o.MarkPaid()

	err := o.Refund()
	require.NoError(t, err)
	assert.Equal(t, entity.OrderStatusRefunded, o.Status)
}

func TestOrder_RefundNotPaid(t *testing.T) {
	o, _ := entity.NewOrder(uuid.New(), entity.OrderKindPrimary, []uuid.UUID{uuid.New()}, nil, 5700, "pi_test", testBuyer())

	err := o.Refund()
	assert.ErrorIs(t, err, entity.ErrOrderNotPaid)
}
