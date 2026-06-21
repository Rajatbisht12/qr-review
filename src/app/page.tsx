import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenants = await prisma.tenant.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-indigo-600">ReviewLoop</span>
          <Link
            href="/admin"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Admin console
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Multi-tenant SaaS
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          More genuine Google reviews. Problems caught early.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          A QR standee at the counter sends customers to a branded page on their own phone. They
          share a public Google review in their own words, or send private feedback straight to the
          manager — who gets a real-time WhatsApp alert. Fully compliant with Google&apos;s review
          policy and the FTC reviews rule: <strong>no gating, no fake text, no incentives.</strong>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Open admin console →
          </Link>
        </div>

        <div className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Live demo tenants
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Each business gets its own subdomain. Locally these open at{" "}
            <code className="rounded bg-slate-100 px-1">sub.localhost:3000</code> or the canonical{" "}
            <code className="rounded bg-slate-100 px-1">/s/sub</code> path.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.length === 0 && (
              <p className="text-slate-500">No tenants yet — create one in the admin console.</p>
            )}
            {tenants.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="font-semibold text-slate-900">{t.businessName}</p>
                <p className="text-sm capitalize text-slate-500">{t.category}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Link
                    href={`/s/${t.subdomain}`}
                    className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
                  >
                    Customer page
                  </Link>
                  <Link
                    href={`/s/${t.subdomain}/manage`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Manager view
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        ReviewLoop · Compliant feedback &amp; review collection · Not legal advice.
      </footer>
    </main>
  );
}
