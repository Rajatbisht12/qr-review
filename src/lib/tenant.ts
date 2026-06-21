import { prisma } from "./db";

/** Words that are never tenant subdomains (reserved for the platform itself). */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "app",
  "api",
  "dashboard",
  "mail",
  "static",
  "assets",
  "localhost",
]);

/**
 * Extract a tenant subdomain from a host header.
 * Works for `pizzapalace.yourdomain.com`, `pizzapalace.localhost:3000`,
 * and returns null for the bare root domain.
 */
export function subdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase(); // strip port
  const parts = hostname.split(".");

  // localhost case: `sub.localhost`
  if (hostname.endsWith("localhost")) {
    if (parts.length >= 2 && parts[0] !== "localhost") return parts[0];
    return null;
  }

  // IP address — no subdomain.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

  // Domain case: need at least sub.domain.tld (3 labels).
  if (parts.length >= 3) {
    const sub = parts[0];
    if (RESERVED_SUBDOMAINS.has(sub)) return null;
    return sub;
  }
  return null;
}

/** Fetch a tenant + theme + contacts by subdomain. Returns null if missing/suspended. */
export async function getTenantBySubdomain(subdomain: string) {
  return prisma.tenant.findUnique({
    where: { subdomain: subdomain.toLowerCase() },
    include: {
      theme: true,
      contacts: true,
      reviewTemplates: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Validate a candidate subdomain string. Returns an error message or null if valid. */
export function validateSubdomain(value: string): string | null {
  const v = value.toLowerCase().trim();
  if (!/^[a-z0-9-]{3,40}$/.test(v)) {
    return "Use 3–40 chars: lowercase letters, numbers, hyphens.";
  }
  if (v.startsWith("-") || v.endsWith("-")) return "Cannot start or end with a hyphen.";
  if (RESERVED_SUBDOMAINS.has(v)) return "That subdomain is reserved.";
  return null;
}
