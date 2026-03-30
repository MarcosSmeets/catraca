package http

import (
	"errors"
	"net/http"
	"time"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	"github.com/marcos-smeets/catraca/backend/internal/handler/dto"
	"github.com/marcos-smeets/catraca/backend/internal/usecase/user"
)

const (
	refreshTokenCookieName = "refresh_token"
	adminTokenCookieName   = "admin_token"
	adminTokenDuration     = 8 * 60 * 60 // 8 hours
)

type AuthHandler struct {
	registerUC       *user.RegisterUseCase
	loginUC          *user.LoginUseCase
	refreshUC        *user.RefreshUseCase
	forgotPasswordUC *user.ForgotPasswordUseCase
	resetPasswordUC  *user.ResetPasswordUseCase
	appEnv           string
}

func NewAuthHandler(
	registerUC *user.RegisterUseCase,
	loginUC *user.LoginUseCase,
	refreshUC *user.RefreshUseCase,
	forgotPasswordUC *user.ForgotPasswordUseCase,
	resetPasswordUC *user.ResetPasswordUseCase,
	appEnv string,
) *AuthHandler {
	return &AuthHandler{
		registerUC:       registerUC,
		loginUC:          loginUC,
		refreshUC:        refreshUC,
		forgotPasswordUC: forgotPasswordUC,
		resetPasswordUC:  resetPasswordUC,
		appEnv:           appEnv,
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
		if errors.Is(err, user.ErrCPFAlreadyExists) {
			writeError(w, http.StatusConflict, "CPF already registered")
			return
		}
		if errors.Is(err, entity.ErrInvalidCPF) {
			writeError(w, http.StatusBadRequest, "invalid CPF")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	h.setRefreshCookie(w, output.TokenPair.RefreshToken)
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

	h.setRefreshCookie(w, output.TokenPair.RefreshToken)
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
		h.clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	h.setRefreshCookie(w, output.TokenPair.RefreshToken)
	writeJSON(w, http.StatusOK, map[string]string{
		"accessToken": output.TokenPair.AccessToken,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req dto.ForgotPasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}
	// Always return 200 to avoid email enumeration
	_, _ = h.forgotPasswordUC.Execute(r.Context(), req.Email)
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "if this email is registered, a reset link will be sent",
	})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req dto.ResetPasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Token == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "token and password are required")
		return
	}
	if err := h.resetPasswordUC.Execute(r.Context(), req.Token, req.Password); err != nil {
		if errors.Is(err, user.ErrInvalidResetToken) {
			writeError(w, http.StatusBadRequest, "invalid or expired reset token")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated successfully"})
}

func (h *AuthHandler) AdminLogin(w http.ResponseWriter, r *http.Request) {
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

	if output.User.Role != entity.UserRoleAdmin && output.User.Role != entity.UserRoleOrganizer {
		writeError(w, http.StatusForbidden, "access restricted to admin and organizer accounts")
		return
	}

	h.setAdminTokenCookie(w, output.TokenPair.AccessToken)
	writeJSON(w, http.StatusOK, dto.AuthResponse{
		AccessToken: output.TokenPair.AccessToken,
		User:        toUserResponse(output.User),
	})
}

func (h *AuthHandler) AdminLogout(w http.ResponseWriter, r *http.Request) {
	h.clearAdminTokenCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) setAdminTokenCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     adminTokenCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   adminTokenDuration,
		HttpOnly: true,
		Secure:   h.appEnv != "development",
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) clearAdminTokenCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     adminTokenCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.appEnv != "development",
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7 days
		HttpOnly: true,
		Secure:   h.appEnv != "development",
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.appEnv != "development",
		SameSite: http.SameSiteLaxMode,
	})
}

func toUserResponse(u *entity.User) dto.UserResponse {
	return dto.UserResponse{
		ID:        u.ID.String(),
		Name:      u.Name,
		Email:     u.Email,
		CPF:       maskCPF(),
		Phone:     u.Phone,
		Role:      string(u.Role),
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
	}
}

func maskCPF() string {
	return "***.***.***-**"
}
