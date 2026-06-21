"use server";

import { prisma } from "@/lib/db";
import { trackEvent, incrementUsage } from "@/lib/analytics";
import { sendWhatsAppAlert } from "@/lib/whatsapp";

/** Record a funnel event from the customer page (scan, rating, google_cta_click). */
export async function recordEvent(
  subdomain: string,
  type: "scan" | "rating" | "google_cta_click",
  rating?: number,
) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: subdomain.toLowerCase() },
    select: { id: true, status: true },
  });
  if (!tenant || tenant.status !== "active") return;
  await trackEvent(tenant.id, type, rating);
  if (type === "scan") await incrementUsage(tenant.id, "scans");
}

export type FeedbackInput = {
  subdomain: string;
  rating: number;
  feedbackText?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

/**
 * Store private feedback and fire WhatsApp alerts where configured (PRD 6.3, 6.5).
 * This NEVER stores any "review to paste" — only the customer's own private note.
 */
export async function submitFeedback(input: FeedbackInput) {
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: input.subdomain.toLowerCase() },
    include: { contacts: true },
  });
  if (!tenant || tenant.status !== "active") {
    return { ok: false as const, error: "Business not found." };
  }

  const feedback = await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      rating,
      feedbackText: input.feedbackText?.trim() || null,
      contactName: input.contactName?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      channel: "qr",
    },
  });

  await trackEvent(tenant.id, "private_submit", rating);

  // Decide whether to alert each manager contact, per their preferences.
  for (const contact of tenant.contacts) {
    const lowRating = rating <= contact.alertThreshold;
    const hasNote = Boolean(input.feedbackText?.trim());
    const shouldAlert = lowRating || (contact.alertOnAnyPrivate && hasNote);
    if (!shouldAlert) continue;

    const result = await sendWhatsAppAlert(contact.whatsappNumber, {
      tenantName: tenant.businessName,
      rating,
      feedbackText: input.feedbackText?.trim() || null,
      contact: {
        name: input.contactName,
        phone: input.contactPhone,
        email: input.contactEmail,
      },
      createdAt: feedback.createdAt,
    });

    await prisma.alertLog.create({
      data: {
        tenantId: tenant.id,
        feedbackId: feedback.id,
        channel: "whatsapp",
        status: result.status,
        error: result.error,
        payload: JSON.stringify({ to: contact.whatsappNumber, rating }),
      },
    });
    if (result.status === "sent") await incrementUsage(tenant.id, "alerts");
  }

  return { ok: true as const };
}
