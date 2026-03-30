package user_test

import (
	"context"
	"testing"

	jwtinfra "github.com/marcos-smeets/catraca/backend/internal/infra/jwt"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/user"
	"github.com/marcos-smeets/catraca/backend/test/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testPepper = "test-pepper"
const validCPF = "52998224725"

func TestRegister_Success(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	uc := user.NewRegisterUseCase(repo, tokenSvc, testPepper)

	output, err := uc.Execute(context.Background(), user.RegisterInput{
		Name:     "Rafael Souza",
		Email:    "rafael@exemplo.com.br",
		Password: "senhaforte123",
		CPF:      validCPF,
		Phone:    "(11) 98765-4321",
	})

	require.NoError(t, err)
	assert.Equal(t, "Rafael Souza", output.User.Name)
	assert.Equal(t, "rafael@exemplo.com.br", output.User.Email)
	assert.NotEmpty(t, output.TokenPair.AccessToken)
	assert.NotEmpty(t, output.TokenPair.RefreshToken)
}

func TestRegister_DuplicateEmail(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	uc := user.NewRegisterUseCase(repo, tokenSvc, testPepper)

	input := user.RegisterInput{
		Name:     "Rafael Souza",
		Email:    "rafael@exemplo.com.br",
		Password: "senhaforte123",
		CPF:      validCPF,
		Phone:    "(11) 98765-4321",
	}

	_, err := uc.Execute(context.Background(), input)
	require.NoError(t, err)

	_, err = uc.Execute(context.Background(), input)
	assert.ErrorIs(t, err, user.ErrEmailAlreadyExists)
}

func TestRegister_InvalidEmail(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	uc := user.NewRegisterUseCase(repo, tokenSvc, testPepper)

	_, err := uc.Execute(context.Background(), user.RegisterInput{
		Name:     "Rafael",
		Email:    "invalid-email",
		Password: "senhaforte123",
		CPF:      validCPF,
	})

	assert.Error(t, err)
}

func TestRegister_InvalidCPF(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	uc := user.NewRegisterUseCase(repo, tokenSvc, testPepper)

	_, err := uc.Execute(context.Background(), user.RegisterInput{
		Name:     "Rafael",
		Email:    "rafael@exemplo.com.br",
		Password: "senhaforte123",
		CPF:      "00000000000",
	})

	assert.Error(t, err)
}
