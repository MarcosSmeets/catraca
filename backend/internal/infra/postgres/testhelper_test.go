package postgres_test

import (
	"context"
	"fmt"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

// newTestDB starts a PostgreSQL container, runs all migrations, and returns a connected pool.
// The container is automatically terminated when the test completes.
func newTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	container, err := tcpostgres.Run(ctx,
		"postgres:16-alpine",
		tcpostgres.WithDatabase("catraca_test"),
		tcpostgres.WithUsername("catraca"),
		tcpostgres.WithPassword("catraca"),
		tcpostgres.BasicWaitStrategies(),
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		_ = container.Terminate(ctx)
	})

	connStr, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := pgxpool.New(ctx, connStr)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, pool.Ping(ctx))

	runMigrations(t, connStr)

	return pool
}

// migrationsDir returns the absolute path to the migrations directory.
func migrationsDir() string {
	_, filename, _, _ := runtime.Caller(0)
	// filename is .../internal/infra/postgres/testhelper_test.go
	// migrations are at .../migrations/
	root := filepath.Join(filepath.Dir(filename), "..", "..", "..", "..", "migrations")
	return fmt.Sprintf("file://%s", filepath.Clean(root))
}

func runMigrations(t *testing.T, connStr string) {
	t.Helper()

	// golang-migrate pgx/v5 driver expects "pgx5://" scheme
	dbURL := "pgx5://" + connStr[len("postgres://"):]

	m, err := migrate.New(migrationsDir(), dbURL)
	require.NoError(t, err)
	t.Cleanup(func() { m.Close() })

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		require.NoError(t, err)
	}
}
