"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { validateSubdomain } from "@/lib/tenant";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

/** Create a fully branded tenant — live within seconds, no deploy (PRD 6.1/6.2). */
export async function createTenant(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();

  const subdomain = String(formData.get("subdomain") ?? "").toLowerCase().trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const category = String(formData.get("category") ?? "restaurant");
  const googleReviewUrl = String(formData.get("googleReviewUrl") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();
  const colorPrimary = String(formData.get("colorPrimary") ?? "#4f46e5");
  const colorSecondary = String(formData.get("colorSecondary") ?? "#0ea5e9");

  if (!businessName) return { error: "Business name is required." };
  const subErr = validateSubdomain(subdomain);
  if (subErr) return { error: subErr };

  const exists = await prisma.tenant.findUnique({ where: { subdomain } });
  if (exists) return { error: "That subdomain is already taken." };

  await prisma.tenant.create({
    data: {
      subdomain,
      businessName,
      category,
      googleReviewUrl,
      theme: {
        create: {
          colorPrimary,
          colorSecondary,
          welcomeMessage: `How was your visit to ${businessName}?`,
        },
      },
      contacts: whatsappNumber
        ? { create: { name: "Manager", whatsappNumber, alertThreshold: 2 } }
        : undefined,
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/tenants/${subdomain}`);
}

export async function updateTenant(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const businessName = String(formData.get("businessName") ?? "").trim();
  const category = String(formData.get("category") ?? "restaurant");
  const googleReviewUrl = String(formData.get("googleReviewUrl") ?? "").trim();
  const status = String(formData.get("status") ?? "active");
  const colorPrimary = String(formData.get("colorPrimary") ?? "#4f46e5");
  const colorSecondary = String(formData.get("colorSecondary") ?? "#0ea5e9");
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();
  const alertThreshold = Number(formData.get("alertThreshold") ?? 2);
  const sampleReviewsEnabled = formData.get("sampleReviewsEnabled") === "on";
  const sampleReviewThreshold = Number(formData.get("sampleReviewThreshold") ?? 3);

  if (!businessName) return { error: "Business name is required." };

  const tenant = await prisma.tenant.findUnique({ where: { id }, include: { contacts: true } });
  if (!tenant) return { error: "Tenant not found." };

  await prisma.tenant.update({
    where: { id },
    data: {
      businessName,
      category,
      googleReviewUrl,
      status,
      sampleReviewsEnabled,
      sampleReviewThreshold: Math.max(1, Math.min(5, sampleReviewThreshold)),
      theme: {
        upsert: {
          create: { colorPrimary, colorSecondary, logoUrl: logoUrl || null, welcomeMessage },
          update: { colorPrimary, colorSecondary, logoUrl: logoUrl || null, welcomeMessage },
        },
      },
    },
  });

  // Update or create the primary manager contact.
  if (whatsappNumber) {
    const existing = tenant.contacts[0];
    if (existing) {
      await prisma.managerContact.update({
        where: { id: existing.id },
        data: { whatsappNumber, alertThreshold: Math.max(1, Math.min(5, alertThreshold)) },
      });
    } else {
      await prisma.managerContact.create({
        data: { tenantId: id, whatsappNumber, alertThreshold },
      });
    }
  }

  revalidatePath(`/admin/tenants/${tenant.subdomain}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setTenantStatus(id: string, status: "active" | "suspended") {
  await requireAdmin();
  await prisma.tenant.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
}

/** ⚠️ Add a pre-written sample review (owner-authored). See compliance note in schema. */
export async function addReviewTemplate(tenantId: string, subdomain: string, text: string) {
  await requireAdmin();
  const clean = text.trim();
  if (!clean) return;
  const count = await prisma.reviewTemplate.count({ where: { tenantId } });
  await prisma.reviewTemplate.create({
    data: { tenantId, text: clean, sortOrder: count },
  });
  revalidatePath(`/admin/tenants/${subdomain}`);
}

export async function deleteReviewTemplate(templateId: string, subdomain: string) {
  await requireAdmin();
  await prisma.reviewTemplate.delete({ where: { id: templateId } });
  revalidatePath(`/admin/tenants/${subdomain}`);
}
