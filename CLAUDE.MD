# CLAUDE.md — Catraca (Sports Ticket Marketplace)

> Este arquivo é o contexto central do projeto para o Claude. Leia-o inteiro antes de qualquer tarefa.

---

## 1. Visão Geral

**Catraca** é um marketplace de ingressos esportivos focado no mercado brasileiro. Inspirado no modelo do SeatGeek, mas com foco total em esportes — do Futebol da Série A à Série D, Basquete (NBB), Vôlei (Superliga), e modalidades menos exploradas por plataformas concorrentes.

**Posicionamento:** Design minimalista brutalista, experiência rápida, confiável e focada no torcedor brasileiro.

**Público-alvo:** Torcedores de clubes de todos os portes, especialmente das Séries B, C e D (atualmente desassistidos pelas grandes plataformas).

---

## 2. Stack Técnica

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS (seguindo o design system `arena_monochrome`)
- **Fontes:** Space Grotesk (display) + Inter (body) via `next/font`
- **State:** Zustand (estado global leve) + React Query (server state/cache)
- **Testes:** Jest + React Testing Library

### Backend
- **Linguagem:** Go 1.22+
- **Arquitetura:** Clean Architecture (Entities → Use Cases → Interface Adapters → Frameworks)
- **HTTP Router:** Chi ou Fiber
- **ORM/Query Builder:** sqlc (geração de código type-safe a partir de SQL puro)
- **Migrações:** golang-migrate
- **Autenticação:** JWT (access token 15min + refresh token 7d via HttpOnly cookie)
- **Testes:** testify + mockery (mocks auto-gerados via interfaces)
- **Linting:** golangci-lint

### Infraestrutura / Serviços
- **Banco de dados:** PostgreSQL 16
- **Cache / Filas:** Redis (reserva temporária de assentos + pub/sub para eventos em tempo real)
- **Gateway de pagamento:** Stripe (suporte a BRL, PIX, cartão de crédito)
- **Containerização:** Docker + Docker Compose (dev) → Railway ou Fly.io (prod)
- **Observabilidade:** Zerolog (logs estruturados) + Sentry (erros)

---

## 3. Arquitetura — Clean Architecture (Go)

```
/internal
  /domain               ← Entidades puras, sem dependências externas
    /entity             ← Event, Seat, Ticket, User, Order, Reservation
    /repository         ← Interfaces (contratos)
    /service            ← Interfaces de domínio (SeatLockerService, etc.)

  /usecase              ← Casos de uso (lógica de negócio)
    /event
    /order
    /reservation
    /user

  /infra                ← Implementações concretas
    /postgres           ← Implementações de repository (sqlc)
    /redis              ← SeatLockerService, PublisherService
    /stripe             ← PaymentGateway
    /jwt                ← TokenService

  /handler              ← HTTP handlers (Chi router)
    /http
    /middleware
    /dto                ← Request/Response structs (separados das entidades)

/cmd
  /api                  ← main.go, wiring (injeção manual ou wire)

/migrations             ← SQL migrations numeradas
/test                   ← Helpers de teste, fixtures, factories
```

**Regra de ouro:** Nenhuma camada interna (`domain`, `usecase`) importa uma camada externa. O `usecase` depende de interfaces, nunca de implementações concretas.

---

## 4. Concorrência — O Coração do Sistema

> Dois clientes **nunca** podem reservar o mesmo assento simultaneamente.

### Estratégia: Redis Distributed Lock + TTL

**Fluxo de reserva temporária (seat hold):**

1. Usuário seleciona um assento → `POST /reservations`
2. O `ReservationUseCase` tenta adquirir um lock no Redis:
   ```
   SET seat:{event_id}:{seat_id} user:{user_id} NX PX 600000
   ```
   - `NX` = só seta se não existir (atômico)
   - `PX 600000` = expira em 10 minutos
3. **Lock adquirido:** Assento marcado como `RESERVED`, timer visível no frontend (countdown de 10min).
4. **Lock falhou:** HTTP 409 → "Assento indisponível no momento."
5. Usuário finaliza o pagamento → lock é confirmado → assento vira `SOLD`.
6. Usuário abandona ou tempo expira → lock TTL expira → assento volta para `AVAILABLE` via Redis keyspace notification → Go worker processa a liberação.

### Goroutines e Workers

```
/internal/worker
  seat_expiry_worker.go   ← Escuta keyspace notifications do Redis (expired keys)
  payment_webhook.go      ← Processa webhooks do Stripe de forma assíncrona
```

- Workers rodam como goroutines supervisionadas no startup do servidor.
- Usar `errgroup` (golang.org/x/sync/errgroup) para graceful shutdown.
- **Nunca** usar goroutines soltas sem supervisão (`go func()` sem contexto de cancelamento é proibido).

### Regras de Concorrência no Código
- Todo use case que toca assento **deve** passar pelo `SeatLockerService` (interface).
- Handlers HTTP não fazem locking diretamente — delegam ao use case.
- Testes de concorrência com `-race` flag são obrigatórios no CI.

---

## 5. TDD — Fluxo de Desenvolvimento

**Ordem obrigatória:** Red → Green → Refactor.

### Camadas a testar

| Camada | Tipo de Teste | Ferramenta |
|---|---|---|
| `domain/entity` | Unit | testify |
| `usecase` | Unit (mocks via mockery) | testify + mockery |
| `infra/postgres` | Integration (testcontainers-go) | testify |
| `infra/redis` | Integration (testcontainers-go) | testify |
| `handler/http` | Integration (httptest) | testify |
| Frontend | Unit/Component | Jest + RTL |
| Frontend E2E | E2E | Playwright |

### Convenção de arquivos de teste Go
```
usecase/reservation/reserve_seat_test.go   ← testa reserve_seat.go
```

### Factories de teste
- Criar `test/factory/` com funções auxiliares: `NewTestEvent()`, `NewTestUser()`, etc.
- Não duplicar setup em cada arquivo de teste.

---

## 6. Autenticação JWT

- **Access Token:** 15 minutos, carregado no header `Authorization: Bearer <token>`
- **Refresh Token:** 7 dias, armazenado em `HttpOnly Secure SameSite=Strict` cookie
- **Payload do JWT:**
  ```json
  { "sub": "user_id", "email": "...", "role": "user|admin|organizer", "exp": ... }
  ```
- Middleware de autenticação fica em `handler/http/middleware/auth.go`
- Refresh automático no frontend via interceptor do React Query

---

## 7. Pagamentos — Stripe

- Moeda: `BRL`
- Métodos suportados: Cartão de crédito, PIX (Stripe suporta PIX nativamente)
- **Fluxo:**
  1. `POST /orders` cria um `PaymentIntent` no Stripe + persiste o `Order` com status `PENDING`
  2. Frontend usa `Stripe.js` para confirmar o pagamento
  3. Webhook do Stripe (`payment_intent.succeeded` / `payment_intent.payment_failed`) confirma ou cancela a order
  4. Worker processa o webhook → atualiza status → libera ou confirma o lock do assento
- **Segurança:** Validar assinatura do webhook com `stripe.ConstructEvent` (obrigatório)
- Taxa de serviço: configurável por evento (`service_fee_percent` na tabela `events`)

---

## 8. Design System — Arena Monochrome

> Arquivo de referência: `arena_monochrome/DESIGN.md`

### Tokens Principais (Tailwind custom theme)
```js
// tailwind.config.ts
colors: {
  primary: '#000000',
  'primary-container': '#3b3b3b',
  'on-primary': '#e2e2e2',
  surface: '#f9f9f9',
  'surface-low': '#f3f3f4',
  'surface-lowest': '#ffffff',
  'surface-dim': '#c6c6c6',
  'on-surface': '#1a1c1c',
  'outline-variant': 'rgba(26,28,28,0.2)',
  error: '#ba1a1a',
}
```

### Regras Absolutas de Design
- ❌ **Proibido:** Bordas `1px solid` para separação de seções
- ❌ **Proibido:** `border-radius` > `0.5rem`
- ❌ **Proibido:** Drop shadows tradicionais (usar tonal layering)
- ✅ Separar seções por mudança de `background-color` (surface hierarchy)
- ✅ Glassmorphism para navbars e overlays: `bg-white/80 backdrop-blur-[20px]`
- ✅ Gradient em CTAs primários: `bg-gradient-to-br from-primary to-primary-container`
- ✅ Tipografia: `Space Grotesk` para títulos, `Inter` para corpo
- ✅ Letter-spacing negativo em headlines: `tracking-tight` ou `-0.02em`

### Componentes Chave
- **Vibe Chip:** badge `bg-primary text-on-primary` para "Esgotado", "Vendendo Rápido", "Final"
- **Seat Map:** `bg-surface-dim` para indisponível, `bg-primary` para selecionado
- **Ghost Border (inputs):** `border border-outline-variant focus:border-primary`

---

## 9. Domínio — Entidades Principais

```go
// Simplificado — ver /internal/domain/entity para implementações completas

type Event struct {
  ID              uuid.UUID
  Title           string
  Sport           SportType   // FOOTBALL, BASKETBALL, VOLLEYBALL, etc.
  League          string      // "Serie A", "Serie B", "NBB", "Superliga"
  Venue           Venue
  StartsAt        time.Time
  Status          EventStatus // DRAFT, ON_SALE, SOLD_OUT, CANCELLED
  ServiceFeePercent float64
}

type Seat struct {
  ID        uuid.UUID
  EventID   uuid.UUID
  Section   string
  Row       string
  Number    string
  PriceCents int64
  Status    SeatStatus  // AVAILABLE, RESERVED, SOLD, BLOCKED
}

type Reservation struct {
  ID        uuid.UUID
  SeatID    uuid.UUID
  UserID    uuid.UUID
  ExpiresAt time.Time
  Status    ReservationStatus // ACTIVE, EXPIRED, CONVERTED
}

type Order struct {
  ID              uuid.UUID
  UserID          uuid.UUID
  ReservationIDs  []uuid.UUID
  TotalCents      int64
  StripePaymentID string
  Status          OrderStatus // PENDING, PAID, FAILED, REFUNDED
}
```

---

## 10. API — Rotas Principais

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
DELETE /auth/logout

GET    /events?sport=&league=&city=&date=
GET    /events/:id
GET    /events/:id/seats          ← mapa de assentos em tempo real

POST   /reservations              ← tenta adquirir lock (10min)
DELETE /reservations/:id          ← libera lock manualmente

POST   /orders                    ← cria PaymentIntent + Order
GET    /orders/:id
POST   /orders/webhook            ← Stripe webhook (sem auth JWT)

GET    /me/tickets                ← ingressos do usuário
GET    /me/tickets/:id/qr         ← QR code do ingresso

// Admin / Organizador
POST   /admin/events
PUT    /admin/events/:id
POST   /admin/events/:id/seats/batch
```

---

## 11. Banco de Dados — Convenções

- UUIDs para todas as PKs (`gen_random_uuid()`)
- `created_at` / `updated_at` em todas as tabelas (`DEFAULT NOW()`, trigger para updated_at)
- Soft delete com `deleted_at TIMESTAMP` (nunca deletar registros de ingresso)
- Indexes obrigatórios: `seats(event_id, status)`, `reservations(seat_id, status, expires_at)`
- **CPF** armazenado em hash (LGPD) — nunca em plaintext
- Moeda sempre em **centavos** (`INT8`) — nunca `FLOAT`

---

## 12. Estrutura de Pastas — Projeto Completo

```
catraca/
├── backend/
│   ├── cmd/api/main.go
│   ├── internal/
│   │   ├── domain/
│   │   ├── usecase/
│   │   ├── infra/
│   │   ├── handler/
│   │   └── worker/
│   ├── migrations/
│   ├── test/
│   ├── Makefile
│   ├── go.mod
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/              ← App Router (Next.js)
│   │   ├── components/
│   │   │   ├── ui/           ← Primitivos (Button, Badge, Input)
│   │   │   └── features/     ← SeatMap, EventCard, CheckoutFlow
│   │   ├── hooks/
│   │   ├── lib/              ← api client, stripe, utils
│   │   └── styles/
│   ├── tailwind.config.ts
│   └── Dockerfile
│
├── docker-compose.yml        ← postgres + redis + backend + frontend
└── CLAUDE.md                 ← este arquivo
```

---

## 13. Makefile — Comandos Úteis (Backend)

```makefile
make run          # sobe o servidor
make test         # roda todos os testes com -race
make test/unit    # apenas unit tests
make test/int     # integration tests (requer Docker)
make mock         # regenera mocks com mockery
make migrate/up   # roda migrations pendentes
make migrate/down # reverte última migration
make sqlc         # regenera código sqlc
make lint         # golangci-lint
```

---

## 14. Variáveis de Ambiente

```env
# Backend
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_SECRET=
JWT_REFRESH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
APP_ENV=development|production
PORT=8080

# Frontend (local — Next em :3000, API Go em :8080)
# O browser deve chamar a API via proxy /api no Next (Route Handler, mesmo host), senão o cookie
# refresh_token fica no host da API e o middleware do Next redireciona /tickets para /login.
NEXT_PUBLIC_API_URL=http://localhost:3000/api
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Frontend (produção — exemplo Railway)
# NEXT_PUBLIC_API_URL=https://seu-frontend.up.railway.app/api
# BACKEND_URL=http://nome-interno-do-servico-go.railway.internal:8080
```

**Auth / cookies:** `NEXT_PUBLIC_API_URL` **não** deve ser a URL pública direta do backend em produção. Use `{origem do frontend}/api`; o handler em `frontend/src/app/api/[[...path]]/route.ts` encaminha para o Go usando `BACKEND_URL`. Depois de corrigir isso no deploy, usuários precisam **entrar de novo** uma vez para o `refresh_token` ser gravado no host certo.

---

## 15. Regras para o Claude

- **Sempre** escrever testes antes da implementação (TDD).
- **Nunca** colocar lógica de negócio em handlers HTTP — ela pertence aos use cases.
- **Nunca** importar `infra` dentro de `usecase` ou `domain`.
- Quando criar um novo use case, criar também a interface de repositório necessária.
- Ao adicionar uma rota, adicionar também o middleware de autenticação se necessário.
- Comentários em inglês no código Go, documentação e commits em português é opcional — manter consistência.
- Ao modificar o schema do banco, sempre gerar uma nova migration numerada, nunca editar migrations existentes.
- O campo `status` de `Seat` é a **fonte da verdade** no banco. O Redis é cache de lock — pode expirar. O banco nunca mente.