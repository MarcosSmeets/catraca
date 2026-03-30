package http

import (
	"errors"
	"net/http"
	"time"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/handler/dto"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/user"
)

const refreshTokenCookieName = "refresh_token"

type AuthHandler struct {
	registerUC *user.RegisterUseCase
	loginUC    *user.LoginUseCase
	refreshUC  *user.RefreshUseCase
}

func NewAuthHandler(registerUC *user.RegisterUseCase, loginUC *user.LoginUseCase, refreshUC *user.RefreshUseCase) *AuthHandler {
	return &AuthHandler{
		registerUC: registerUC,
		loginUC:    loginUC,
		refreshUC:  refreshUC,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" || req.CPF == "" {
		writeError(w, http.StatusBadRequest, "name, email, password, and cpf are required")
		return
	}

	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	output, err := h.registerUC.Execute(r.Context(), user.RegisterInput{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		CPF:      req.CPF,
		Phone:    req.Phone,
	})
	if err != nil {
		if errors.Is(err, user.ErrEmailAlreadyExists) {
			writeError(w, http.StatusConflict, "email already registered")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	setRefreshCookie(w, output.TokenPair.RefreshToken)
	writeJSON(w, http.StatusCreated, dto.AuthResponse{
		AccessToken: output.TokenPair.AccessToken,
		User:        toUserResponse(output.User),
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	output, err := h.loginUC.Execute(r.Context(), user.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		if errors.Is(err, user.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	setRefreshCookie(w, output.TokenPair.RefreshToken)
	writeJSON(w, http.StatusOK, dto.AuthResponse{
		AccessToken: output.TokenPair.AccessToken,
		User:        toUserResponse(output.User),
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshTokenCookieName)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "missing refresh token")
		return
	}

	output, err := h.refreshUC.Execute(r.Context(), cookie.Value)
	if err != nil {
		clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	setRefreshCookie(w, output.TokenPair.RefreshToken)
	writeJSON(w, http.StatusOK, map[string]string{
		"accessToken": output.TokenPair.AccessToken,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7 days
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
}

func clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
}

func toUserResponse(u *entity.User) dto.UserResponse {
	return dto.UserResponse{
		ID:        u.ID.String(),
		Name:      u.Name,
		Email:     u.Email,
		CPF:       maskCPF(),
		Phone:     u.Phone,
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
	}
}

func maskCPF() string {
	return "***.***.***-**"
}
