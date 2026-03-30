CREATE TABLE order_reservations (
    order_id       UUID NOT NULL REFERENCES orders(id),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    PRIMARY KEY (order_id, reservation_id)
);

CREATE INDEX idx_order_reservations_reservation_id ON order_reservations(reservation_id);
