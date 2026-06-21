/** Shared analytics display for manager & admin views. */
type Analytics = {
  scans: number;
  ratings: number;
  googleCtaClicks: number;
  privateSubmits: number;
  totalFeedback: number;
  avgRating: number;
  ratingDist: Record<number, number>;
  ctaByRating: { rating: number; count: number }[];
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function FunnelStats({ a }: { a: Analytics }) {
  const ctaRate = a.scans > 0 ? Math.round((a.googleCtaClicks / a.scans) * 100) : 0;
  const maxRating = Math.max(1, ...Object.values(a.ratingDist));

  // CTA prominence by rating band — evidence the Google path is rating-agnostic (PRD §9/§10).
  const lowBand = a.ctaByRating.filter((c) => c.rating <= 2).reduce((s, c) => s + c.count, 0);
  const highBand = a.ctaByRating.filter((c) => c.rating >= 4).reduce((s, c) => s + c.count, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Scans" value={a.scans} />
        <Stat label="Ratings" value={a.ratings} />
        <Stat label="Google CTA clicks" value={a.googleCtaClicks} sub={`${ctaRate}% of scans`} />
        <Stat label="Private submits" value={a.privateSubmits} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">
            Rating distribution{" "}
            <span className="font-normal text-slate-400">
              · avg {a.avgRating ? a.avgRating.toFixed(1) : "—"}
            </span>
          </p>
          <div className="mt-3 space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-slate-500">{r}★</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(a.ratingDist[r] / maxRating) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-slate-400">{a.ratingDist[r]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Google CTA by rating band</p>
          <p className="mt-1 text-xs text-slate-400">
            Non-gating check: unhappy customers reach Google just like happy ones.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Low ratings (1–2★)</span>
              <span className="font-semibold text-slate-900">{lowBand} clicks</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">High ratings (4–5★)</span>
              <span className="font-semibold text-slate-900">{highBand} clicks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
