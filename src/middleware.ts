import { NextRequest, NextResponse } from "next/server";

/**
 * Host-based multi-tenant routing (PRD 6.1).
 *
 * A request to `pizzapalace.yourdomain.com/` is internally rewritten to
 * `/s/pizzapalace` (the customer-facing tenant page), and `/manage` to
 * `/s/pizzapalace/manage`. The browser URL stays clean.
 *
 * The bare root domain and reserved hosts (admin/app/www) pass through
 * unchanged so /admin and the marketing page work normally.
 *
 * Locally, `pizzapalace.localhost:3000` works in modern browsers, and you can
 * also hit the canonical path `localhost:3000/s/pizzapalace` directly.
 */
const RESERVED = new Set(["www", "admin", "app", "api", "dashboard", "localhost"]);

function getSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const parts = hostname.split(".");

  if (hostname.endsWith("localhost")) {
    return parts.length >= 2 && parts[0] !== "localhost" ? parts[0] : null;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  if (parts.length >= 3) {
    const sub = parts[0];
    return RESERVED.has(sub) ? null : sub;
  }
  return null;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const sub = getSubdomain(req.headers.get("host"));

  // No tenant subdomain → serve the platform (marketing, /admin, etc.) as-is.
  if (!sub) return NextResponse.next();

  // Already pointing at the canonical tenant path — leave it.
  if (url.pathname.startsWith("/s/")) return NextResponse.next();

  // Rewrite tenant subdomain paths to the canonical /s/[subdomain] tree.
  const rewritten = url.clone();
  rewritten.pathname = `/s/${sub}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  // Skip Next internals and static assets.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|txt|xml)$).*)"],
};
