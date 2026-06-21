import "server-only";
import QRCode from "qrcode";

/**
 * Build the public customer URL for a tenant.
 *
 * Routing mode is controlled by NEXT_PUBLIC_TENANT_ROUTING:
 *  - "subdomain" (default): `https://sub.rootdomain` — needs wildcard DNS + a custom domain.
 *  - "path": `https://rootdomain/s/sub` — works anywhere, incl. *.vercel.app where wildcard
 *    subdomains are NOT available. Use this for Vercel test deploys.
 */
export function tenantPublicUrl(subdomain: string): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const isLocal = root.includes("localhost") || root.startsWith("127.");
  const protocol = isLocal ? "http" : "https";
  const mode = process.env.NEXT_PUBLIC_TENANT_ROUTING || "subdomain";
  if (mode === "path") return `${protocol}://${root}/s/${subdomain}`;
  return `${protocol}://${subdomain}.${root}`;
}

/** Generate a PNG data URL QR code that points at the tenant's customer page. */
export async function tenantQrDataUrl(subdomain: string): Promise<string> {
  const url = tenantPublicUrl(subdomain);
  return QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" });
}
