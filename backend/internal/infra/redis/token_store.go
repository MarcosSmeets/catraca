package redis

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
)

const passwordResetTTL = 30 * time.Minute

// TokenStore stores short-lived tokens (e.g. password reset) in Redis.
type TokenStore struct {
	client *goredis.Client
}

func NewTokenStore(client *goredis.Client) *TokenStore {
	return &TokenStore{client: client}
}

func passwordResetKey(token string) string {
	return fmt.Sprintf("password_reset:%s", token)
}

// SavePasswordResetToken stores userID for the given token with a 30 min TTL.
func (s *TokenStore) SavePasswordResetToken(ctx context.Context, token string, userID uuid.UUID) error {
	key := passwordResetKey(token)
	if err := s.client.Set(ctx, key, userID.String(), passwordResetTTL).Err(); err != nil {
		return fmt.Errorf("TokenStore.SavePasswordResetToken: %w", err)
	}
	return nil
}

// GetPasswordResetToken retrieves the userID associated with the reset token.
// Returns ErrNotFound if token is expired or does not exist.
func (s *TokenStore) GetPasswordResetToken(ctx context.Context, token string) (uuid.UUID, error) {
	key := passwordResetKey(token)
	val, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, goredis.Nil) {
			return uuid.Nil, ErrTokenNotFound
		}
		return uuid.Nil, fmt.Errorf("TokenStore.GetPasswordResetToken: %w", err)
	}
	id, err := uuid.Parse(val)
	if err != nil {
		return uuid.Nil, fmt.Errorf("TokenStore.GetPasswordResetToken: parse uuid: %w", err)
	}
	return id, nil
}

// DeletePasswordResetToken invalidates the token.
func (s *TokenStore) DeletePasswordResetToken(ctx context.Context, token string) error {
	key := passwordResetKey(token)
	if err := s.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("TokenStore.DeletePasswordResetToken: %w", err)
	}
	return nil
}

var ErrTokenNotFound = errors.New("token not found or expired")
