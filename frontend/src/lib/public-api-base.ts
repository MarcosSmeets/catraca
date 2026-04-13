/**
 * Base URL for API calls from the browser and from Next.js Server Components.
 * Default targets the local Next rewrite (/api → BACKEND_URL) so HttpOnly refresh_token
 * cookies are set on the same host as the app (required by middleware on /tickets, etc.).
 */
export const PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
