DROP TRIGGER IF EXISTS set_updated_at_tickets ON tickets;
DROP TRIGGER IF EXISTS set_updated_at_orders ON orders;
DROP TRIGGER IF EXISTS set_updated_at_reservations ON reservations;
DROP TRIGGER IF EXISTS set_updated_at_users ON users;
DROP TRIGGER IF EXISTS set_updated_at_seats ON seats;
DROP TRIGGER IF EXISTS set_updated_at_events ON events;
DROP TRIGGER IF EXISTS set_updated_at_venues ON venues;
DROP FUNCTION IF EXISTS trigger_set_updated_at();
