package entity_test

import (
	"testing"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewUser_Valid(t *testing.T) {
	u, err := entity.NewUser("Rafael Souza", "rafael@exemplo.com.br", "$2a$10$hash", "12345678901", "(11) 98765-4321")
	require.NoError(t, err)
	assert.Equal(t, "Rafael Souza", u.Name)
	assert.Equal(t, entity.UserRoleUser, u.Role)
	assert.NotEmpty(t, u.CPFHash)
	assert.NotEqual(t, "12345678901", u.CPFHash)
}

func TestNewUser_EmptyName(t *testing.T) {
	_, err := entity.NewUser("", "rafael@exemplo.com.br", "$2a$10$hash", "12345678901", "")
	assert.EqualError(t, err, "user name is required")
}

func TestNewUser_InvalidEmail(t *testing.T) {
	_, err := entity.NewUser("Rafael", "invalid-email", "$2a$10$hash", "12345678901", "")
	assert.EqualError(t, err, "invalid email format")
}

func TestNewUser_EmptyPassword(t *testing.T) {
	_, err := entity.NewUser("Rafael", "rafael@exemplo.com.br", "", "12345678901", "")
	assert.EqualError(t, err, "user password hash is required")
}

func TestHashCPF_Deterministic(t *testing.T) {
	h1 := entity.HashCPF("12345678901")
	h2 := entity.HashCPF("12345678901")
	assert.Equal(t, h1, h2)
}

func TestHashCPF_Different(t *testing.T) {
	h1 := entity.HashCPF("12345678901")
	h2 := entity.HashCPF("98765432100")
	assert.NotEqual(t, h1, h2)
}
