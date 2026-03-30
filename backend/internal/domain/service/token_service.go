package service

import (
	"github.com/google/uuid"
)

type TokenClaims struct {
	UserID uuid.UUID
	Email  string
	Role   string
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type TokenService interface {
	GenerateTokenPair(claims TokenClaims) (*TokenPair, error)
	ValidateAccessToken(token string) (*TokenClaims, error)
	ValidateRefreshToken(token string) (*TokenClaims, error)
}
