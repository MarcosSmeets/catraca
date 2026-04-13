import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP_RESPONSE = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const REQUEST_FORWARD_ALLOWLIST = new Set([
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "if-match",
  "if-none-match",
  "user-agent",
]);

function backendBase(): string {
  const base = process.env.BACKEND_URL ?? "http://localhost:8080";
  return base.replace(/\/$/, "");
}

function buildTargetUrl(pathSegments: string[] | undefined, search: string): string {
  const path = (pathSegments ?? []).join("/");
  const suffix = path ? `/${path}` : "";
  return `${backendBase()}${suffix}${search}`;
}

function forwardRequestHeaders(request: NextRequest): Headers {
  const out = new Headers();
  for (const [key, value] of request.headers) {
    if (REQUEST_FORWARD_ALLOWLIST.has(key.toLowerCase())) {
      out.set(key, value);
    }
  }
  return out;
}

function proxyResponse(upstream: Response): NextResponse {
  const headers = new Headers();

  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    headers.append("set-cookie", cookie);
  }

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie") return;
    if (HOP_BY_HOP_RESPONSE.has(lower)) return;
    headers.append(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function proxy(request: NextRequest, path: string[] | undefined) {
  const target = buildTargetUrl(path, request.nextUrl.search);
  const forwardHeaders = forwardRequestHeaders(request);

  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: forwardHeaders,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
    Object.assign(init, { duplex: "half" as const });
  }

  try {
    const upstream = await fetch(target, init);
    return proxyResponse(upstream);
  } catch {
    return NextResponse.json(
      { message: "upstream unreachable" },
      { status: 502 }
    );
  }
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function HEAD(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function OPTIONS(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}
