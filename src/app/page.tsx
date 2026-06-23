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
    <main className="warm-page">
      <header className="warm-header sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-serif text-xl tracking-tight text-[var(--brand-primary)]">
            ReviewLoop
          </span>
          <Link href="/admin" className="warm-btn">
            Admin console
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="warm-eyebrow text-[var(--brand-primary)]">Multi-tenant SaaS</p>
        <h1 className="font-serif mt-3 max-w-2xl text-4xl leading-tight tracking-tight text-[var(--ink)] sm:text-5xl">
          More genuine Google reviews. Problems caught early.
        </h1>
        <p className="warm-muted mt-5 max-w-2xl text-lg leading-relaxed">
          A QR standee at the counter sends customers to a branded page on their own phone. They
          share a public Google review in their own words, or send private feedback straight to the
          manager — who gets a real-time WhatsApp alert. Fully compliant with Google&apos;s review
          policy and the FTC reviews rule:{" "}
          <strong className="text-[var(--ink)]">no gating, no fake text, no incentives.</strong>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/admin" className="warm-btn">
            Open admin console →
          </Link>
        </div>

        <div className="mt-16">
          <h2 className="warm-eyebrow">Live demo tenants</h2>
          <p className="warm-muted mt-1.5 text-sm">
            Each business gets its own subdomain. Locally these open at{" "}
            <code className="rounded bg-[#efe7d9] px-1 text-[var(--ink)]">sub.localhost:3000</code>{" "}
            or the canonical{" "}
            <code className="rounded bg-[#efe7d9] px-1 text-[var(--ink)]">/s/sub</code> path.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.length === 0 && (
              <p className="warm-muted">No tenants yet — create one in the admin console.</p>
            )}
            {tenants.map((t) => (
              <div key={t.id} className="warm-card p-5">
                <p className="font-serif text-lg text-[var(--ink)]">{t.businessName}</p>
                <p className="warm-muted text-sm capitalize">{t.category}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Link href={`/s/${t.subdomain}`} className="warm-btn px-3 py-1.5 text-[13px]">
                    Customer page
                  </Link>
                  <Link
                    href={`/s/${t.subdomain}/manage`}
                    className="warm-btn-ghost px-3 py-1.5 text-[13px]"
                  >
                    Manager view
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="warm-muted border-t border-[#e7dcc8] py-8 text-center text-sm">
        ReviewLoop · Compliant feedback &amp; review collection · Not legal advice.
      </footer>
    </main>
  );
}
