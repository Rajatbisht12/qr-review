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
      className={resolved ? "warm-btn-ghost px-3 py-1.5 text-xs" : "warm-btn px-3 py-1.5 text-xs"}
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
        <label className="warm-label">WhatsApp number</label>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+91…"
          className="warm-input mt-1.5"
        />
      </div>
      <div>
        <label className="warm-label">Alert me when rating is ≤ {threshold}</label>
        <input
          type="range"
          min={1}
          max={5}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--brand-primary)]"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#4a3b2c]">
        <input
          type="checkbox"
          checked={anyPrivate}
          onChange={(e) => setAnyPrivate(e.target.checked)}
          className="accent-[var(--brand-primary)]"
        />
        Also alert me on any private feedback with a note
      </label>
      <button onClick={save} disabled={pending} className="warm-btn">
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
      </button>
    </div>
  );
}
