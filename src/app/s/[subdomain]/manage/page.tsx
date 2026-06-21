import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTenantBySubdomain } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTenantAnalytics } from "@/lib/analytics";
import FunnelStats from "@/components/FunnelStats";
import LogoutButton from "@/components/LogoutButton";
import { ResolveButton, WhatsAppSettings } from "./ManageClient";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) notFound();

  // Auth gate: manager of THIS tenant, or an admin.
  const session = await getSession();
  const authorized =
    session &&
    (session.role === "admin" ||
      (session.role === "manager" && session.tenantId === tenant.id));
  if (!authorized) redirect(`/s/${subdomain}/manage/login`);

  const [feedback, analytics] = await Promise.all([
    prisma.feedback.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getTenantAnalytics(tenant.id),
  ]);
  const contact = tenant.contacts[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm text-slate-400">Manager dashboard</p>
            <h1 className="text-lg font-bold text-slate-900">{tenant.businessName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/s/${subdomain}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              View customer page
            </Link>
            <LogoutButton redirectTo={`/s/${subdomain}/manage/login`} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-5 py-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Review funnel
          </h2>
          <FunnelStats a={analytics} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Private feedback inbox ({feedback.length})
          </h2>
          <div className="space-y-3">
            {feedback.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400">
                No feedback yet.
              </p>
            )}
            {feedback.map((f) => (
              <div
                key={f.id}
                className={`rounded-xl border bg-white p-4 ${
                  f.resolvedAt ? "border-slate-200 opacity-70" : "border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-lg" style={{ letterSpacing: 1 }}>
                      {"★".repeat(f.rating)}
                      <span className="text-slate-300">{"★".repeat(5 - f.rating)}</span>
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {f.createdAt.toLocaleString()}
                    </span>
                  </div>
                  <ResolveButton
                    feedbackId={f.id}
                    subdomain={subdomain}
                    resolved={Boolean(f.resolvedAt)}
                  />
                </div>
                {f.feedbackText && (
                  <p className="mt-2 text-sm text-slate-700">{f.feedbackText}</p>
                )}
                {(f.contactName || f.contactPhone || f.contactEmail) && (
                  <p className="mt-2 text-xs text-slate-400">
                    Contact: {[f.contactName, f.contactPhone, f.contactEmail].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {contact && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Alert settings
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <WhatsAppSettings
                contactId={contact.id}
                subdomain={subdomain}
                whatsappNumber={contact.whatsappNumber}
                alertThreshold={contact.alertThreshold}
                alertOnAnyPrivate={contact.alertOnAnyPrivate}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
