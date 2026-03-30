package entity

import "errors"

type SeatStatus string

const (
	SeatStatusAvailable SeatStatus = "AVAILABLE"
	SeatStatusReserved  SeatStatus = "RESERVED"
	SeatStatusSold      SeatStatus = "SOLD"
	SeatStatusBlocked   SeatStatus = "BLOCKED"
)

var (
	ErrSeatNotAvailable    = errors.New("seat is not available")
	ErrSeatNotReserved     = errors.New("seat is not reserved")
	ErrInvalidSeatTransition = errors.New("invalid seat status transition")
)

var validSeatStatuses = map[SeatStatus]bool{
	SeatStatusAvailable: true,
	SeatStatusReserved:  true,
	SeatStatusSold:      true,
	SeatStatusBlocked:   true,
}

func (s SeatStatus) IsValid() bool {
	return validSeatStatuses[s]
}

func (s SeatStatus) String() string {
	return string(s)
}
