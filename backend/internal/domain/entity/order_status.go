package entity

import "errors"

type OrderStatus string

const (
	OrderStatusPending  OrderStatus = "PENDING"
	OrderStatusPaid     OrderStatus = "PAID"
	OrderStatusFailed   OrderStatus = "FAILED"
	OrderStatusRefunded OrderStatus = "REFUNDED"
)

var (
	ErrOrderNotPending = errors.New("order is not in pending state")
	ErrOrderNotPaid    = errors.New("order is not in paid state")
)

var validOrderStatuses = map[OrderStatus]bool{
	OrderStatusPending:  true,
	OrderStatusPaid:     true,
	OrderStatusFailed:   true,
	OrderStatusRefunded: true,
}

func (s OrderStatus) IsValid() bool {
	return validOrderStatuses[s]
}

func (s OrderStatus) String() string {
	return string(s)
}
