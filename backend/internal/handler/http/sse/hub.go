package sse

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/google/uuid"
)

// SeatUpdateEvent is the payload pushed to SSE clients when a seat status changes.
type SeatUpdateEvent struct {
	Type    string `json:"type"`
	SeatID  string `json:"seatId"`
	Status  string `json:"status"`
	EventID string `json:"eventId"`
}

// Hub manages SSE client connections per event.
type Hub struct {
	mu      sync.RWMutex
	clients map[uuid.UUID]map[chan SeatUpdateEvent]struct{}
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[uuid.UUID]map[chan SeatUpdateEvent]struct{}),
	}
}

// Subscribe registers a new SSE channel for the given eventID.
func (h *Hub) Subscribe(eventID uuid.UUID) chan SeatUpdateEvent {
	ch := make(chan SeatUpdateEvent, 16)
	h.mu.Lock()
	if h.clients[eventID] == nil {
		h.clients[eventID] = make(map[chan SeatUpdateEvent]struct{})
	}
	h.clients[eventID][ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

// Unsubscribe removes and closes a client channel.
func (h *Hub) Unsubscribe(eventID uuid.UUID, ch chan SeatUpdateEvent) {
	h.mu.Lock()
	if chans, ok := h.clients[eventID]; ok {
		delete(chans, ch)
		if len(chans) == 0 {
			delete(h.clients, eventID)
		}
	}
	h.mu.Unlock()
	close(ch)
}

// Broadcast sends a seat update to all subscribers for the given eventID.
func (h *Hub) Broadcast(eventID uuid.UUID, evt SeatUpdateEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients[eventID] {
		select {
		case ch <- evt:
		default:
			// drop if client is slow
		}
	}
}

// ServeHTTP is the SSE handler for GET /events/{id}/seats/stream.
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request, eventID uuid.UUID) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch := h.Subscribe(eventID)
	defer h.Unsubscribe(eventID, ch)

	// Send initial connected event
	fmt.Fprintf(w, "data: {\"type\":\"connected\",\"eventId\":\"%s\"}\n\n", eventID)
	flusher.Flush()

	for {
		select {
		case <-r.Context().Done():
			return
		case evt, ok := <-ch:
			if !ok {
				return
			}
			data, err := json.Marshal(evt)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
