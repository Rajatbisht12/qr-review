import "server-only";
import QRCode from "qrcode";
import { headers } from "next/headers";

/**
 * The origin (`proto://host`) of the current request, taken from the incoming headers.
 * This means generated links always match the domain the admin is actually on —
 * localhost in dev, the *.vercel.app host in the test deploy, or a custom domain later —
 * without depending on any env var being set.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const rawHost =
    h.get("x-forwarded-host") ||
    h.get("host") ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    "localhost:3000";
  const host = rawHost.split(",")[0].trim();
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Public customer URL for a tenant.
 *
 * Defaults to PATH routing (`https://<host>/s/<tenant>`), which works everywhere
 * including *.vercel.app where wildcard subdomains aren't available. Set
 * NEXT_PUBLIC_TENANT_ROUTING="subdomain" (+ NEXT_PUBLIC_ROOT_DOMAIN) only when you
 * have a custom domain with wildcard DNS.
 */
export async function tenantPublicUrl(subdomain: string): Promise<string> {
  const mode = process.env.NEXT_PUBLIC_TENANT_ROUTING || "path";
  if (mode === "subdomain") {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    if (root) {
      const proto = root.includes("localhost") || root.startsWith("127.") ? "http" : "https";
      return `${proto}://${subdomain}.${root}`;
    }
  }
  const origin = await getRequestOrigin();
  return `${origin}/s/${subdomain}`;
}

/** Generate a PNG data URL QR code that points at the tenant's customer page. */
export async function tenantQrDataUrl(subdomain: string): Promise<string> {
  const url = await tenantPublicUrl(subdomain);
  return QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" });
}
