"use client";

import { useState, useTransition } from "react";
import { resolveFeedback, updateWhatsApp } from "./actions";

export function ResolveButton({
  feedbackId,
  subdomain,
  resolved,
}: {
  feedbackId: string;
  subdomain: string;
  resolved: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => resolveFeedback(feedbackId, subdomain))}
      disabled={pending}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        resolved
          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
          : "bg-emerald-600 text-white hover:bg-emerald-700"
      } disabled:opacity-50`}
    >
      {resolved ? "Reopen" : "Mark resolved"}
    </button>
  );
}

export function WhatsAppSettings({
  contactId,
  subdomain,
  whatsappNumber,
  alertThreshold,
  alertOnAnyPrivate,
}: {
  contactId: string;
  subdomain: string;
  whatsappNumber: string;
  alertThreshold: number;
  alertOnAnyPrivate: boolean;
}) {
  const [number, setNumber] = useState(whatsappNumber);
  const [threshold, setThreshold] = useState(alertThreshold);
  const [anyPrivate, setAnyPrivate] = useState(alertOnAnyPrivate);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setSaved(false);
    start(async () => {
      await updateWhatsApp(contactId, subdomain, number, threshold, anyPrivate);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-slate-700">WhatsApp number</label>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+91…"
          className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">
          Alert me when rating is ≤ {threshold}
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={anyPrivate}
          onChange={(e) => setAnyPrivate(e.target.checked)}
        />
        Also alert me on any private feedback with a note
      </label>
      <button
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
      </button>
    </div>
  );
}
