"use client";

import { useState, useTransition } from "react";
import { addReviewTemplate, deleteReviewTemplate } from "../../actions";

type Template = { id: string; text: string };

export default function SampleReviewsManager({
  tenantId,
  subdomain,
  templates,
}: {
  tenantId: string;
  subdomain: string;
  templates: Template[];
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function add() {
    if (!text.trim()) return;
    start(async () => {
      await addReviewTemplate(tenantId, subdomain, text);
      setText("");
    });
  }

  return (
    <div className="warm-card p-5">
      <p className="text-sm font-bold text-[var(--ink)]">Sample reviews</p>
      <p className="warm-muted mt-0.5 text-xs">
        Shown to customers (per the rating threshold) to copy &amp; paste on Google when the feature
        above is enabled. Keep them generic and truthful for this business.
      </p>

      <div className="mt-3 space-y-2">
        {templates.length === 0 && (
          <p className="warm-muted text-sm">No sample reviews yet.</p>
        )}
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-[#ebdfcb] bg-[#faf4e8] p-3"
          >
            <p className="text-sm text-[#4a3b2c]">{t.text}</p>
            <button
              onClick={() => start(() => deleteReviewTemplate(t.id, subdomain))}
              disabled={pending}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="e.g. Great experience, friendly staff and quick service."
          className="warm-textarea"
        />
        <button onClick={add} disabled={pending || !text.trim()} className="warm-btn mt-2">
          {pending ? "Saving…" : "Add sample review"}
        </button>
      </div>
    </div>
  );
}
