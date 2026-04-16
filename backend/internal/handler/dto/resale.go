package dto

type CreateResaleListingRequest struct {
	PriceCents int64 `json:"priceCents"`
}

type ResaleListingResponse struct {
	ID           string `json:"id"`
	TicketID     string `json:"ticketId"`
	PriceCents   int64  `json:"priceCents"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	Section      string `json:"section,omitempty"`
	Row          string `json:"row,omitempty"`
	Number       string `json:"number,omitempty"`
}

type ResaleMarketplaceListingResponse struct {
	ID               string `json:"id"`
	TicketID         string `json:"ticketId"`
	PriceCents       int64  `json:"priceCents"`
	Status           string `json:"status"`
	CreatedAt        string `json:"createdAt"`
	OrganizationSlug string `json:"organizationSlug"`
	EventID          string `json:"eventId"`
	HomeTeam         string `json:"homeTeam"`
	AwayTeam         string `json:"awayTeam"`
	EventStartsAt    string `json:"eventStartsAt"`
	Section          string `json:"section,omitempty"`
	Row              string `json:"row,omitempty"`
	Number           string `json:"number,omitempty"`
}

type ResaleCheckoutRequest struct {
	BuyerName         string `json:"buyerName"`
	BuyerEmail        string `json:"buyerEmail"`
	BuyerCpf          string `json:"buyerCpf"`
	BuyerPhone        string `json:"buyerPhone"`
	BuyerCep          string `json:"buyerCep"`
	BuyerStreet       string `json:"buyerStreet"`
	BuyerNeighborhood string `json:"buyerNeighborhood"`
	BuyerCity         string `json:"buyerCity"`
	BuyerState        string `json:"buyerState"`
}

type CheckoutURLResponse struct {
	URL string `json:"url"`
}
