import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getTenantAnalytics } from "@/lib/analytics";
import { tenantPublicUrl, tenantQrDataUrl } from "@/lib/qr";
import FunnelStats from "@/components/FunnelStats";
import EditTenantForm from "./EditTenantForm";
import SampleReviewsManager from "./SampleReviewsManager";

export const dynamic = "force-dynamic";

export default async function TenantAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/login");

  // The [id] segment is the subdomain (admin links use it for readability).
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: id.toLowerCase() },
    include: {
      theme: true,
      contacts: true,
      plan: true,
      reviewTemplates: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!tenant) notFound();

  const [analytics, qr, publicUrl] = await Promise.all([
    getTenantAnalytics(tenant.id),
    tenantQrDataUrl(tenant.subdomain),
    tenantPublicUrl(tenant.subdomain),
  ]);
  const contact = tenant.contacts[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <Link href="/admin" className="text-sm text-indigo-600 hover:underline">
              ← All tenants
            </Link>
            <h1 className="text-lg font-bold text-slate-900">{tenant.businessName}</h1>
          </div>
          <Link
            href={`/s/${tenant.subdomain}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            View customer page
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-5 py-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Branding &amp; configuration
            </h2>
            <EditTenantForm
              tenant={{
                id: tenant.id,
                businessName: tenant.businessName,
                category: tenant.category,
                googleReviewUrl: tenant.googleReviewUrl,
                status: tenant.status,
                colorPrimary: tenant.theme?.colorPrimary ?? "#4f46e5",
                colorSecondary: tenant.theme?.colorSecondary ?? "#0ea5e9",
                logoUrl: tenant.theme?.logoUrl ?? "",
                welcomeMessage: tenant.theme?.welcomeMessage ?? "How was your visit?",
                whatsappNumber: contact?.whatsappNumber ?? "",
                alertThreshold: contact?.alertThreshold ?? 2,
                sampleReviewsEnabled: tenant.sampleReviewsEnabled,
                sampleReviewThreshold: tenant.sampleReviewThreshold,
              }}
            />

            <div className="mt-6">
              <SampleReviewsManager
                tenantId={tenant.id}
                subdomain={tenant.subdomain}
                templates={tenant.reviewTemplates.map((t) => ({ id: t.id, text: t.text }))}
              />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Standee QR
            </h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Tenant QR code" className="mx-auto h-44 w-44" />
              <p className="mt-3 break-all text-xs text-slate-400">{publicUrl}</p>
              <a
                href={qr}
                download={`${tenant.subdomain}-qr.png`}
                className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Download QR
              </a>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Analytics
          </h2>
          <FunnelStats a={analytics} />
        </section>
      </div>
    </main>
  );
}
