"use client";

import { useActionState, useState } from "react";
import { createTenant } from "./actions";

export default function CreateTenantForm({ rootDomain }: { rootDomain: string }) {
  const [state, action, pending] = useActionState(createTenant, {});
  const [open, setOpen] = useState(false);
  const [subdomain, setSubdomain] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        + New tenant
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Create a tenant</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Business name</label>
          <input
            name="businessName"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Subdomain</label>
          <div className="mt-1 flex items-center rounded-lg border border-slate-300">
            <input
              name="subdomain"
              required
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="pizzapalace"
              className="w-full rounded-l-lg p-2.5 text-sm focus:outline-none"
            />
            <span className="whitespace-nowrap px-2 text-xs text-slate-400">.{rootDomain}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Category</label>
          <select
            name="category"
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          >
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Café</option>
            <option value="salon">Salon</option>
            <option value="retail">Retail</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Manager WhatsApp</label>
          <input
            name="whatsappNumber"
            placeholder="+91…"
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Google review URL</label>
          <input
            name="googleReviewUrl"
            placeholder="https://search.google.com/local/writereview?placeid=…"
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Primary colour</label>
          <input
            name="colorPrimary"
            type="color"
            defaultValue="#4f46e5"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Secondary colour</label>
          <input
            name="colorSecondary"
            type="color"
            defaultValue="#0ea5e9"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300"
          />
        </div>
      </div>

      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create & open"}
      </button>
    </form>
  );
}
