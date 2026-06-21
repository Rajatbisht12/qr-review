import "server-only";

/**
 * WhatsApp alert delivery (PRD 6.5).
 *
 * Provider abstraction so the rest of the app never cares which BSP is used.
 * - "log"  (default): prints the alert to the server console. Zero config; great for dev.
 * - "meta": sends via the WhatsApp Business Cloud API (Meta). Fill env vars in .env.
 *
 * NOTE: Real WhatsApp Business messaging requires pre-approved message templates.
 * This sends a templated text message; adapt `buildMetaBody` to your approved template.
 */

export type AlertPayload = {
  tenantName: string;
  rating: number;
  feedbackText?: string | null;
  contact?: { name?: string | null; phone?: string | null; email?: string | null };
  createdAt: Date;
};

export type DeliveryResult = { status: "sent" | "failed"; error?: string };

function formatMessage(to: string, p: AlertPayload): string {
  const lines = [
    `🔔 New feedback for *${p.tenantName}*`,
    `Rating: ${"⭐".repeat(p.rating)} (${p.rating}/5)`,
  ];
  if (p.feedbackText) lines.push(`Note: ${p.feedbackText}`);
  const c = p.contact;
  if (c && (c.name || c.phone || c.email)) {
    lines.push(`Contact: ${[c.name, c.phone, c.email].filter(Boolean).join(" · ")}`);
  }
  lines.push(`Time: ${p.createdAt.toLocaleString()}`);
  return lines.join("\n");
}

async function sendViaMeta(to: string, p: AlertPayload): Promise<DeliveryResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    return { status: "failed", error: "Missing WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN" };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^\d]/g, ""),
        type: "text",
        text: { body: formatMessage(to, p) },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { status: "failed", error: `Meta API ${res.status}: ${err.slice(0, 300)}` };
    }
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function sendWhatsAppAlert(to: string, payload: AlertPayload): Promise<DeliveryResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || "log").toLowerCase();
  if (provider === "meta") return sendViaMeta(to, payload);

  // Default "log" provider — visible in the dev server console.
  // eslint-disable-next-line no-console
  console.log(
    `\n========== 📲 WHATSAPP ALERT (provider=log) ==========\n` +
      `TO: ${to}\n${formatMessage(to, payload)}\n` +
      `======================================================\n`,
  );
  return { status: "sent" };
}
