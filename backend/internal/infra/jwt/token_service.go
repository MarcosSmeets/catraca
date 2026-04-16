package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

const (
	AccessTokenDuration  = 15 * time.Minute
	RefreshTokenDuration = 7 * 24 * time.Hour
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
)

type TokenServiceImpl struct {
	accessSecret  []byte
	refreshSecret []byte
}

func NewTokenService(accessSecret, refreshSecret string) *TokenServiceImpl {
	return &TokenServiceImpl{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
	}
}

type customClaims struct {
	jwt.RegisteredClaims
	Email            string `json:"email"`
	Role             string `json:"role"`
	OrganizationID   string `json:"organization_id,omitempty"`
}

func (s *TokenServiceImpl) GenerateTokenPair(claims service.TokenClaims) (*service.TokenPair, error) {
	now := time.Now()

	accessToken, err := s.generateToken(claims, s.accessSecret, now.Add(AccessTokenDuration))
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateToken(claims, s.refreshSecret, now.Add(RefreshTokenDuration))
	if err != nil {
		return nil, err
	}

	return &service.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *TokenServiceImpl) ValidateAccessToken(token string) (*service.TokenClaims, error) {
	return s.validateToken(token, s.accessSecret)
}

func (s *TokenServiceImpl) ValidateRefreshToken(token string) (*service.TokenClaims, error) {
	return s.validateToken(token, s.refreshSecret)
}

func (s *TokenServiceImpl) generateToken(claims service.TokenClaims, secret []byte, expiresAt time.Time) (string, error) {
	orgStr := ""
	if claims.OrganizationID != nil {
		orgStr = claims.OrganizationID.String()
	}
	c := customClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   claims.UserID.String(),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		Email:          claims.Email,
		Role:           claims.Role,
		OrganizationID: orgStr,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return token.SignedString(secret)
}

func (s *TokenServiceImpl) validateToken(tokenStr string, secret []byte) (*service.TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &customClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return secret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*customClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return nil, ErrInvalidToken
	}

	out := &service.TokenClaims{
		UserID: userID,
		Email:  claims.Email,
		Role:   claims.Role,
	}
	if claims.OrganizationID != "" {
		orgID, err := uuid.Parse(claims.OrganizationID)
		if err != nil {
			return nil, ErrInvalidToken
		}
		out.OrganizationID = &orgID
	}
	return out, nil
}
