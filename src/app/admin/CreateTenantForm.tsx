"use client";

import { useActionState, useState } from "react";
import { createTenant } from "./actions";

export default function CreateTenantForm({
  mode,
  host,
  rootDomain,
}: {
  mode: string;
  host: string;
  rootDomain: string;
}) {
  const [state, action, pending] = useActionState(createTenant, {});
  const [open, setOpen] = useState(false);
  const [subdomain, setSubdomain] = useState("");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="warm-btn">
        + New tenant
      </button>
    );
  }

  return (
    <form action={action} className="warm-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-[var(--ink)]">Create a tenant</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="warm-muted text-sm hover:text-[var(--ink)]"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="warm-label">Business name</label>
          <input name="businessName" required className="warm-input mt-1.5" />
        </div>
        <div>
          <label className="warm-label">{mode === "subdomain" ? "Subdomain" : "Tenant slug"}</label>
          <div className="warm-input mt-1.5 flex items-center gap-0 p-0">
            {mode === "path" && (
              <span className="warm-muted whitespace-nowrap pl-3 text-xs">{host}/s/</span>
            )}
            <input
              name="subdomain"
              required
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="pizzapalace"
              className="w-full bg-transparent p-2.5 text-sm focus:outline-none"
            />
            {mode === "subdomain" && (
              <span className="warm-muted whitespace-nowrap px-3 text-xs">.{rootDomain}</span>
            )}
          </div>
          {subdomain && (
            <p className="warm-muted mt-1 truncate text-xs">
              Customer page:{" "}
              {mode === "subdomain" ? `${subdomain}.${rootDomain}` : `${host}/s/${subdomain}`}
            </p>
          )}
        </div>
        <div>
          <label className="warm-label">Category</label>
          <select name="category" className="warm-select mt-1.5">
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Café</option>
            <option value="salon">Salon</option>
            <option value="retail">Retail</option>
          </select>
        </div>
        <div>
          <label className="warm-label">Manager WhatsApp</label>
          <input name="whatsappNumber" placeholder="+91…" className="warm-input mt-1.5" />
        </div>
        <div className="sm:col-span-2">
          <label className="warm-label">Google review URL</label>
          <input
            name="googleReviewUrl"
            placeholder="https://search.google.com/local/writereview?placeid=…"
            className="warm-input mt-1.5"
          />
        </div>
        <div>
          <label className="warm-label">Primary colour</label>
          <input
            name="colorPrimary"
            type="color"
            defaultValue="#dd7a2e"
            className="mt-1.5 h-10 w-full rounded-lg border border-[#e6dac6]"
          />
        </div>
        <div>
          <label className="warm-label">Secondary colour</label>
          <input
            name="colorSecondary"
            type="color"
            defaultValue="#e8a33d"
            className="mt-1.5 h-10 w-full rounded-lg border border-[#e6dac6]"
          />
        </div>
      </div>

      {state?.error && (
        <p className="mt-3 text-sm font-semibold" style={{ color: "#c0392b" }}>
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="warm-btn mt-5">
        {pending ? "Creating…" : "Create & open"}
      </button>
    </form>
  );
}
