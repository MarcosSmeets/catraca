package entity

type ReservationStatus string

const (
	ReservationStatusActive    ReservationStatus = "ACTIVE"
	ReservationStatusExpired   ReservationStatus = "EXPIRED"
	ReservationStatusConverted ReservationStatus = "CONVERTED"
)

var validReservationStatuses = map[ReservationStatus]bool{
	ReservationStatusActive:    true,
	ReservationStatusExpired:   true,
	ReservationStatusConverted: true,
}

func (s ReservationStatus) IsValid() bool {
	return validReservationStatuses[s]
}

func (s ReservationStatus) String() string {
	return string(s)
}
