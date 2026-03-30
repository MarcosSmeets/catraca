package entity

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Order struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	ReservationIDs  []uuid.UUID
	TotalCents      int64
	StripePaymentID string
	Status          OrderStatus
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func NewOrder(userID uuid.UUID, reservationIDs []uuid.UUID, totalCents int64, stripePaymentID string) (*Order, error) {
	o := &Order{
		ID:              uuid.New(),
		UserID:          userID,
		ReservationIDs:  reservationIDs,
		TotalCents:      totalCents,
		StripePaymentID: stripePaymentID,
		Status:          OrderStatusPending,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := o.Validate(); err != nil {
		return nil, err
	}
	return o, nil
}

func (o *Order) Validate() error {
	if o.UserID == uuid.Nil {
		return errors.New("order user ID is required")
	}
	if len(o.ReservationIDs) == 0 {
		return errors.New("order must have at least one reservation")
	}
	if o.TotalCents <= 0 {
		return errors.New("order total must be positive")
	}
	return nil
}

func (o *Order) MarkPaid() error {
	if o.Status != OrderStatusPending {
		return ErrOrderNotPending
	}
	o.Status = OrderStatusPaid
	o.UpdatedAt = time.Now()
	return nil
}

func (o *Order) MarkFailed() error {
	if o.Status != OrderStatusPending {
		return ErrOrderNotPending
	}
	o.Status = OrderStatusFailed
	o.UpdatedAt = time.Now()
	return nil
}

func (o *Order) Refund() error {
	if o.Status != OrderStatusPaid {
		return ErrOrderNotPaid
	}
	o.Status = OrderStatusRefunded
	o.UpdatedAt = time.Now()
	return nil
}
