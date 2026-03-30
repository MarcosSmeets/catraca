package http

import (
	"errors"
	"net/http"
	"time"

	"github.com/marcos-smeets/catraca/backend/internal/domain/repository"
	"github.com/marcos-smeets/catraca/backend/internal/handler/dto"
	ticketuc "github.com/marcos-smeets/catraca/backend/internal/usecase/ticket"
)

// AdminTicketHandler handles ticket scanning at the event entrance.
type AdminTicketHandler struct {
	scanTicketUC *ticketuc.ScanTicketUseCase
}

func NewAdminTicketHandler(scanTicketUC *ticketuc.ScanTicketUseCase) *AdminTicketHandler {
	return &AdminTicketHandler{scanTicketUC: scanTicketUC}
}

func (h *AdminTicketHandler) ScanTicket(w http.ResponseWriter, r *http.Request) {
	var req dto.ScanTicketRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.QRCode == "" {
		writeError(w, http.StatusBadRequest, "qr_code is required")
		return
	}

	ticket, err := h.scanTicketUC.Execute(r.Context(), req.QRCode)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ingresso não encontrado")
			return
		}
		if errors.Is(err, ticketuc.ErrTicketAlreadyUsed) {
			resp := dto.ScanTicketResponse{
				ID:          ticket.ID.String(),
				QRCode:      ticket.QRCode,
				Status:      ticket.Status.String(),
				PurchasedAt: ticket.PurchasedAt.Format(time.RFC3339),
			}
			if ticket.UsedAt != nil {
				s := ticket.UsedAt.Format(time.RFC3339)
				resp.UsedAt = &s
			}
			writeJSON(w, http.StatusConflict, map[string]any{
				"error":  "ingresso já utilizado",
				"ticket": resp,
			})
			return
		}
		if errors.Is(err, ticketuc.ErrTicketCancelled) {
			writeError(w, http.StatusConflict, "ingresso cancelado")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	resp := dto.ScanTicketResponse{
		ID:          ticket.ID.String(),
		QRCode:      ticket.QRCode,
		Status:      ticket.Status.String(),
		PurchasedAt: ticket.PurchasedAt.Format(time.RFC3339),
	}
	if ticket.UsedAt != nil {
		s := ticket.UsedAt.Format(time.RFC3339)
		resp.UsedAt = &s
	}
	writeJSON(w, http.StatusOK, resp)
}
