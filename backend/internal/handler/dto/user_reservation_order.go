package dto

type ReservationResponse struct {
	ID        string `json:"id"`
	SeatID    string `json:"seatId"`
	UserID    string `json:"userId"`
	ExpiresAt string `json:"expiresAt"`
	Status    string `json:"status"`
}

type CreateReservationRequest struct {
	EventID string   `json:"eventId"`
	SeatIDs []string `json:"seatIds"`
}

type CreateReservationResponse struct {
	Reservations []ReservationResponse `json:"reservations"`
	ExpiresAt    string                `json:"expiresAt"`
}

type OrderResponse struct {
	ID             string   `json:"id"`
	TotalCents     int64    `json:"totalCents"`
	Status         string   `json:"status"`
	CreatedAt      string   `json:"createdAt"`
	ReservationIDs []string `json:"reservationIds"`
}

type CreateOrderRequest struct {
	ReservationIDs []string `json:"reservationIds"`
}

// CreateOrderResponse is returned after creating a pending order. Payment happens via Stripe Checkout (redirect).
type CreateOrderResponse struct {
	OrderID       string `json:"orderId"`
	TotalCents    int64  `json:"totalCents"`
	StripeEnabled bool   `json:"stripeEnabled"` // false: use dev /dev/orders/:id/pay when STRIPE_SECRET_KEY is unset
}

// CreateCheckoutSessionRequest is the JSON body for POST .../checkout-session (may be {}).
// Payment methods (card and PIX when valid for BRL) are enabled on Stripe Checkout — no field needed here.
type CreateCheckoutSessionRequest struct{}

type CreateCheckoutSessionResponse struct {
	URL string `json:"url"`
}

// CreatePaymentIntentRequest is the JSON body for POST .../payment-intent (may be {}).
type CreatePaymentIntentRequest struct{}

type CreatePaymentIntentResponse struct {
	ClientSecret string `json:"clientSecret"`
	AmountCents  int64  `json:"amountCents"`
}

type TicketEventInfo struct {
	ID        string `json:"id"`
	HomeTeam  string `json:"homeTeam"`
	AwayTeam  string `json:"awayTeam"`
	League    string `json:"league"`
	Sport     string `json:"sport"`
	StartsAt  string `json:"startsAt"`
	ImageURL  string `json:"imageUrl"`
	VenueName string `json:"venueName"`
	VenueCity string `json:"venueCity"`
}

type TicketSeatInfo struct {
	ID         string `json:"id"`
	Section    string `json:"section"`
	Row        string `json:"row"`
	Number     string `json:"number"`
	PriceCents int64  `json:"priceCents"`
}

type TicketResponse struct {
	ID          string         `json:"id"`
	OrderID     string         `json:"orderId"`
	EventID     string         `json:"eventId"`
	SeatID      string         `json:"seatId"`
	QRCode      string         `json:"qrCode"`
	Status      string         `json:"status"`
	PurchasedAt string         `json:"purchasedAt"`
	Event       *TicketEventInfo `json:"event,omitempty"`
	Seat        *TicketSeatInfo  `json:"seat,omitempty"`
}

type UpdateProfileRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
}

type ProfileResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Role      string `json:"role"`
	CreatedAt string `json:"createdAt"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type ScanTicketRequest struct {
	QRCode string `json:"qr_code"`
}

type ScanTicketResponse struct {
	ID          string           `json:"id"`
	QRCode      string           `json:"qrCode"`
	Status      string           `json:"status"`
	UsedAt      *string          `json:"usedAt,omitempty"`
	PurchasedAt string           `json:"purchasedAt"`
	Event       *TicketEventInfo `json:"event,omitempty"`
	Seat        *TicketSeatInfo  `json:"seat,omitempty"`
}

