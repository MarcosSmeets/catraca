package jwt_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	jwtinfra "github.com/marcos-smeets/catraca/backend/internal/infra/jwt"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestService() *jwtinfra.TokenServiceImpl {
	return jwtinfra.NewTokenService("test-access-secret", "test-refresh-secret")
}

func TestGenerateTokenPair(t *testing.T) {
	svc := newTestService()
	claims := service.TokenClaims{
		UserID: uuid.New(),
		Email:  "test@example.com",
		Role:   "user",
	}

	pair, err := svc.GenerateTokenPair(claims)
	require.NoError(t, err)
	assert.NotEmpty(t, pair.AccessToken)
	assert.NotEmpty(t, pair.RefreshToken)
	assert.NotEqual(t, pair.AccessToken, pair.RefreshToken)
}

func TestValidateAccessToken(t *testing.T) {
	svc := newTestService()
	userID := uuid.New()
	claims := service.TokenClaims{
		UserID: userID,
		Email:  "test@example.com",
		Role:   "user",
	}

	pair, err := svc.GenerateTokenPair(claims)
	require.NoError(t, err)

	parsed, err := svc.ValidateAccessToken(pair.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, userID, parsed.UserID)
	assert.Equal(t, "test@example.com", parsed.Email)
	assert.Equal(t, "user", parsed.Role)
}

func TestValidateRefreshToken(t *testing.T) {
	svc := newTestService()
	userID := uuid.New()
	claims := service.TokenClaims{
		UserID: userID,
		Email:  "test@example.com",
		Role:   "admin",
	}

	pair, err := svc.GenerateTokenPair(claims)
	require.NoError(t, err)

	parsed, err := svc.ValidateRefreshToken(pair.RefreshToken)
	require.NoError(t, err)
	assert.Equal(t, userID, parsed.UserID)
	assert.Equal(t, "admin", parsed.Role)
}

func TestValidateAccessToken_InvalidToken(t *testing.T) {
	svc := newTestService()
	_, err := svc.ValidateAccessToken("invalid-token")
	assert.ErrorIs(t, err, jwtinfra.ErrInvalidToken)
}

func TestValidateAccessToken_WrongSecret(t *testing.T) {
	svc1 := jwtinfra.NewTokenService("secret-1", "refresh-1")
	svc2 := jwtinfra.NewTokenService("secret-2", "refresh-2")

	pair, _ := svc1.GenerateTokenPair(service.TokenClaims{
		UserID: uuid.New(),
		Email:  "test@example.com",
		Role:   "user",
	})

	_, err := svc2.ValidateAccessToken(pair.AccessToken)
	assert.ErrorIs(t, err, jwtinfra.ErrInvalidToken)
}

func TestValidateRefreshToken_WithAccessToken(t *testing.T) {
	svc := newTestService()
	pair, _ := svc.GenerateTokenPair(service.TokenClaims{
		UserID: uuid.New(),
		Email:  "test@example.com",
		Role:   "user",
	})

	// Access token should not be valid as refresh token (different secrets)
	_, err := svc.ValidateRefreshToken(pair.AccessToken)
	assert.Error(t, err)
}

func TestTokenExpiry(t *testing.T) {
	// Just verify the constants are set correctly
	assert.Equal(t, 15*time.Minute, jwtinfra.AccessTokenDuration)
	assert.Equal(t, 7*24*time.Hour, jwtinfra.RefreshTokenDuration)
}
