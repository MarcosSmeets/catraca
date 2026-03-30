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

func TestRefresh_Success(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	registerUC := user.NewRegisterUseCase(repo, tokenSvc, testPepper)
	refreshUC := user.NewRefreshUseCase(repo, tokenSvc)

	regOutput, err := registerUC.Execute(context.Background(), user.RegisterInput{
		Name:     "Rafael Souza",
		Email:    "rafael@exemplo.com.br",
		Password: "senhaforte123",
		CPF:      validCPF,
	})
	require.NoError(t, err)

	output, err := refreshUC.Execute(context.Background(), regOutput.TokenPair.RefreshToken)
	require.NoError(t, err)
	assert.NotEmpty(t, output.TokenPair.AccessToken)
	assert.NotEmpty(t, output.TokenPair.RefreshToken)
}

func TestRefresh_InvalidToken(t *testing.T) {
	repo := mock.NewUserRepository()
	tokenSvc := jwtinfra.NewTokenService("access-secret", "refresh-secret")
	refreshUC := user.NewRefreshUseCase(repo, tokenSvc)

	_, err := refreshUC.Execute(context.Background(), "invalid-token")
	assert.ErrorIs(t, err, user.ErrInvalidCredentials)
}
