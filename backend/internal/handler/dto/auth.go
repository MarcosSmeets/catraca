package dto

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	CPF      string `json:"cpf"`
	Phone    string `json:"phone"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	AccessToken string       `json:"accessToken"`
	User        UserResponse `json:"user"`
}

type UserResponse struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	CPF              string  `json:"cpf"`
	Phone            string  `json:"phone"`
	Role             string  `json:"role"`
	OrganizationID   *string `json:"organizationId,omitempty"`
	CreatedAt        string  `json:"createdAt"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
