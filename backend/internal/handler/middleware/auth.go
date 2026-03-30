package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/marcos-smeets/catraca/backend/internal/domain/service"
)

type contextKey string

const UserClaimsKey contextKey = "user_claims"

func Auth(tokenService service.TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"unauthorized","message":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				http.Error(w, `{"error":"unauthorized","message":"invalid authorization format"}`, http.StatusUnauthorized)
				return
			}

			claims, err := tokenService.ValidateAccessToken(parts[1])
			if err != nil {
				http.Error(w, `{"error":"unauthorized","message":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserClaims(ctx context.Context) *service.TokenClaims {
	claims, ok := ctx.Value(UserClaimsKey).(*service.TokenClaims)
	if !ok {
		return nil
	}
	return claims
}
