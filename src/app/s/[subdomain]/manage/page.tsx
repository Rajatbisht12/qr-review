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
    <main className="warm-page">
      <header className="warm-header sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <p className="warm-eyebrow">Manager dashboard</p>
            <h1 className="font-serif text-xl tracking-tight text-[var(--ink)]">
              {tenant.businessName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/s/${subdomain}`} className="warm-btn-ghost">
              View customer page
            </Link>
            <LogoutButton redirectTo={`/s/${subdomain}/manage/login`} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-5 py-8">
        <section>
          <h2 className="warm-eyebrow mb-3">Review funnel</h2>
          <FunnelStats a={analytics} />
        </section>

        <section>
          <h2 className="warm-eyebrow mb-3">Private feedback inbox ({feedback.length})</h2>
          <div className="space-y-3">
            {feedback.length === 0 && (
              <p className="warm-muted rounded-2xl border border-dashed border-[#d8c9af] p-6 text-center">
                No feedback yet.
              </p>
            )}
            {feedback.map((f) => (
              <div key={f.id} className={`warm-card p-4 ${f.resolvedAt ? "opacity-65" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-lg" style={{ letterSpacing: 1, color: "#e8a33d" }}>
                      {"★".repeat(f.rating)}
                      <span style={{ color: "#e0d4bf" }}>{"★".repeat(5 - f.rating)}</span>
                    </span>
                    <span className="warm-muted ml-2 text-xs">{f.createdAt.toLocaleString()}</span>
                  </div>
                  <ResolveButton
                    feedbackId={f.id}
                    subdomain={subdomain}
                    resolved={Boolean(f.resolvedAt)}
                  />
                </div>
                {f.feedbackText && (
                  <p className="mt-2 text-sm text-[#4a3b2c]">{f.feedbackText}</p>
                )}
                {(f.contactName || f.contactPhone || f.contactEmail) && (
                  <p className="warm-muted mt-2 text-xs">
                    Contact:{" "}
                    {[f.contactName, f.contactPhone, f.contactEmail].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {contact && (
          <section>
            <h2 className="warm-eyebrow mb-3">Alert settings</h2>
            <div className="warm-card p-5">
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
