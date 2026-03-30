package entity

type TicketStatus string

const (
	TicketStatusValid     TicketStatus = "VALID"
	TicketStatusUsed      TicketStatus = "USED"
	TicketStatusCancelled TicketStatus = "CANCELLED"
)

var validTicketStatuses = map[TicketStatus]bool{
	TicketStatusValid:     true,
	TicketStatusUsed:      true,
	TicketStatusCancelled: true,
}

func (s TicketStatus) IsValid() bool {
	return validTicketStatuses[s]
}

func (s TicketStatus) String() string {
	return string(s)
}
