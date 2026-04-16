package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	pgdb "github.com/marcos-smeets/catraca/backend/internal/infra/postgres/db"
)

type AdminMetricsRepository struct {
	queries *pgdb.Queries
}

func NewAdminMetricsRepository(pool *pgxpool.Pool) *AdminMetricsRepository {
	return &AdminMetricsRepository{queries: pgdb.New(pool)}
}

// DashboardMetrics carries every aggregate the admin dashboard renders.
type DashboardMetrics struct {
	Financial      FinancialMetrics
	DailyRevenue   []DailyRevenuePoint
	TicketSections []SectionCount
	TicketSports   []SportCount
	TopEvents      []TopEvent
	TicketStatuses []StatusCount
	Stadiums       []StadiumSummary
	OrderStatuses  []OrderStatusMetric
}

type FinancialMetrics struct {
	RevenueAllCents   int64
	Revenue30dCents   int64
	PaidOrdersAll     int64
	PaidOrders30d     int64
	TicketsAll        int64
	Tickets30d        int64
	AvgTicketAllCents int64
	AvgTicket30dCents int64
	ServiceFeesAll    int64
	ServiceFees30d    int64
}

type DailyRevenuePoint struct {
	Day          string
	RevenueCents int64
	OrdersCount  int64
}

type SectionCount struct {
	Section      string
	TicketsCount int64
}

type SportCount struct {
	Sport        string
	TicketsCount int64
}

type TopEvent struct {
	EventID      uuid.UUID
	Title        string
	HomeTeam     string
	AwayTeam     string
	VenueName    string
	TicketsSold  int64
	RevenueCents int64
}

type StatusCount struct {
	Status string
	Count  int64
}

type StadiumSummary struct {
	ID           uuid.UUID
	Name         string
	City         string
	State        string
	Capacity     int32
	EventCount   int64
	TotalSeats   int64
	TicketsSold  int64
	RevenueCents int64
}

type OrderStatusMetric struct {
	Status         string
	CountAll       int64
	Count30d       int64
	AmountAllCents int64
	Amount30dCents int64
}

// GetDashboard runs every aggregate query and assembles a single struct.
// Queries are issued sequentially against the same pool — the payload is
// small and latency dominated by disk, so parallelizing adds complexity
// without meaningful gain.
func (r *AdminMetricsRepository) GetDashboard(ctx context.Context) (*DashboardMetrics, error) {
	fin, err := r.queries.GetFinancialTotals(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetFinancialTotals: %w", err)
	}
	tix, err := r.queries.GetTicketFinancials(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetTicketFinancials: %w", err)
	}
	daily, err := r.queries.GetDailyRevenue(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetDailyRevenue: %w", err)
	}
	sections, err := r.queries.GetTicketsBySection(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetTicketsBySection: %w", err)
	}
	sports, err := r.queries.GetTicketsBySport(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetTicketsBySport: %w", err)
	}
	topEvents, err := r.queries.GetTopEventsByTickets(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetTopEventsByTickets: %w", err)
	}
	ticketStatus, err := r.queries.GetTicketStatusCounts(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetTicketStatusCounts: %w", err)
	}
	stadiums, err := r.queries.GetStadiumSummary(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetStadiumSummary: %w", err)
	}
	orderStatus, err := r.queries.GetOrderStatusCounts(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetOrderStatusCounts: %w", err)
	}

	metrics := &DashboardMetrics{
		Financial: FinancialMetrics{
			RevenueAllCents: fin.RevenueAllCents,
			Revenue30dCents: fin.Revenue30dCents,
			PaidOrdersAll:   fin.PaidOrdersAll,
			PaidOrders30d:   fin.PaidOrders30d,
			TicketsAll:      tix.TicketsAll,
			Tickets30d:      tix.Tickets30d,
			// Service fees = paid revenue minus the sum of seat prices for those tickets.
			// Total includes service fee (see CreateOrderUseCase); subtracting gives the fee portion.
			ServiceFeesAll: fin.RevenueAllCents - tix.BaseCentsAll,
			ServiceFees30d: fin.Revenue30dCents - tix.BaseCents30d,
		},
	}

	if tix.TicketsAll > 0 {
		metrics.Financial.AvgTicketAllCents = tix.BaseCentsAll / tix.TicketsAll
	}
	if tix.Tickets30d > 0 {
		metrics.Financial.AvgTicket30dCents = tix.BaseCents30d / tix.Tickets30d
	}

	metrics.DailyRevenue = make([]DailyRevenuePoint, 0, len(daily))
	for _, d := range daily {
		metrics.DailyRevenue = append(metrics.DailyRevenue, DailyRevenuePoint{
			Day:          d.Day,
			RevenueCents: d.RevenueCents,
			OrdersCount:  d.OrdersCount,
		})
	}

	metrics.TicketSections = make([]SectionCount, 0, len(sections))
	for _, s := range sections {
		metrics.TicketSections = append(metrics.TicketSections, SectionCount{
			Section:      s.Section,
			TicketsCount: s.TicketsCount,
		})
	}

	metrics.TicketSports = make([]SportCount, 0, len(sports))
	for _, s := range sports {
		metrics.TicketSports = append(metrics.TicketSports, SportCount{
			Sport:        s.Sport,
			TicketsCount: s.TicketsCount,
		})
	}

	metrics.TopEvents = make([]TopEvent, 0, len(topEvents))
	for _, e := range topEvents {
		metrics.TopEvents = append(metrics.TopEvents, TopEvent{
			EventID:      e.EventID,
			Title:        e.Title,
			HomeTeam:     e.HomeTeam,
			AwayTeam:     e.AwayTeam,
			VenueName:    e.VenueName,
			TicketsSold:  e.TicketsSold,
			RevenueCents: e.RevenueCents,
		})
	}

	metrics.TicketStatuses = make([]StatusCount, 0, len(ticketStatus))
	for _, s := range ticketStatus {
		metrics.TicketStatuses = append(metrics.TicketStatuses, StatusCount{
			Status: s.Status,
			Count:  s.Count,
		})
	}

	metrics.Stadiums = make([]StadiumSummary, 0, len(stadiums))
	for _, s := range stadiums {
		metrics.Stadiums = append(metrics.Stadiums, StadiumSummary{
			ID:           s.ID,
			Name:         s.Name,
			City:         s.City,
			State:        s.State,
			Capacity:     s.Capacity,
			EventCount:   s.EventCount,
			TotalSeats:   s.TotalSeats,
			TicketsSold:  s.TicketsSold,
			RevenueCents: s.RevenueCents,
		})
	}

	metrics.OrderStatuses = make([]OrderStatusMetric, 0, len(orderStatus))
	for _, s := range orderStatus {
		metrics.OrderStatuses = append(metrics.OrderStatuses, OrderStatusMetric{
			Status:         s.Status,
			CountAll:       s.CountAll,
			Count30d:       s.Count30d,
			AmountAllCents: s.AmountAllCents,
			Amount30dCents: s.Amount30dCents,
		})
	}

	return metrics, nil
}
