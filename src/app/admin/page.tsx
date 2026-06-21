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
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm text-slate-400">Admin console</p>
            <h1 className="text-lg font-bold text-indigo-600">ReviewLoop</h1>
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
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Tenants
            </h2>
          </div>
          <CreateTenantForm mode={routingMode} host={host} rootDomain={rootDomain} />

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Subdomain</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => {
                  const usage = t.usage[0];
                  const quota = usage?.quota ?? t.plan?.monthlyQuota ?? 0;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{t.businessName}</td>
                      <td className="px-4 py-3 text-slate-500">{t.subdomain}</td>
                      <td className="px-4 py-3 text-slate-500">{t.plan?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {(usage?.scans ?? 0) + (usage?.alerts ?? 0)}
                        {quota ? ` / ${quota}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/tenants/${t.subdomain}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
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
