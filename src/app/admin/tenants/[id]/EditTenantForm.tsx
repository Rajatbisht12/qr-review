"use client";

import { useActionState, useState } from "react";
import { updateTenant } from "../../actions";

type Tenant = {
  id: string;
  businessName: string;
  category: string;
  googleReviewUrl: string;
  status: string;
  colorPrimary: string;
  colorSecondary: string;
  logoUrl: string;
  welcomeMessage: string;
  whatsappNumber: string;
  alertThreshold: number;
  sampleReviewsEnabled: boolean;
  sampleReviewThreshold: number;
};

export default function EditTenantForm({ tenant }: { tenant: Tenant }) {
  const [state, action, pending] = useActionState(updateTenant, {});

  // Local state powers the live preview (PRD 6.2 — preview before publish).
  const [businessName, setBusinessName] = useState(tenant.businessName);
  const [colorPrimary, setColorPrimary] = useState(tenant.colorPrimary);
  const [welcomeMessage, setWelcomeMessage] = useState(tenant.welcomeMessage);
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form action={action} className="warm-card p-6">
        <input type="hidden" name="id" value={tenant.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="warm-label">Business name</label>
            <input
              name="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="warm-input mt-1.5"
            />
          </div>
          <div>
            <label className="warm-label">Category</label>
            <select name="category" defaultValue={tenant.category} className="warm-select mt-1.5">
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café</option>
              <option value="salon">Salon</option>
              <option value="retail">Retail</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="warm-label">Google review URL</label>
            <input
              name="googleReviewUrl"
              defaultValue={tenant.googleReviewUrl}
              placeholder="https://search.google.com/local/writereview?placeid=…"
              className="warm-input mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="warm-label">Welcome message</label>
            <input
              name="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="warm-input mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="warm-label">Logo URL (optional)</label>
            <input
              name="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              className="warm-input mt-1.5"
            />
          </div>
          <div>
            <label className="warm-label">Primary colour</label>
            <input
              name="colorPrimary"
              type="color"
              value={colorPrimary}
              onChange={(e) => setColorPrimary(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#e6dac6]"
            />
          </div>
          <div>
            <label className="warm-label">Secondary colour</label>
            <input
              name="colorSecondary"
              type="color"
              defaultValue={tenant.colorSecondary}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#e6dac6]"
            />
          </div>
          <div>
            <label className="warm-label">Manager WhatsApp</label>
            <input
              name="whatsappNumber"
              defaultValue={tenant.whatsappNumber}
              placeholder="+91…"
              className="warm-input mt-1.5"
            />
          </div>
          <div>
            <label className="warm-label">Alert when rating ≤</label>
            <select
              name="alertThreshold"
              defaultValue={String(tenant.alertThreshold)}
              className="warm-select mt-1.5"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="warm-label">Status</label>
            <select name="status" defaultValue={tenant.status} className="warm-select mt-1.5">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* ⚠️ Opt-in sample-review feature (compliance risk — see warning below). */}
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="sampleReviewsEnabled"
              defaultChecked={tenant.sampleReviewsEnabled}
              className="mt-1 accent-[var(--brand-primary)]"
            />
            <span>
              <span className="text-sm font-semibold text-slate-800">
                Show copy-paste sample reviews to happy customers
              </span>
              <span className="mt-1 block text-xs text-amber-800">
                ⚠️ Compliance risk: pre-written reviews customers paste as their own can breach the
                FTC fake-review rule (16 CFR §465) and Google&apos;s content policy, risking
                penalties and listing removal. Enable only if this business accepts that risk.
              </span>
            </span>
          </label>
          <div className="mt-3">
            <label className="warm-label inline">Show to ratings of ≥</label>
            <select
              name="sampleReviewThreshold"
              defaultValue={String(tenant.sampleReviewThreshold)}
              className="warm-select ml-2 inline-block w-auto p-1.5"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </div>
        </div>

        {state?.error && (
          <p className="mt-3 text-sm font-semibold" style={{ color: "#c0392b" }}>
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="mt-3 text-sm font-semibold" style={{ color: "#2e7d32" }}>
            Saved ✓
          </p>
        )}

        <button type="submit" disabled={pending} className="warm-btn mt-5">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Live phone preview */}
      <div className="lg:sticky lg:top-6">
        <p className="warm-eyebrow mb-2">Live preview</p>
        <div className="mx-auto w-full max-w-[280px] rounded-[2rem] border-8 border-[#2a211a] bg-[#fffdf8] p-5 shadow-xl">
          <div
            className="flex flex-col items-center rounded-2xl p-5 text-center"
            style={{
              background: `linear-gradient(160deg, color-mix(in srgb, ${colorPrimary} 10%, #fffdf8), #fffdf8)`,
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
                style={{ background: colorPrimary }}
              >
                {businessName.charAt(0) || "?"}
              </div>
            )}
            <p className="font-serif mt-3 text-lg text-[var(--ink)]">{businessName || "Business"}</p>
            <p className="mt-2 text-sm font-semibold text-[#4a3b2c]">{welcomeMessage}</p>
            <div className="mt-3 text-2xl" style={{ color: colorPrimary }}>
              ★★★★★
            </div>
            <button
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ background: colorPrimary }}
            >
              Share on Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
