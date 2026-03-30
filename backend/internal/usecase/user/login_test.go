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

func TestLogin_Success(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	registerUC := user.NewRegisterUseCase(repo, tokenSvc)
	loginUC := user.NewLoginUseCase(repo, tokenSvc)

	_, err := registerUC.Execute(context.Background(), user.RegisterInput{
		Name:     "Rafael Souza",
		Email:    "rafael@exemplo.com.br",
		Password: "senhaforte123",
		CPF:      "12345678901",
		Phone:    "(11) 98765-4321",
	})
	require.NoError(t, err)

	output, err := loginUC.Execute(context.Background(), user.LoginInput{
		Email:    "rafael@exemplo.com.br",
		Password: "senhaforte123",
	})

	require.NoError(t, err)
	assert.Equal(t, "Rafael Souza", output.User.Name)
	assert.NotEmpty(t, output.TokenPair.AccessToken)
}

func TestLogin_WrongPassword(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	registerUC := user.NewRegisterUseCase(repo, tokenSvc)
	loginUC := user.NewLoginUseCase(repo, tokenSvc)

	_, _ = registerUC.Execute(context.Background(), user.RegisterInput{
		Name:     "Rafael Souza",
		Email:    "rafael@exemplo.com.br",
		Password: "senhaforte123",
		CPF:      "12345678901",
	})

	_, err := loginUC.Execute(context.Background(), user.LoginInput{
		Email:    "rafael@exemplo.com.br",
		Password: "senhaerrada",
	})

	assert.ErrorIs(t, err, user.ErrInvalidCredentials)
}

func TestLogin_NonexistentUser(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	loginUC := user.NewLoginUseCase(repo, tokenSvc)

	_, err := loginUC.Execute(context.Background(), user.LoginInput{
		Email:    "naoexiste@exemplo.com.br",
		Password: "qualquer",
	})

	assert.ErrorIs(t, err, user.ErrInvalidCredentials)
}
