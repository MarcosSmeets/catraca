package dto

type VenueResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	City     string `json:"city"`
	State    string `json:"state"`
	Capacity int    `json:"capacity"`
}

type EventResponse struct {
	ID                string         `json:"id"`
	Title             string         `json:"title"`
	Sport             string         `json:"sport"`
	League            string         `json:"league"`
	Venue             VenueResponse  `json:"venue"`
	StartsAt          string         `json:"startsAt"`
	Status            string         `json:"status"`
	ServiceFeePercent float64        `json:"serviceFeePercent"`
	HomeTeam          string         `json:"homeTeam"`
	AwayTeam          string         `json:"awayTeam"`
	ImageURL          string         `json:"imageUrl"`
	MinPriceCents     int64          `json:"minPriceCents"`
	MaxPriceCents     int64          `json:"maxPriceCents"`
	VibeChips         []string       `json:"vibeChips"`
}

type EventListResponse struct {
	Events []EventResponse `json:"events"`
	Total  int64           `json:"total"`
	Page   int             `json:"page"`
	Limit  int             `json:"limit"`
}

type VenueListResponse struct {
	Venues []VenueResponse `json:"venues"`
	Total  int64           `json:"total"`
	Page   int             `json:"page"`
	Limit  int             `json:"limit"`
}
