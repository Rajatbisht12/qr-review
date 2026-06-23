import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import { getRequestOrigin } from "@/lib/qr";
import CreateTenantForm from "./CreateTenantForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/login");

  // Derive the live host so onboarding shows the real domain (Vercel/custom/localhost).
  const routingMode = process.env.NEXT_PUBLIC_TENANT_ROUTING || "path";
  const host = (await getRequestOrigin()).replace(/^https?:\/\//, "");
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || host;
  const period = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      _count: { select: { feedback: true } },
      usage: { where: { period } },
    },
  });

  const totals = {
    tenants: tenants.length,
    active: tenants.filter((t) => t.status === "active").length,
    scans: tenants.reduce((s, t) => s + (t.usage[0]?.scans ?? 0), 0),
    alerts: tenants.reduce((s, t) => s + (t.usage[0]?.alerts ?? 0), 0),
  };

  return (
    <main className="warm-page">
      <header className="warm-header sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="warm-eyebrow">Admin console</p>
            <h1 className="font-serif text-xl tracking-tight text-[var(--brand-primary)]">
              ReviewLoop
            </h1>
          </div>
          <LogoutButton redirectTo="/admin/login" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-5 py-8">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tenants", value: totals.tenants },
            { label: "Active", value: totals.active },
            { label: `Scans (${period})`, value: totals.scans },
            { label: `Alerts (${period})`, value: totals.alerts },
          ].map((s) => (
            <div key={s.label} className="warm-stat p-4">
              <p className="warm-eyebrow">{s.label}</p>
              <p className="font-serif mt-1 text-3xl text-[var(--ink)]">{s.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="warm-eyebrow">Tenants</h2>
          </div>
          <CreateTenantForm mode={routingMode} host={host} rootDomain={rootDomain} />

          <div className="warm-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="warm-eyebrow border-b border-[#ebdfcb] bg-[#faf4e8] text-left">
                <tr>
                  <th className="px-4 py-3 font-bold">Business</th>
                  <th className="px-4 py-3 font-bold">Subdomain</th>
                  <th className="px-4 py-3 font-bold">Plan</th>
                  <th className="px-4 py-3 font-bold">Usage</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e7d6]">
                {tenants.map((t) => {
                  const usage = t.usage[0];
                  const quota = usage?.quota ?? t.plan?.monthlyQuota ?? 0;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                        {t.businessName}
                      </td>
                      <td className="warm-muted px-4 py-3">{t.subdomain}</td>
                      <td className="warm-muted px-4 py-3">{t.plan?.name ?? "—"}</td>
                      <td className="warm-muted px-4 py-3">
                        {(usage?.scans ?? 0) + (usage?.alerts ?? 0)}
                        {quota ? ` / ${quota}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`warm-pill ${
                            t.status === "active" ? "warm-pill-on" : "warm-pill-off"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/tenants/${t.subdomain}`} className="warm-link">
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="warm-muted px-4 py-8 text-center">
                      No tenants yet. Create your first one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
