package entity_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTicket_Valid(t *testing.T) {
	tk, err := entity.NewTicket(uuid.New(), uuid.New(), uuid.New(), uuid.New())
	require.NoError(t, err)
	assert.Equal(t, entity.TicketStatusValid, tk.Status)
	assert.Contains(t, tk.QRCode, "CATRACA-TK-")
}

func TestNewTicket_NilOrderID(t *testing.T) {
	_, err := entity.NewTicket(uuid.Nil, uuid.New(), uuid.New(), uuid.New())
	assert.EqualError(t, err, "ticket order ID is required")
}

func TestTicket_Use(t *testing.T) {
	tk, _ := entity.NewTicket(uuid.New(), uuid.New(), uuid.New(), uuid.New())

	err := tk.Use()
	require.NoError(t, err)
	assert.Equal(t, entity.TicketStatusUsed, tk.Status)
}

func TestTicket_UseAlreadyUsed(t *testing.T) {
	tk, _ := entity.NewTicket(uuid.New(), uuid.New(), uuid.New(), uuid.New())
	_ = tk.Use()

	err := tk.Use()
	assert.Error(t, err)
}

func TestTicket_Cancel(t *testing.T) {
	tk, _ := entity.NewTicket(uuid.New(), uuid.New(), uuid.New(), uuid.New())

	err := tk.Cancel()
	require.NoError(t, err)
	assert.Equal(t, entity.TicketStatusCancelled, tk.Status)
}

func TestTicket_CancelUsed(t *testing.T) {
	tk, _ := entity.NewTicket(uuid.New(), uuid.New(), uuid.New(), uuid.New())
	_ = tk.Use()

	err := tk.Cancel()
	assert.Error(t, err)
}
