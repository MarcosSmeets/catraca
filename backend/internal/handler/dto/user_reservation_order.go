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

type CreateOrderResponse struct {
	OrderID      string `json:"orderId"`
	ClientSecret string `json:"clientSecret"`
	TotalCents   int64  `json:"totalCents"`
}

type TicketResponse struct {
	ID          string `json:"id"`
	OrderID     string `json:"orderId"`
	EventID     string `json:"eventId"`
	SeatID      string `json:"seatId"`
	QRCode      string `json:"qrCode"`
	Status      string `json:"status"`
	PurchasedAt string `json:"purchasedAt"`
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

