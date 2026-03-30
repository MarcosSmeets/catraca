package dto

type SeatResponse struct {
	ID         string `json:"id"`
	EventID    string `json:"eventId"`
	Section    string `json:"section"`
	Row        string `json:"row"`
	Number     string `json:"number"`
	PriceCents int64  `json:"priceCents"`
	Status     string `json:"status"`
	Col        int    `json:"col"`
	RowIndex   int    `json:"rowIndex"`
}
