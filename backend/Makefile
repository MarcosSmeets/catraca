.PHONY: run test test/unit test/int mock migrate/up migrate/down sqlc lint build seed

DATABASE_URL ?= postgres://catraca:catraca@localhost:5432/catraca?sslmode=disable

run:
	go run cmd/api/main.go

build:
	go build -o bin/api cmd/api/main.go

seed:
	go run cmd/seed/main.go

test:
	go test ./... -race -count=1

test/unit:
	go test ./internal/domain/... ./internal/usecase/... -race -count=1

test/int:
	go test ./internal/infra/... ./internal/handler/... -race -count=1 -tags=integration

mock:
	mockery --all --keeptree --output=test/mocks

migrate/up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate/down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

sqlc:
	sqlc generate

lint:
	golangci-lint run ./...
