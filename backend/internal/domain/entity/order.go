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

	// Buyer details captured at checkout
	BuyerName         string
	BuyerEmail        string
	BuyerCPF          string
	BuyerPhone        string
	BuyerCEP          string
	BuyerStreet       string
	BuyerNeighborhood string
	BuyerCity         string
	BuyerState        string
}

// BuyerDetails groups buyer information for order creation.
type BuyerDetails struct {
	Name         string
	Email        string
	CPF          string
	Phone        string
	CEP          string
	Street       string
	Neighborhood string
	City         string
	State        string
}

func NewOrder(userID uuid.UUID, reservationIDs []uuid.UUID, totalCents int64, stripePaymentID string, buyer BuyerDetails) (*Order, error) {
	o := &Order{
		ID:                uuid.New(),
		UserID:            userID,
		ReservationIDs:    reservationIDs,
		TotalCents:        totalCents,
		StripePaymentID:   stripePaymentID,
		Status:            OrderStatusPending,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		BuyerName:         buyer.Name,
		BuyerEmail:        buyer.Email,
		BuyerCPF:          buyer.CPF,
		BuyerPhone:        buyer.Phone,
		BuyerCEP:          buyer.CEP,
		BuyerStreet:       buyer.Street,
		BuyerNeighborhood: buyer.Neighborhood,
		BuyerCity:         buyer.City,
		BuyerState:        buyer.State,
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
