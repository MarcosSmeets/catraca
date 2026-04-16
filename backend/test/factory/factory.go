package factory

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
)

// NewTestOrganization returns a valid organization (not persisted).
func NewTestOrganization() *entity.Organization {
	slug := "tst-" + strings.ReplaceAll(uuid.New().String(), "-", "")
	o, err := entity.NewOrganization("Test Org", slug)
	if err != nil {
		panic(err)
	}
	return o
}

func NewTestVenue(organizationID uuid.UUID) *entity.Venue {
	return &entity.Venue{
		ID:             uuid.New(),
		OrganizationID: organizationID,
		Name:           "Arena MRV",
		City:           "Belo Horizonte",
		State:          "MG",
		Capacity:       46000,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

func NewTestEvent(venueID uuid.UUID) *entity.Event {
	return &entity.Event{
		ID:                uuid.New(),
		Title:             "Atletico MG vs Flamengo",
		Sport:             entity.SportFootball,
		League:            "Série A",
		VenueID:           venueID,
		StartsAt:          time.Now().Add(24 * time.Hour),
		Status:            entity.EventStatusOnSale,
		ServiceFeePercent: 8,
		HomeTeam:          "Atlético MG",
		AwayTeam:          "Flamengo",
		ImageURL:          "https://example.com/image.jpg",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
}

func NewTestSeat(eventID uuid.UUID) *entity.Seat {
	return &entity.Seat{
		ID:         uuid.New(),
		EventID:    eventID,
		Section:    "Norte",
		Row:        "A",
		Number:     "1",
		PriceCents: 4000,
		Status:     entity.SeatStatusAvailable,
		Col:        0,
		RowIndex:   0,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
}

func NewTestUser() *entity.User {
	return &entity.User{
		ID:           uuid.New(),
		Name:         "Rafael Souza",
		Email:        "rafael@exemplo.com.br",
		PasswordHash: "$2a$10$fakehashfakehashfakehashfakehashfakehashfakehash",
		CPFHash:      entity.HashCPF("52998224725", "test-pepper"),
		Phone:        "(11) 98765-4321",
		Role:         entity.UserRoleUser,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
}

func NewTestReservation(seatID, userID uuid.UUID) *entity.Reservation {
	now := time.Now()
	return &entity.Reservation{
		ID:        uuid.New(),
		SeatID:    seatID,
		UserID:    userID,
		ExpiresAt: now.Add(entity.ReservationTTL),
		Status:    entity.ReservationStatusActive,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func NewTestOrder(userID uuid.UUID, reservationIDs []uuid.UUID) *entity.Order {
	return &entity.Order{
		ID:              uuid.New(),
		UserID:          userID,
		ReservationIDs:  reservationIDs,
		TotalCents:      5700,
		StripePaymentID: "pi_test_001",
		Status:          entity.OrderStatusPending,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
}

func NewTestTicket(orderID, eventID, seatID uuid.UUID) *entity.Ticket {
	now := time.Now()
	return &entity.Ticket{
		ID:          uuid.New(),
		OrderID:     orderID,
		EventID:     eventID,
		SeatID:      seatID,
		QRCode:      "CATRACA-TK-test1234",
		Status:      entity.TicketStatusValid,
		PurchasedAt: now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}
