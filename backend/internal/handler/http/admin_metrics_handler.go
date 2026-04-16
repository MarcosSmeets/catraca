package http

import (
	"net/http"

	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
)

type AdminMetricsHandler struct {
	metricsRepo *pginfra.AdminMetricsRepository
}

func NewAdminMetricsHandler(metricsRepo *pginfra.AdminMetricsRepository) *AdminMetricsHandler {
	return &AdminMetricsHandler{metricsRepo: metricsRepo}
}

type metricsResponse struct {
	Financial      financialDTO       `json:"financial"`
	DailyRevenue   []dailyRevenueDTO  `json:"dailyRevenue"`
	TicketSections []sectionCountDTO  `json:"ticketSections"`
	TicketSports   []sportCountDTO    `json:"ticketSports"`
	TopEvents      []topEventDTO      `json:"topEvents"`
	TicketStatuses []statusCountDTO   `json:"ticketStatuses"`
	Stadiums       []stadiumDTO       `json:"stadiums"`
	OrderStatuses  []orderStatusDTO   `json:"orderStatuses"`
}

type financialDTO struct {
	RevenueAllCents   int64 `json:"revenueAllCents"`
	Revenue30dCents   int64 `json:"revenue30dCents"`
	PaidOrdersAll     int64 `json:"paidOrdersAll"`
	PaidOrders30d     int64 `json:"paidOrders30d"`
	TicketsAll        int64 `json:"ticketsAll"`
	Tickets30d        int64 `json:"tickets30d"`
	AvgTicketAllCents int64 `json:"avgTicketAllCents"`
	AvgTicket30dCents int64 `json:"avgTicket30dCents"`
	ServiceFeesAllCents int64 `json:"serviceFeesAllCents"`
	ServiceFees30dCents int64 `json:"serviceFees30dCents"`
}

type dailyRevenueDTO struct {
	Day          string `json:"day"`
	RevenueCents int64  `json:"revenueCents"`
	OrdersCount  int64  `json:"ordersCount"`
}

type sectionCountDTO struct {
	Section      string `json:"section"`
	TicketsCount int64  `json:"ticketsCount"`
}

type sportCountDTO struct {
	Sport        string `json:"sport"`
	TicketsCount int64  `json:"ticketsCount"`
}

type topEventDTO struct {
	EventID      string `json:"eventId"`
	Title        string `json:"title"`
	HomeTeam     string `json:"homeTeam"`
	AwayTeam     string `json:"awayTeam"`
	VenueName    string `json:"venueName"`
	TicketsSold  int64  `json:"ticketsSold"`
	RevenueCents int64  `json:"revenueCents"`
}

type statusCountDTO struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type stadiumDTO struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	City         string  `json:"city"`
	State        string  `json:"state"`
	Capacity     int32   `json:"capacity"`
	EventCount   int64   `json:"eventCount"`
	TotalSeats   int64   `json:"totalSeats"`
	TicketsSold  int64   `json:"ticketsSold"`
	RevenueCents int64   `json:"revenueCents"`
	Occupancy    float64 `json:"occupancy"`
}

type orderStatusDTO struct {
	Status         string `json:"status"`
	CountAll       int64  `json:"countAll"`
	Count30d       int64  `json:"count30d"`
	AmountAllCents int64  `json:"amountAllCents"`
	Amount30dCents int64  `json:"amount30dCents"`
}

func (h *AdminMetricsHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.metricsRepo.GetDashboard(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load metrics")
		return
	}

	resp := metricsResponse{
		Financial: financialDTO{
			RevenueAllCents:     metrics.Financial.RevenueAllCents,
			Revenue30dCents:     metrics.Financial.Revenue30dCents,
			PaidOrdersAll:       metrics.Financial.PaidOrdersAll,
			PaidOrders30d:       metrics.Financial.PaidOrders30d,
			TicketsAll:          metrics.Financial.TicketsAll,
			Tickets30d:          metrics.Financial.Tickets30d,
			AvgTicketAllCents:   metrics.Financial.AvgTicketAllCents,
			AvgTicket30dCents:   metrics.Financial.AvgTicket30dCents,
			ServiceFeesAllCents: metrics.Financial.ServiceFeesAll,
			ServiceFees30dCents: metrics.Financial.ServiceFees30d,
		},
	}

	resp.DailyRevenue = make([]dailyRevenueDTO, 0, len(metrics.DailyRevenue))
	for _, d := range metrics.DailyRevenue {
		resp.DailyRevenue = append(resp.DailyRevenue, dailyRevenueDTO{
			Day:          d.Day,
			RevenueCents: d.RevenueCents,
			OrdersCount:  d.OrdersCount,
		})
	}

	resp.TicketSections = make([]sectionCountDTO, 0, len(metrics.TicketSections))
	for _, s := range metrics.TicketSections {
		resp.TicketSections = append(resp.TicketSections, sectionCountDTO{
			Section:      s.Section,
			TicketsCount: s.TicketsCount,
		})
	}

	resp.TicketSports = make([]sportCountDTO, 0, len(metrics.TicketSports))
	for _, s := range metrics.TicketSports {
		resp.TicketSports = append(resp.TicketSports, sportCountDTO{
			Sport:        s.Sport,
			TicketsCount: s.TicketsCount,
		})
	}

	resp.TopEvents = make([]topEventDTO, 0, len(metrics.TopEvents))
	for _, e := range metrics.TopEvents {
		resp.TopEvents = append(resp.TopEvents, topEventDTO{
			EventID:      e.EventID.String(),
			Title:        e.Title,
			HomeTeam:     e.HomeTeam,
			AwayTeam:     e.AwayTeam,
			VenueName:    e.VenueName,
			TicketsSold:  e.TicketsSold,
			RevenueCents: e.RevenueCents,
		})
	}

	resp.TicketStatuses = make([]statusCountDTO, 0, len(metrics.TicketStatuses))
	for _, s := range metrics.TicketStatuses {
		resp.TicketStatuses = append(resp.TicketStatuses, statusCountDTO{
			Status: s.Status,
			Count:  s.Count,
		})
	}

	resp.Stadiums = make([]stadiumDTO, 0, len(metrics.Stadiums))
	for _, s := range metrics.Stadiums {
		// Occupancy uses total offered seats (sum per event) when available, falling
		// back to capacity × event_count to avoid dividing by zero on venues that
		// exist but haven't defined seats yet.
		denom := s.TotalSeats
		if denom == 0 {
			denom = int64(s.Capacity) * s.EventCount
		}
		var occupancy float64
		if denom > 0 {
			occupancy = float64(s.TicketsSold) / float64(denom)
		}

		resp.Stadiums = append(resp.Stadiums, stadiumDTO{
			ID:           s.ID.String(),
			Name:         s.Name,
			City:         s.City,
			State:        s.State,
			Capacity:     s.Capacity,
			EventCount:   s.EventCount,
			TotalSeats:   s.TotalSeats,
			TicketsSold:  s.TicketsSold,
			RevenueCents: s.RevenueCents,
			Occupancy:    occupancy,
		})
	}

	resp.OrderStatuses = make([]orderStatusDTO, 0, len(metrics.OrderStatuses))
	for _, s := range metrics.OrderStatuses {
		resp.OrderStatuses = append(resp.OrderStatuses, orderStatusDTO{
			Status:         s.Status,
			CountAll:       s.CountAll,
			Count30d:       s.Count30d,
			AmountAllCents: s.AmountAllCents,
			Amount30dCents: s.Amount30dCents,
		})
	}

	writeJSON(w, http.StatusOK, resp)
}
