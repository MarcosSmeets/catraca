package postgres_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
	"github.com/marcos-smeets/catraca/backend/test/factory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEventRepository_CreateAndGetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	venueRepo := pginfra.NewVenueRepository(pool)
	eventRepo := pginfra.NewEventRepository(pool)

	venue := factory.NewTestVenue()
	require.NoError(t, venueRepo.Create(ctx, venue))

	event := factory.NewTestEvent(venue.ID)
	require.NoError(t, eventRepo.Create(ctx, event))

	got, err := eventRepo.GetByID(ctx, event.ID)
	require.NoError(t, err)

	assert.Equal(t, event.ID, got.ID)
	assert.Equal(t, event.Title, got.Title)
	assert.Equal(t, event.Sport, got.Sport)
	assert.Equal(t, event.League, got.League)
	assert.Equal(t, event.HomeTeam, got.HomeTeam)
	assert.Equal(t, event.AwayTeam, got.AwayTeam)
	assert.NotNil(t, got.Venue)
	assert.Equal(t, venue.ID, got.Venue.ID)
	assert.Equal(t, venue.Name, got.Venue.Name)
	assert.Equal(t, venue.City, got.Venue.City)
}

func TestEventRepository_GetByID_NotFound(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	eventRepo := pginfra.NewEventRepository(pool)

	_, err := eventRepo.GetByID(ctx, uuid.New())
	assert.ErrorIs(t, err, repository.ErrNotFound)
}

func TestEventRepository_List_NoFilter(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	venueRepo := pginfra.NewVenueRepository(pool)
	eventRepo := pginfra.NewEventRepository(pool)

	venue := factory.NewTestVenue()
	require.NoError(t, venueRepo.Create(ctx, venue))

	e1 := factory.NewTestEvent(venue.ID)
	e2 := factory.NewTestEvent(venue.ID)
	e2.Title = "Fluminense vs Vasco"
	require.NoError(t, eventRepo.Create(ctx, e1))
	require.NoError(t, eventRepo.Create(ctx, e2))

	events, err := eventRepo.List(ctx, repository.EventFilter{Limit: 20})
	require.NoError(t, err)
	assert.Len(t, events, 2)
}

func TestEventRepository_List_FilterBySport(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	venueRepo := pginfra.NewVenueRepository(pool)
	eventRepo := pginfra.NewEventRepository(pool)

	venue := factory.NewTestVenue()
	require.NoError(t, venueRepo.Create(ctx, venue))

	football := factory.NewTestEvent(venue.ID)
	basketball := factory.NewTestEvent(venue.ID)
	basketball.Sport = entity.SportBasketball
	basketball.Title = "Flamengo Basquete vs Minas"
	require.NoError(t, eventRepo.Create(ctx, football))
	require.NoError(t, eventRepo.Create(ctx, basketball))

	sport := entity.SportFootball
	events, err := eventRepo.List(ctx, repository.EventFilter{
		Sport: &sport,
		Limit: 20,
	})
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, entity.SportFootball, events[0].Sport)
}

func TestEventRepository_List_FilterByCity(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	venueRepo := pginfra.NewVenueRepository(pool)
	eventRepo := pginfra.NewEventRepository(pool)

	bh := factory.NewTestVenue()
	rio := factory.NewTestVenue()
	rio.ID = uuid.New()
	rio.Name = "Maracanã"
	rio.City = "Rio de Janeiro"
	rio.State = "RJ"
	require.NoError(t, venueRepo.Create(ctx, bh))
	require.NoError(t, venueRepo.Create(ctx, rio))

	eventBH := factory.NewTestEvent(bh.ID)
	eventRio := factory.NewTestEvent(rio.ID)
	eventRio.Title = "Flamengo vs Vasco"
	require.NoError(t, eventRepo.Create(ctx, eventBH))
	require.NoError(t, eventRepo.Create(ctx, eventRio))

	city := "Rio de Janeiro"
	events, err := eventRepo.List(ctx, repository.EventFilter{City: &city, Limit: 20})
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, eventRio.ID, events[0].ID)
}

func TestEventRepository_List_Pagination(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	venueRepo := pginfra.NewVenueRepository(pool)
	eventRepo := pginfra.NewEventRepository(pool)

	venue := factory.NewTestVenue()
	require.NoError(t, venueRepo.Create(ctx, venue))

	for i := 0; i < 5; i++ {
		e := factory.NewTestEvent(venue.ID)
		require.NoError(t, eventRepo.Create(ctx, e))
	}

	page1, err := eventRepo.List(ctx, repository.EventFilter{Limit: 3, Offset: 0})
	require.NoError(t, err)
	assert.Len(t, page1, 3)

	page2, err := eventRepo.List(ctx, repository.EventFilter{Limit: 3, Offset: 3})
	require.NoError(t, err)
	assert.Len(t, page2, 2)
}

func TestEventRepository_Update(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test")
	}
	pool := newTestDB(t)
	ctx := context.Background()

	venueRepo := pginfra.NewVenueRepository(pool)
	eventRepo := pginfra.NewEventRepository(pool)

	venue := factory.NewTestVenue()
	require.NoError(t, venueRepo.Create(ctx, venue))

	event := factory.NewTestEvent(venue.ID)
	require.NoError(t, eventRepo.Create(ctx, event))

	event.Title = "Updated Title"
	event.Status = entity.EventStatusSoldOut
	require.NoError(t, eventRepo.Update(ctx, event))

	got, err := eventRepo.GetByID(ctx, event.ID)
	require.NoError(t, err)
	assert.Equal(t, "Updated Title", got.Title)
	assert.Equal(t, entity.EventStatusSoldOut, got.Status)
}
