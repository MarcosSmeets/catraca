import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAdminAuthStore } from "@/store/admin-auth";
import type { Venue, Event, Seat, EventStatus } from "./mock-data";

export interface AdminSection {
  id: string;
  eventId: string;
  name: string;
  imageUrl: string;
}

export interface CreateVenuePayload {
  name: string;
  city: string;
  state: string;
  capacity: number;
}

export interface CreateEventPayload {
  title: string;
  sport: string;
  league: string;
  venueId: string;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
  imageUrl: string;
  serviceFeePercent: number;
  vibeChips: string[];
}

export interface UpdateEventPayload {
  title?: string;
  homeTeam?: string;
  awayTeam?: string;
  imageUrl?: string;
  vibeChips?: string[];
}

export interface CreateSectionPayload {
  name: string;
  imageUrl: string;
}

export interface SeatInput {
  section: string;
  row: string;
  number: string;
  priceCents: number;
  col: number;
  rowIndex: number;
}

function token() {
  return useAdminAuthStore.getState().adminToken;
}

// Venues
export interface AdminVenuesParams {
  q?: string;
  state?: string;
  city?: string;
  page?: number;
  limit?: number;
  /** Scoped listing for `platform_admin` (backend query `organization_id`). */
  organizationId?: string;
}

export interface PaginatedAdminVenues {
  venues: Venue[];
  total: number;
  page: number;
  limit: number;
}

export async function adminListVenues(
  params: AdminVenuesParams = {}
): Promise<PaginatedAdminVenues> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.state) qs.set("state", params.state);
  if (params.city) qs.set("city", params.city);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.organizationId) qs.set("organization_id", params.organizationId);
  const query = qs.toString();
  return apiFetch<PaginatedAdminVenues>(`/admin/venues${query ? `?${query}` : ""}`, {
    accessToken: token(),
  });
}

export async function adminListVenueStates(): Promise<string[]> {
  const res = await apiFetch<{ states: string[] }>("/admin/venues/states", {
    accessToken: token(),
  });
  return res.states;
}

export function useAdminVenues(params: AdminVenuesParams = {}) {
  return useQuery({
    queryKey: ["admin-venues", params],
    queryFn: () => adminListVenues(params),
  });
}

export function useAdminVenueStates() {
  return useQuery({
    queryKey: ["admin-venue-states"],
    queryFn: adminListVenueStates,
  });
}

export async function adminCreateVenue(payload: CreateVenuePayload): Promise<Venue> {
  return apiFetch<Venue>("/admin/venues", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

// Events
export interface AdminEventsParams {
  q?: string;
  status?: EventStatus | "";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  organizationId?: string;
}

export interface PaginatedAdminEvents {
  events: Event[];
  total: number;
  page: number;
  limit: number;
}

export async function adminListEvents(
  params: AdminEventsParams = {}
): Promise<PaginatedAdminEvents> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.organizationId) qs.set("organization_id", params.organizationId);
  const query = qs.toString();
  return apiFetch<PaginatedAdminEvents>(`/admin/events${query ? `?${query}` : ""}`, {
    accessToken: token(),
  });
}

export function useAdminEvents(params: AdminEventsParams = {}) {
  return useQuery({
    queryKey: ["admin-events", params],
    queryFn: () => adminListEvents(params),
  });
}

export async function adminGetEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/admin/events/${id}`, { accessToken: token() });
}

export async function adminCreateEvent(payload: CreateEventPayload): Promise<Event> {
  return apiFetch<Event>("/admin/events", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

export async function adminUpdateEvent(id: string, payload: UpdateEventPayload): Promise<Event> {
  return apiFetch<Event>(`/admin/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

export async function adminPublishEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/admin/events/${id}/publish`, {
    method: "POST",
    accessToken: token(),
  });
}

// Sections
export async function adminListSections(eventId: string): Promise<AdminSection[]> {
  const res = await apiFetch<{ sections: AdminSection[] }>(`/admin/events/${eventId}/sections`, {
    accessToken: token(),
  });
  return res.sections;
}

export async function adminCreateSection(
  eventId: string,
  payload: CreateSectionPayload
): Promise<AdminSection> {
  return apiFetch<AdminSection>(`/admin/events/${eventId}/sections`, {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

// Seats
export async function adminBatchCreateSeats(
  eventId: string,
  seats: SeatInput[]
): Promise<Seat[]> {
  const res = await apiFetch<{ seats: Seat[] }>(`/admin/events/${eventId}/seats/batch`, {
    method: "POST",
    body: JSON.stringify({ seats }),
    accessToken: token(),
  });
  return res.seats;
}

// Ticket scan
export interface ScanTicketResult {
  id: string;
  qrCode: string;
  status: "VALID" | "USED" | "CANCELLED";
  usedAt?: string;
  purchasedAt: string;
  event?: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    sport: string;
    startsAt: string;
    imageUrl: string;
    venueName: string;
    venueCity: string;
  };
  seat?: {
    id: string;
    section: string;
    row: string;
    number: string;
    priceCents: number;
  };
}

export interface ScanTicketConflict {
  error: string;
  ticket: ScanTicketResult;
}

export async function adminScanTicket(qrCode: string): Promise<ScanTicketResult> {
  return apiFetch<ScanTicketResult>("/admin/tickets/scan", {
    method: "POST",
    body: JSON.stringify({ qr_code: qrCode }),
    accessToken: token(),
  });
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface DashboardFinancial {
  revenueAllCents: number;
  revenue30dCents: number;
  paidOrdersAll: number;
  paidOrders30d: number;
  ticketsAll: number;
  tickets30d: number;
  avgTicketAllCents: number;
  avgTicket30dCents: number;
  serviceFeesAllCents: number;
  serviceFees30dCents: number;
}

export interface DailyRevenuePoint {
  day: string;
  revenueCents: number;
  ordersCount: number;
}

export interface SectionCount {
  section: string;
  ticketsCount: number;
}

export interface SportCount {
  sport: string;
  ticketsCount: number;
}

export interface TopEventMetric {
  eventId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  venueName: string;
  ticketsSold: number;
  revenueCents: number;
}

export interface TicketStatusCount {
  status: "VALID" | "USED" | "CANCELLED";
  count: number;
}

export interface StadiumMetric {
  id: string;
  name: string;
  city: string;
  state: string;
  capacity: number;
  eventCount: number;
  totalSeats: number;
  ticketsSold: number;
  revenueCents: number;
  occupancy: number;
}

export interface OrderStatusMetric {
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  countAll: number;
  count30d: number;
  amountAllCents: number;
  amount30dCents: number;
}

export interface DashboardResale {
  activeListings: number;
  cancelledListings: number;
  soldListingsAll: number;
  resalePaidOrdersAll: number;
  resaleRevenueAllCents: number;
  resalePaidOrders30d: number;
  resaleRevenue30dCents: number;
}

export interface DashboardPlatform {
  organizationCount: number;
  userCount: number;
}

export interface OrgRevenueMetric {
  organizationId: string;
  name: string;
  slug: string;
  revenue30dCents: number;
  revenueAllCents: number;
}

export interface DashboardMetrics {
  financial: DashboardFinancial;
  dailyRevenue: DailyRevenuePoint[];
  ticketSections: SectionCount[];
  ticketSports: SportCount[];
  topEvents: TopEventMetric[];
  ticketStatuses: TicketStatusCount[];
  stadiums: StadiumMetric[];
  orderStatuses: OrderStatusMetric[];
  resale: DashboardResale;
  platform?: DashboardPlatform;
  organizationsRevenue?: OrgRevenueMetric[];
}

export async function adminGetMetrics(organizationId?: string): Promise<DashboardMetrics> {
  const qs = new URLSearchParams();
  if (organizationId) qs.set("organizationId", organizationId);
  const suffix = qs.toString();
  return apiFetch<DashboardMetrics>(`/admin/metrics${suffix ? `?${suffix}` : ""}`, {
    accessToken: token(),
  });
}

/** For `platform_admin`, pass a tenant UUID to scope metrics; omit for all tenants. Tenant admins ignore this. */
export function useAdminMetrics(platformOrganizationId?: string) {
  const role = useAdminAuthStore((s) => s.adminUser?.role);
  const hasToken = !!useAdminAuthStore((s) => s.adminToken);
  const scopedOrg =
    role === "platform_admin" && platformOrganizationId && platformOrganizationId.length > 0
      ? platformOrganizationId
      : undefined;
  return useQuery({
    queryKey: ["admin-metrics", role ?? "none", scopedOrg ?? "__all__"],
    queryFn: () => adminGetMetrics(scopedOrg),
    enabled: hasToken,
  });
}

export interface AdminOrganizationRow {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string | null;
}

export interface AdminOrganizationListResponse {
  items: AdminOrganizationRow[];
  total: number;
}

export async function adminListOrganizations(): Promise<AdminOrganizationListResponse> {
  return apiFetch<AdminOrganizationListResponse>("/admin/organizations", {
    accessToken: token(),
  });
}

export function useAdminOrganizationsList(enabled: boolean) {
  const hasToken = useAdminAuthStore((s) => !!s.adminToken);
  return useQuery({
    queryKey: ["admin-organizations"],
    queryFn: adminListOrganizations,
    enabled: enabled && hasToken,
  });
}

export async function adminCreateOrganization(body: {
  name: string;
  slug: string;
}): Promise<AdminOrganizationRow> {
  return apiFetch<AdminOrganizationRow>("/admin/organizations", {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export async function adminPatchOrganization(
  id: string,
  body: { name?: string; slug?: string }
): Promise<void> {
  await apiFetch<void>(`/admin/organizations/${id}`, {
    method: "PATCH",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export async function adminStartOrgSubscriptionCheckout(
  orgId: string
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(
    `/admin/organizations/${orgId}/billing/checkout`,
    {
      method: "POST",
      accessToken: token(),
      body: "{}",
    }
  );
}

export async function adminAddOrgMember(
  orgId: string,
  body: { email: string; role: "organizer" | "staff" }
): Promise<void> {
  await apiFetch<void>(`/admin/organizations/${orgId}/members`, {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export async function adminListEventSeats(eventId: string): Promise<Seat[]> {
  return apiFetch<Seat[]>(`/admin/events/${eventId}/seats`, {
    accessToken: token(),
  });
}
