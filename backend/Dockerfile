FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /api cmd/api/main.go

FROM alpine:3.20

RUN apk --no-cache add ca-certificates
COPY --from=builder /api /api
COPY --from=builder /app/migrations /migrations

EXPOSE 8080

ENTRYPOINT ["/api"]
