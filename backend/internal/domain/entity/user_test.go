package entity_test

import (
	"testing"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testPepper = "test-pepper"

// 529.982.247-25 is a well-known valid test CPF.
const validCPF = "52998224725"

func TestNewUser_Valid(t *testing.T) {
	u, err := entity.NewUser("Rafael Souza", "rafael@exemplo.com.br", "$2a$10$hash", validCPF, "(11) 98765-4321", testPepper)
	require.NoError(t, err)
	assert.Equal(t, "Rafael Souza", u.Name)
	assert.Equal(t, entity.UserRoleUser, u.Role)
	assert.NotEmpty(t, u.CPFHash)
	assert.NotEqual(t, validCPF, u.CPFHash)
}

func TestNewUser_EmptyName(t *testing.T) {
	_, err := entity.NewUser("", "rafael@exemplo.com.br", "$2a$10$hash", validCPF, "", testPepper)
	assert.EqualError(t, err, "user name is required")
}

func TestNewUser_InvalidEmail(t *testing.T) {
	_, err := entity.NewUser("Rafael", "invalid-email", "$2a$10$hash", validCPF, "", testPepper)
	assert.EqualError(t, err, "invalid email format")
}

func TestNewUser_EmptyPassword(t *testing.T) {
	_, err := entity.NewUser("Rafael", "rafael@exemplo.com.br", "", validCPF, "", testPepper)
	assert.EqualError(t, err, "user password hash is required")
}

func TestNewUser_InvalidCPF(t *testing.T) {
	_, err := entity.NewUser("Rafael", "rafael@exemplo.com.br", "$2a$10$hash", "12345678901", "", testPepper)
	assert.ErrorIs(t, err, entity.ErrInvalidCPF)
}

func TestHashCPF_Deterministic(t *testing.T) {
	h1 := entity.HashCPF(validCPF, testPepper)
	h2 := entity.HashCPF(validCPF, testPepper)
	assert.Equal(t, h1, h2)
}

func TestHashCPF_Different(t *testing.T) {
	h1 := entity.HashCPF(validCPF, testPepper)
	h2 := entity.HashCPF("07584190849", testPepper)
	assert.NotEqual(t, h1, h2)
}

func TestHashCPF_PepperChangesHash(t *testing.T) {
	h1 := entity.HashCPF(validCPF, "pepper-a")
	h2 := entity.HashCPF(validCPF, "pepper-b")
	assert.NotEqual(t, h1, h2)
}
