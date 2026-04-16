package http

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/marcos-smeets/catraca/backend/internal/domain/entity"
	authmw "github.com/marcos-smeets/catraca/backend/internal/handler/middleware"
	pginfra "github.com/marcos-smeets/catraca/backend/internal/infra/postgres"
)

type AdminMetricsHandler struct {
	metricsRepo *pginfra.AdminMetricsRepository
}

func NewAdminMetricsHandler(metricsRepo *pginfra.AdminMetricsRepository) *AdminMetricsHandler {
	return &AdminMetricsHandler{metricsRepo: metricsRepo}
}

type metricsResponse struct {
	Financial            financialDTO       `json:"financial"`
	DailyRevenue         []dailyRevenueDTO  `json:"dailyRevenue"`
	TicketSections       []sectionCountDTO  `json:"ticketSections"`
	TicketSports         []sportCountDTO    `json:"ticketSports"`
	TopEvents            []topEventDTO      `json:"topEvents"`
	TicketStatuses       []statusCountDTO   `json:"ticketStatuses"`
	Stadiums             []stadiumDTO       `json:"stadiums"`
	OrderStatuses        []orderStatusDTO   `json:"orderStatuses"`
	Resale               resaleDTO          `json:"resale"`
	Platform             *platformCountsDTO `json:"platform,omitempty"`
	OrganizationsRevenue []orgRevenueDTO    `json:"organizationsRevenue,omitempty"`
}

type platformCountsDTO struct {
	OrganizationCount int64 `json:"organizationCount"`
	UserCount         int64 `json:"userCount"`
}

type orgRevenueDTO struct {
	OrganizationID  string `json:"organizationId"`
	Name            string `json:"name"`
	Slug            string `json:"slug"`
	Revenue30dCents int64  `json:"revenue30dCents"`
	RevenueAllCents int64  `json:"revenueAllCents"`
}

type resaleDTO struct {
	ActiveListings        int64 `json:"activeListings"`
	CancelledListings     int64 `json:"cancelledListings"`
	SoldListingsAll       int64 `json:"soldListingsAll"`
	ResalePaidOrdersAll   int64 `json:"resalePaidOrdersAll"`
	ResaleRevenueAllCents int64 `json:"resaleRevenueAllCents"`
	ResalePaidOrders30d   int64 `json:"resalePaidOrders30d"`
	ResaleRevenue30dCents int64 `json:"resaleRevenue30dCents"`
}

type financialDTO struct {
	RevenueAllCents     int64 `json:"revenueAllCents"`
	Revenue30dCents     int64 `json:"revenue30dCents"`
	PaidOrdersAll       int64 `json:"paidOrdersAll"`
	PaidOrders30d       int64 `json:"paidOrders30d"`
	TicketsAll          int64 `json:"ticketsAll"`
	Tickets30d          int64 `json:"tickets30d"`
	AvgTicketAllCents   int64 `json:"avgTicketAllCents"`
	AvgTicket30dCents   int64 `json:"avgTicket30dCents"`
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
	claims := authmw.GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}

	qOrg := r.URL.Query().Get("organizationId")
	var queryOrgID *uuid.UUID
	if qOrg != "" {
		id, err := uuid.Parse(qOrg)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid organizationId")
			return
		}
		queryOrgID = &id
	}

	var filter *uuid.UUID
	var loadPlatformExtras bool

	switch entity.UserRole(claims.Role) {
	case entity.UserRolePlatformAdmin:
		if queryOrgID != nil {
			filter = queryOrgID
			loadPlatformExtras = false
		} else {
			filter = nil
			loadPlatformExtras = true
		}
	case entity.UserRoleAdmin, entity.UserRoleOrganizer:
		if claims.OrganizationID == nil {
			writeError(w, http.StatusForbidden, "organization is required for tenant admin metrics")
			return
		}
		filter = claims.OrganizationID
		loadPlatformExtras = false
	default:
		writeError(w, http.StatusForbidden, "insufficient permissions for admin metrics")
		return
	}

	metrics, err := h.metricsRepo.GetDashboard(r.Context(), filter, loadPlatformExtras)
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
		Resale: resaleDTO{
			ActiveListings:        metrics.Resale.ActiveListings,
			CancelledListings:     metrics.Resale.CancelledListings,
			SoldListingsAll:       metrics.Resale.SoldListingsAll,
			ResalePaidOrdersAll:   metrics.Resale.ResalePaidOrdersAll,
			ResaleRevenueAllCents: metrics.Resale.ResaleRevenueAllCents,
			ResalePaidOrders30d:   metrics.Resale.ResalePaidOrders30d,
			ResaleRevenue30dCents: metrics.Resale.ResaleRevenue30dCents,
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

	if metrics.Platform != nil {
		resp.Platform = &platformCountsDTO{
			OrganizationCount: metrics.Platform.OrganizationCount,
			UserCount:         metrics.Platform.UserCount,
		}
	}
	if len(metrics.OrganizationsRevenue) > 0 {
		resp.OrganizationsRevenue = make([]orgRevenueDTO, 0, len(metrics.OrganizationsRevenue))
		for _, o := range metrics.OrganizationsRevenue {
			resp.OrganizationsRevenue = append(resp.OrganizationsRevenue, orgRevenueDTO{
				OrganizationID:  o.OrganizationID.String(),
				Name:            o.OrganizationName,
				Slug:            o.OrganizationSlug,
				Revenue30dCents: o.Revenue30dCents,
				RevenueAllCents: o.RevenueAllCents,
			})
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
