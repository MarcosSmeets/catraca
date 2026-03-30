package entity_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewEvent_Valid(t *testing.T) {
	venueID := uuid.New()
	startsAt := time.Now().Add(24 * time.Hour)
	e, err := entity.NewEvent("Atletico vs Flamengo", entity.SportFootball, "Série A", venueID, startsAt, 10, "Atlético MG", "Flamengo", "https://example.com/img.jpg")
	require.NoError(t, err)
	assert.Equal(t, "Atletico vs Flamengo", e.Title)
	assert.Equal(t, entity.EventStatusDraft, e.Status)
	assert.Equal(t, entity.SportFootball, e.Sport)
}

func TestNewEvent_EmptyTitle(t *testing.T) {
	_, err := entity.NewEvent("", entity.SportFootball, "Série A", uuid.New(), time.Now(), 10, "A", "B", "")
	assert.EqualError(t, err, "event title is required")
}

func TestNewEvent_InvalidSport(t *testing.T) {
	_, err := entity.NewEvent("Test", entity.SportType("INVALID"), "Série A", uuid.New(), time.Now(), 10, "A", "B", "")
	assert.EqualError(t, err, "invalid sport type")
}

func TestNewEvent_InvalidServiceFee(t *testing.T) {
	_, err := entity.NewEvent("Test", entity.SportFootball, "Série A", uuid.New(), time.Now(), 150, "A", "B", "")
	assert.EqualError(t, err, "service fee percent must be between 0 and 100")
}

func TestEvent_Publish(t *testing.T) {
	venueID := uuid.New()
	e, _ := entity.NewEvent("Test", entity.SportFootball, "Série A", venueID, time.Now().Add(time.Hour), 10, "A", "B", "")
	require.Equal(t, entity.EventStatusDraft, e.Status)

	err := e.Publish()
	require.NoError(t, err)
	assert.Equal(t, entity.EventStatusOnSale, e.Status)
}

func TestEvent_PublishNotDraft(t *testing.T) {
	venueID := uuid.New()
	e, _ := entity.NewEvent("Test", entity.SportFootball, "Série A", venueID, time.Now().Add(time.Hour), 10, "A", "B", "")
	_ = e.Publish()

	err := e.Publish()
	assert.Error(t, err)
}

func TestEvent_MarkSoldOut(t *testing.T) {
	venueID := uuid.New()
	e, _ := entity.NewEvent("Test", entity.SportFootball, "Série A", venueID, time.Now().Add(time.Hour), 10, "A", "B", "")
	_ = e.Publish()

	err := e.MarkSoldOut()
	require.NoError(t, err)
	assert.Equal(t, entity.EventStatusSoldOut, e.Status)
}

func TestEvent_Cancel(t *testing.T) {
	venueID := uuid.New()
	e, _ := entity.NewEvent("Test", entity.SportFootball, "Série A", venueID, time.Now().Add(time.Hour), 10, "A", "B", "")

	err := e.Cancel()
	require.NoError(t, err)
	assert.Equal(t, entity.EventStatusCancelled, e.Status)
}
