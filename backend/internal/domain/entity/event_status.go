package entity

type EventStatus string

const (
	EventStatusDraft     EventStatus = "DRAFT"
	EventStatusOnSale    EventStatus = "ON_SALE"
	EventStatusSoldOut   EventStatus = "SOLD_OUT"
	EventStatusCancelled EventStatus = "CANCELLED"
)

var validEventStatuses = map[EventStatus]bool{
	EventStatusDraft:     true,
	EventStatusOnSale:    true,
	EventStatusSoldOut:   true,
	EventStatusCancelled: true,
}

func (s EventStatus) IsValid() bool {
	return validEventStatuses[s]
}

func (s EventStatus) String() string {
	return string(s)
}
