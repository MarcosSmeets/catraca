package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	DatabaseURL         string
	RedisURL            string
	JWTSecret           string
	JWTRefreshSecret    string
	StripeSecretKey     string
	StripeWebhookSecret string
	// StripeCheckoutSuccessURL must include {CHECKOUT_SESSION_ID} where Stripe substitutes the session id (see Stripe docs).
	StripeCheckoutSuccessURL string
	StripeCheckoutCancelURL  string
	AppEnv              string
	Port                int
	AppSeed             bool
	CORSAllowedOrigins  []string
	CPFPepper           string
	PhoneEncryptionKey  string
}

func Load() (*Config, error) {
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		var err error
		port, err = strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
	}

	cfg := &Config{
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://catraca:catraca@localhost:5432/catraca?sslmode=disable"),
		RedisURL:            getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:           getEnv("JWT_SECRET", "dev-secret-change-me"),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
		StripeSecretKey:     os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripeCheckoutSuccessURL: getEnv("STRIPE_CHECKOUT_SUCCESS_URL", "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}"),
		StripeCheckoutCancelURL:  getEnv("STRIPE_CHECKOUT_CANCEL_URL", "http://localhost:3000/checkout?canceled=1"),
		AppEnv:              getEnv("APP_ENV", "development"),
		Port:                port,
		AppSeed:             getEnvBool("APP_SEED", false),
		CORSAllowedOrigins:  getEnvSlice("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),
		CPFPepper:           getEnv("CPF_PEPPER", "dev-cpf-pepper-change-in-prod"),
		PhoneEncryptionKey:  getEnv("PHONE_ENCRYPTION_KEY", "catraca-phone-key-change-in-prod"),
	}

	return cfg, nil
}

func (c *Config) Addr() string {
	return fmt.Sprintf(":%d", c.Port)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

// getEnvSlice reads a comma-separated env var and returns it as a string slice.
// Falls back to a slice containing the single fallback value.
func getEnvSlice(key, fallback string) []string {
	v := os.Getenv(key)
	if v == "" {
		v = fallback
	}
	parts := strings.Split(v, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
