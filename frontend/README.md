# Catraca — Frontend

Next.js (App Router) app for the Catraca ticket marketplace.

## Getting started

1. Copy environment template and adjust if needed:

   ```bash
   cp .env.example .env.local
   ```

   - **`NEXT_PUBLIC_API_URL`**: must be the **same origin** as this app plus `/api` (e.g. `http://localhost:3000/api` in dev). The browser hits Next; [`app/api/[[...path]]/route.ts`](src/app/api/[[...path]]/route.ts) proxies to Go (`BACKEND_URL`) and forwards `Set-Cookie` so `refresh_token` is stored on the frontend host and middleware allows `/tickets`, `/cart`, etc.
   - **`BACKEND_URL`**: direct URL of the Go API (e.g. `http://localhost:8080`) — server-side only.

2. Run the Go API (see repo root / `backend`) on the port matching `BACKEND_URL`.

3. Start Next:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Production (e.g. Railway)

Set on the **frontend** service:

- `NEXT_PUBLIC_API_URL` = `https://<your-frontend-host>/api` (no trailing slash)
- `BACKEND_URL` = internal URL of the Go service (e.g. `http://<service>.railway.internal:8080`)

After changing this, users should sign in once again so `refresh_token` is issued on the correct host. See root [CLAUDE.md](../CLAUDE.md) §14 for the full env picture.
