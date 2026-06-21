import { NextRequest, NextResponse } from "next/server";

/**
 * Host-based multi-tenant routing (PRD 6.1).
 *
 * A request to `pizzapalace.yourdomain.com/` is internally rewritten to
 * `/s/pizzapalace` (the customer-facing tenant page), and `/manage` to
 * `/s/pizzapalace/manage`. The browser URL stays clean.
 *
 * IMPORTANT — two safety rules so platform hosts are never mistaken for tenants:
 *  1. Routing only runs in "subdomain" mode (NEXT_PUBLIC_TENANT_ROUTING). On Vercel's
 *     shared domain we use "path" mode, so this middleware passes everything through and
 *     tenants are reached at /s/<tenant>. (A bare host like `my-app.vercel.app` must NOT
 *     be parsed as the tenant `my-app`.)
 *  2. Even in subdomain mode, a subdomain is only extracted when the host is genuinely a
 *     sub-host of the configured NEXT_PUBLIC_ROOT_DOMAIN (or a *.localhost dev host).
 */
const RESERVED = new Set(["www", "admin", "app", "api", "dashboard", "localhost"]);

function getSubdomain(host: string | null, rootDomain: string): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const root = rootDomain.split(":")[0].toLowerCase();

  // Local dev: `sub.localhost`
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");
    return parts.length >= 2 && parts[0] !== "localhost" ? parts[0] : null;
  }

  // IP address — never a subdomain.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

  // The bare root domain itself (e.g. yourdomain.com) → no tenant.
  if (!root || hostname === root) return null;

  // Only treat as a tenant when the host is `<something>.<root>`.
  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1)).split(".")[0];
    return RESERVED.has(sub) ? null : sub;
  }

  // Unknown host (e.g. a *.vercel.app preview not matching root) → no tenant.
  return null;
}

export function middleware(req: NextRequest) {
  const mode = process.env.NEXT_PUBLIC_TENANT_ROUTING || "subdomain";
  // In path mode, tenants live at /s/<tenant>; never rewrite based on host.
  if (mode !== "subdomain") return NextResponse.next();

  const url = req.nextUrl;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
  const sub = getSubdomain(req.headers.get("host"), rootDomain);

  if (!sub) return NextResponse.next();
  if (url.pathname.startsWith("/s/")) return NextResponse.next();

  const rewritten = url.clone();
  rewritten.pathname = `/s/${sub}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  // Skip Next internals and static assets.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|txt|xml)$).*)"],
};
