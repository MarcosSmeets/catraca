package entity_test

import (
	"testing"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewVenue_Valid(t *testing.T) {
	v, err := entity.NewVenue("Arena MRV", "Belo Horizonte", "MG", 46000)
	require.NoError(t, err)
	assert.Equal(t, "Arena MRV", v.Name)
	assert.Equal(t, "Belo Horizonte", v.City)
	assert.Equal(t, "MG", v.State)
	assert.Equal(t, 46000, v.Capacity)
	assert.NotEmpty(t, v.ID)
}

func TestNewVenue_EmptyName(t *testing.T) {
	_, err := entity.NewVenue("", "Belo Horizonte", "MG", 46000)
	assert.EqualError(t, err, "venue name is required")
}

func TestNewVenue_EmptyCity(t *testing.T) {
	_, err := entity.NewVenue("Arena MRV", "", "MG", 46000)
	assert.EqualError(t, err, "venue city is required")
}

func TestNewVenue_InvalidState(t *testing.T) {
	_, err := entity.NewVenue("Arena MRV", "Belo Horizonte", "MGS", 46000)
	assert.EqualError(t, err, "venue state must be 2 characters (UF)")
}

func TestNewVenue_ZeroCapacity(t *testing.T) {
	_, err := entity.NewVenue("Arena MRV", "Belo Horizonte", "MG", 0)
	assert.EqualError(t, err, "venue capacity must be positive")
}
