"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** Ensure the caller is a manager (or admin) authorised for this tenant. */
async function authorizeForTenant(tenantId: string) {
  const session = await getSession();
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.role === "manager" && session.tenantId === tenantId;
}

export async function resolveFeedback(feedbackId: string, subdomain: string) {
  const fb = await prisma.feedback.findUnique({ where: { id: feedbackId } });
  if (!fb) return;
  if (!(await authorizeForTenant(fb.tenantId))) return;

  await prisma.feedback.update({
    where: { id: feedbackId },
    data: { resolvedAt: fb.resolvedAt ? null : new Date() }, // toggle
  });
  revalidatePath(`/s/${subdomain}/manage`);
}

export async function updateWhatsApp(
  contactId: string,
  subdomain: string,
  whatsappNumber: string,
  alertThreshold: number,
  alertOnAnyPrivate: boolean,
) {
  const contact = await prisma.managerContact.findUnique({ where: { id: contactId } });
  if (!contact) return;
  if (!(await authorizeForTenant(contact.tenantId))) return;

  await prisma.managerContact.update({
    where: { id: contactId },
    data: {
      whatsappNumber: whatsappNumber.trim(),
      alertThreshold: Math.max(1, Math.min(5, alertThreshold)),
      alertOnAnyPrivate,
    },
  });
  revalidatePath(`/s/${subdomain}/manage`);
}
