package entity

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Ticket struct {
	ID           uuid.UUID
	OrderID      uuid.UUID
	EventID      uuid.UUID
	SeatID       uuid.UUID
	HolderUserID uuid.UUID
	QRCode       string
	Status       TicketStatus
	UsedAt       *time.Time
	PurchasedAt  time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func NewTicket(orderID, eventID, seatID, holderUserID uuid.UUID) (*Ticket, error) {
	now := time.Now()
	t := &Ticket{
		ID:           uuid.New(),
		OrderID:      orderID,
		EventID:      eventID,
		SeatID:       seatID,
		HolderUserID: holderUserID,
		QRCode:       generateQRData(uuid.New()),
		Status:       TicketStatusValid,
		PurchasedAt:  now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := t.Validate(); err != nil {
		return nil, err
	}
	return t, nil
}

func (t *Ticket) Validate() error {
	if t.OrderID == uuid.Nil {
		return errors.New("ticket order ID is required")
	}
	if t.EventID == uuid.Nil {
		return errors.New("ticket event ID is required")
	}
	if t.SeatID == uuid.Nil {
		return errors.New("ticket seat ID is required")
	}
	if t.HolderUserID == uuid.Nil {
		return errors.New("ticket holder user ID is required")
	}
	return nil
}

func (t *Ticket) Use() error {
	if t.Status != TicketStatusValid {
		return errors.New("only valid tickets can be used")
	}
	now := time.Now()
	t.Status = TicketStatusUsed
	t.UsedAt = &now
	t.UpdatedAt = now
	return nil
}

func (t *Ticket) Cancel() error {
	if t.Status == TicketStatusUsed {
		return errors.New("cannot cancel a used ticket")
	}
	t.Status = TicketStatusCancelled
	t.UpdatedAt = time.Now()
	return nil
}

func generateQRData(id uuid.UUID) string {
	return "CATRACA-TK-" + id.String()[:8]
}
