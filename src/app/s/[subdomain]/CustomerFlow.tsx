"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { recordEvent, submitFeedback } from "./actions";

type Props = {
  subdomain: string;
  businessName: string;
  category: string;
  accent: string;
  googleReviewUrl: string;
  logoUrl: string | null;
  welcomeMessage: string;
  thankYouMessage: string;
  // Optional "sample reviews" feature (opt-in per tenant). When enabled, the review
  // shown on the happy path is the tenant's own approved copy rather than a composed one.
  sampleReviewsEnabled: boolean;
  sampleReviewThreshold: number;
  sampleReviews: string[];
};

type Step = "rating" | "survey" | "review" | "complaint" | "sent";

const EMOJIS = [
  { glyph: "😠", label: "Awful", score: 1 },
  { glyph: "🙁", label: "Poor", score: 2 },
  { glyph: "😐", label: "Okay", score: 3 },
  { glyph: "😊", label: "Good", score: 4 },
  { glyph: "😍", label: "Loved it", score: 5 },
];

/** rgba() string from a #rrggbb hex + alpha — used for accent-tinted shadows/fills. */
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * Copy text to the clipboard, with a legacy fallback for browsers/contexts where
 * the async Clipboard API is unavailable or blocked (older mobile Safari, non-HTTPS,
 * in-app webviews). Returns true only if the copy actually succeeded.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy execCommand path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Survey chip groups for the happy path, lightly tailored per business category. */
function surveyGroupsForCategory(category: string): { title: string; chips: string[] }[] {
  const map: Record<string, { title: string; chips: string[] }[]> = {
    restaurant: [
      { title: "What you loved", chips: ["The food", "The service", "The ambience", "Great value"] },
      { title: "On the plate", chips: ["Tasty mains", "Great starters", "Lovely dessert", "Good drinks"] },
      { title: "The vibe", chips: ["Cozy", "Lively", "Family-friendly", "Romantic"] },
    ],
    cafe: [
      { title: "What you loved", chips: ["The coffee", "The food", "The service", "The space"] },
      { title: "The vibe", chips: ["Cozy", "Quiet", "Good for work", "Lively"] },
    ],
    salon: [
      { title: "What you loved", chips: ["The result", "The staff", "The space", "Great value"] },
      { title: "The experience", chips: ["Relaxing", "Professional", "Friendly", "On time"] },
    ],
    retail: [
      { title: "What you loved", chips: ["The products", "The help", "Great prices", "The selection"] },
      { title: "The experience", chips: ["Friendly", "Quick", "No pressure", "Knowledgeable"] },
    ],
  };
  return (
    map[category] ?? [
      { title: "What you loved", chips: ["The service", "The quality", "The atmosphere", "Great value"] },
      { title: "The experience", chips: ["Friendly", "Quick", "Professional", "Welcoming"] },
    ]
  );
}

const ISSUE_CHIPS = [
  "Slow service",
  "Quality",
  "Order/booking wrong",
  "Cleanliness",
  "Pricing",
  "Staff attitude",
];

export default function CustomerFlow(props: Props) {
  const { accent } = props;
  const [step, setStep] = useState<Step>("rating");
  const [selected, setSelected] = useState<number | null>(null);
  const [love, setLove] = useState<Record<string, boolean>>({});
  const [issues, setIssues] = useState<Record<string, boolean>>({});
  const [complaintText, setComplaintText] = useState("");
  const scanFired = useRef(false);

  // Track the scan exactly once when the page loads (PRD 6.6 funnel).
  useEffect(() => {
    if (scanFired.current) return;
    scanFired.current = true;
    void recordEvent(props.subdomain, "scan");
  }, [props.subdomain]);

  function toggle(map: "love" | "issues", key: string) {
    const setter = map === "love" ? setLove : setIssues;
    setter((m) => ({ ...m, [key]: !m[key] }));
  }

  function restart() {
    setSelected(null);
    setLove({});
    setIssues({});
    setComplaintText("");
    setStep("rating");
  }

  return (
    <div
      className="flex w-full flex-col text-[var(--ink)]"
      style={{
        minHeight: "100vh",
        maxWidth: 440,
        background: "linear-gradient(180deg, var(--paper-top) 0%, var(--paper-bottom) 100%)",
        overflow: "hidden",
      }}
    >
      {step === "rating" && (
        <RatingScreen
          {...props}
          selected={selected}
          onSelect={(score) => {
            setSelected(score);
            void recordEvent(props.subdomain, "rating", score);
          }}
          onContinue={() => {
            if (selected == null) return;
            setStep(selected >= 3 ? "survey" : "complaint");
          }}
        />
      )}

      {step === "survey" && (
        <SurveyScreen
          {...props}
          love={love}
          onToggle={(k) => toggle("love", k)}
          onBack={restart}
          onGenerate={() => setStep("review")}
        />
      )}

      {step === "review" && (
        <ReviewScreen
          {...props}
          stars={selected ?? 5}
          love={love}
          onBack={() => setStep("survey")}
          onRestart={restart}
        />
      )}

      {step === "complaint" && (
        <ComplaintScreen
          {...props}
          rating={selected ?? 1}
          issues={issues}
          text={complaintText}
          onText={setComplaintText}
          onToggle={(k) => toggle("issues", k)}
          onBack={restart}
          onSent={() => setStep("sent")}
        />
      )}

      {step === "sent" && <SentScreen {...props} onRestart={restart} />}
    </div>
  );
}

/* ----------------------------- shared styles ----------------------------- */

function primaryBtn(active: boolean, bg: string): CSSProperties {
  return {
    width: "100%",
    height: 56,
    border: "none",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "var(--font-sans)",
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "0.2px",
    cursor: active ? "pointer" : "default",
    color: active ? "#fff" : "#b6a892",
    background: active ? bg : "#efe7d9",
    boxShadow: active ? `0 12px 26px ${hexA(bg, 0.3)}` : "none",
    transition: "all .25s",
    WebkitTapHighlightColor: "transparent",
  };
}

function copyBtn(copied: boolean, accent: string): CSSProperties {
  return {
    width: "100%",
    height: 52,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: "0.2px",
    cursor: "pointer",
    outline: "none",
    transition: "all .2s",
    WebkitTapHighlightColor: "transparent",
    border: `1.5px solid ${copied ? accent : hexA(accent, 0.45)}`,
    background: copied ? hexA(accent, 0.12) : "#fffdf8",
    color: accent,
  };
}

function reviewOption(selected: boolean, accent: string): CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: selected ? "#fffdf8" : "#fbf6ec",
    border: `1.5px solid ${selected ? accent : "#ebdfcb"}`,
    borderRadius: 16,
    padding: 16,
    cursor: "pointer",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    boxShadow: selected ? `0 10px 24px ${hexA(accent, 0.16)}` : "none",
    transition: "border-color .16s, box-shadow .16s, background .16s",
  };
}

const backStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  border: "1px solid #ebdfcb",
  background: "#fffdf8",
  color: "#6b5b49",
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: 3,
  flex: "none",
  outline: "none",
};

function chipStyle(on: boolean, accent: string): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 13,
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    outline: "none",
    border: on ? `1.5px solid ${accent}` : "1.5px solid #e6dac6",
    background: on ? hexA(accent, 0.12) : "#fffdf8",
    color: on ? accent : "#5b4d3d",
    transition: "all .18s",
    WebkitTapHighlightColor: "transparent",
  };
}

function Logo({
  logoUrl,
  businessName,
  size,
  accent,
}: {
  logoUrl: string | null;
  businessName: string;
  size: number;
  accent: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt={businessName}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: accent,
        color: "#fff",
        fontFamily: "var(--font-serif)",
        fontSize: size * 0.4,
      }}
    >
      {businessName.charAt(0)}
    </div>
  );
}

/* ----------------------------- screen 1 · rating ----------------------------- */

function RatingScreen({
  businessName,
  category,
  accent,
  logoUrl,
  welcomeMessage,
  selected,
  onSelect,
  onContinue,
}: Props & { selected: number | null; onSelect: (n: number) => void; onContinue: () => void }) {
  const has = selected != null;
  return (
    <div className="scr-fade" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, flex: "none" }} />

      {/* hero banner */}
      <div style={{ padding: "0 16px", flex: "none" }}>
        <div
          style={{
            position: "relative",
            height: 178,
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: "0 16px 34px rgba(74,50,18,0.16)",
            background: logoUrl
              ? undefined
              : `linear-gradient(135deg, ${accent} 0%, ${hexA(accent, 0.72)} 100%)`,
          }}
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(0.92)" }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(40,25,8,0) 40%, rgba(40,25,8,0.34) 100%)",
            }}
          />
        </div>
      </div>

      {/* logo medallion */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: -44, position: "relative", zIndex: 2 }}>
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: "#fffdf8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 22px rgba(74,50,18,0.20)",
          }}
        >
          <Logo logoUrl={logoUrl} businessName={businessName} size={80} accent={accent} />
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 13, padding: "0 24px", flex: "none" }}>
        <div className="font-serif" style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: "0.4px" }}>
          {businessName}
        </div>
        <div style={{ marginTop: 7, color: "var(--ink-muted)", fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>
          {category}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 24, padding: "0 30px", flex: "none" }}>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, letterSpacing: "-0.2px" }}>
          {welcomeMessage}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-muted)", marginTop: 8, lineHeight: 1.45, fontWeight: 500 }}>
          Tell us how we did — it only takes a second.
        </div>
      </div>

      {/* emoji rating */}
      <div style={{ marginTop: 30, padding: "0 22px", flex: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {EMOJIS.map((e) => {
            const on = selected === e.score;
            return (
              <div key={e.score} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
                <button
                  aria-label={e.label}
                  onClick={() => onSelect(e.score)}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 29,
                    padding: 0,
                    cursor: "pointer",
                    flex: "none",
                    outline: "none",
                    border: on ? `2px solid ${accent}` : "2px solid transparent",
                    background: on ? "#ffffff" : "#f4ede1",
                    transform: on ? "translateY(-6px) scale(1.12)" : "none",
                    boxShadow: on ? `0 12px 24px ${hexA(accent, 0.32)}` : "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "transform .24s cubic-bezier(.2,.85,.25,1), box-shadow .24s, background .24s, border-color .24s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {e.glyph}
                </button>
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 10,
                    fontWeight: on ? 800 : 600,
                    color: on ? "#3a2d20" : "#a99b89",
                    letterSpacing: "0.2px",
                    transition: "color .2s",
                  }}
                >
                  {e.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      <div style={{ padding: "0 22px 30px", flex: "none" }}>
        <button style={primaryBtn(has, accent)} onClick={onContinue} disabled={!has}>
          {has ? "Continue" : "Tap a face above"}
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 16,
            color: "#b0a28e",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.2px",
          }}
        >
          <svg width="10" height="12" viewBox="0 0 12 14">
            <rect x="1" y="6" width="10" height="7" rx="1.6" fill="#b0a28e" />
            <path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="#b0a28e" strokeWidth="1.4" />
          </svg>
          Private &amp; secure · Powered by ReviewLoop
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- screen 2 · survey (happy) ----------------------------- */

function SurveyScreen({
  category,
  accent,
  love,
  onToggle,
  onBack,
  onGenerate,
}: Props & {
  love: Record<string, boolean>;
  onToggle: (k: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const groups = surveyGroupsForCategory(category);
  const count = Object.values(love).filter(Boolean).length;
  return (
    <div className="scr-fade" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 40, flex: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 18px 0", flex: "none" }}>
        <button style={backStyle} onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.3px" }}>
          STEP 2 OF 3
        </div>
      </div>

      <div style={{ padding: "18px 24px 0", flex: "none" }}>
        <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.3px" }}>
          Wonderful! What stood out?
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-muted)", marginTop: 7, fontWeight: 500 }}>
          Tap a few — they&apos;ll shape the review you post.
        </div>
      </div>

      <div style={{ padding: "22px 22px 0", flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {groups.map((grp) => (
          <div key={grp.title}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#b0a28e",
                letterSpacing: "0.6px",
                textTransform: "uppercase",
                marginBottom: 11,
              }}
            >
              {grp.title}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {grp.chips.map((label) => (
                <button key={label} style={chipStyle(!!love[label], accent)} onClick={() => onToggle(label)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "14px 22px 30px", flex: "none" }}>
        <button style={primaryBtn(count > 0, accent)} onClick={() => count > 0 && onGenerate()} disabled={count === 0}>
          {count > 0 ? `Build my review (${count})` : "Pick a few to continue"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- screen 3 · review ready (happy) ----------------------------- */

function joinNaturally(items: string[]): string {
  const lower = items.map((s) => s.toLowerCase());
  if (lower.length <= 1) return lower[0] ?? "";
  if (lower.length === 2) return `${lower[0]} and ${lower[1]}`;
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

/** Generate a few distinct review drafts from the customer's own picks so there is
 *  always more than one to choose from. These are starting points — the customer edits
 *  and posts in their own words on Google. */
function composeVariants(businessName: string, picks: string[], stars: number): string[] {
  const loved = picks.length ? joinNaturally(picks) : "";
  const lovedCap = loved ? loved.charAt(0).toUpperCase() + loved.slice(1) : "";
  const recommend = stars >= 4 ? "Highly recommend" : "Recommend";

  return [
    `Had a wonderful time at ${businessName}!${
      loved ? ` Really loved ${loved}.` : ""
    } Friendly service and a great experience overall — ${recommend.toLowerCase()} and will be back.`,
    `${businessName} was fantastic.${
      loved ? ` Loved ${loved}.` : ""
    } Warm, welcoming staff and a great atmosphere — will definitely be back!`,
    `${recommend} ${businessName}!${
      loved ? ` ${lovedCap} really made it.` : ""
    } Friendly service from start to finish and a genuinely lovely experience.`,
    `Really enjoyed ${businessName}.${
      loved ? ` ${lovedCap} stood out.` : ""
    } Great service and a lovely vibe — well worth a visit.`,
  ];
}

function ReviewScreen({
  businessName,
  accent,
  logoUrl,
  subdomain,
  googleReviewUrl,
  stars,
  love,
  sampleReviewsEnabled,
  sampleReviewThreshold,
  sampleReviews,
  onBack,
  onRestart,
}: Props & { stars: number; love: Record<string, boolean>; onBack: () => void; onRestart: () => void }) {
  const picks = Object.keys(love).filter((k) => love[k]);

  // When the tenant manages approved sample copy AND this rating meets their configured
  // threshold, offer those reviews to choose from. Otherwise generate a few personalised
  // drafts from the customer's own selections so there's always more than one to pick.
  // The customer always edits and posts in their own words on Google.
  const useSample =
    sampleReviewsEnabled && sampleReviews.length > 0 && stars >= sampleReviewThreshold;
  const options = useSample ? sampleReviews : composeVariants(businessName, picks, stars);
  const multiple = options.length > 1;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const review = options[selectedIdx] ?? options[0];

  const [copied, setCopied] = useState(false);

  // Best-effort auto-copy on mount. Mobile browsers often block clipboard writes
  // that aren't tied to a tap, so we only claim success when it actually worked —
  // the explicit "Copy review" button below is the reliable, gesture-driven path.
  useEffect(() => {
    let active = true;
    setCopied(false);
    void copyToClipboard(review).then((ok) => {
      if (active && ok) setCopied(true);
    });
    return () => {
      active = false;
    };
  }, [review]);

  async function handleCopy() {
    const ok = await copyToClipboard(review);
    setCopied(ok);
  }

  async function openGoogle() {
    // Copy on the tap itself — the gesture browsers trust most — so the review is
    // on the clipboard even if the auto-copy on mount was blocked.
    await copyToClipboard(review);
    void recordEvent(subdomain, "google_cta_click", stars);
    window.open(googleReviewUrl || "https://www.google.com/maps", "_blank", "noopener,noreferrer");
    onRestart();
  }

  return (
    <div className="scr-fade" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 40, flex: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 18px 0", flex: "none" }}>
        <button style={backStyle} onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.3px" }}>
          STEP 3 OF 3
        </div>
      </div>

      <div style={{ padding: "20px 26px 0", flex: "none", textAlign: "center" }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${accent}, ${hexA(accent, 0.78)})`,
            boxShadow: `0 14px 30px ${hexA(accent, 0.34)}`,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4 10-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 16, letterSpacing: "-0.3px" }}>
          {multiple ? "Choose your review" : "Your review is ready"}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-muted)", marginTop: 7, fontWeight: 500 }}>
          {copied
            ? "Copied — just paste it on Google below."
            : multiple
              ? "Pick the one you like, then tap “Copy review”."
              : "Tap “Copy review”, then paste it on Google."}
        </div>
      </div>

      <div style={{ padding: "22px 22px 0", flex: 1, overflow: "auto" }}>
        {/* business header — shown once above the choices */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Logo logoUrl={logoUrl} businessName={businessName} size={38} accent={accent} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{businessName}</div>
            <div style={{ fontSize: 15, letterSpacing: "2px", color: "#e8a33d", marginTop: 1 }}>
              {"★".repeat(Math.max(1, Math.min(5, stars)))}
            </div>
          </div>
        </div>

        {multiple && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#b0a28e",
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {options.length} reviews to choose from
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt, i) => {
            const sel = i === selectedIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => (multiple ? setSelectedIdx(i) : handleCopy())}
                style={reviewOption(sel, accent)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  {multiple && (
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        flex: "none",
                        marginTop: 2,
                        background: "#fff",
                        border: sel ? `6px solid ${accent}` : "2px solid #d8c9af",
                        transition: "border-color .15s, border-width .15s",
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#4a3b2c",
                      fontWeight: 500,
                      userSelect: "text",
                      WebkitUserSelect: "text",
                    }}
                  >
                    {opt}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 14,
            color: "var(--ink-muted)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="8" y="8" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M5 16V4a1 1 0 0 1 1-1h9" stroke="currentColor" strokeWidth="2" />
          </svg>
          It&apos;s your review — edit it freely on Google
        </div>
      </div>

      <div style={{ padding: "14px 22px 30px", flex: "none", display: "flex", flexDirection: "column", gap: 12 }}>
        <button style={copyBtn(copied, accent)} onClick={handleCopy}>
          {copied ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4 10-11" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="8" y="8" width="11" height="13" rx="2" stroke={accent} strokeWidth="2" />
              <path d="M5 16V4a1 1 0 0 1 1-1h9" stroke={accent} strokeWidth="2" />
            </svg>
          )}
          {copied ? "Copied to clipboard" : "Copy review"}
        </button>
        <button style={primaryBtn(true, "#4c8bf5")} onClick={openGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#fff"
              d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
            />
          </svg>
          Open Google to post
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- screen 2' · complaint (friction) ----------------------------- */

function ComplaintScreen({
  subdomain,
  accent,
  rating,
  issues,
  text,
  onText,
  onToggle,
  onBack,
  onSent,
}: Props & {
  rating: number;
  issues: Record<string, boolean>;
  text: string;
  onText: (v: string) => void;
  onToggle: (k: string) => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSubmitting(true);
    setError(null);
    const picked = Object.keys(issues).filter((k) => issues[k]);
    const feedbackText = [picked.length ? `Issues: ${picked.join(", ")}.` : "", text.trim()]
      .filter(Boolean)
      .join("\n")
      .trim();
    const res = await submitFeedback({ subdomain, rating, feedbackText });
    setSubmitting(false);
    if (res.ok) onSent();
    else setError(res.error ?? "Something went wrong. Please try again.");
  }

  return (
    <div className="scr-fade" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 40, flex: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 18px 0", flex: "none" }}>
        <button style={backStyle} onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.3px" }}>
          PRIVATE FEEDBACK
        </div>
      </div>

      <div style={{ padding: "18px 26px 0", flex: "none", textAlign: "center" }}>
        <div style={{ fontSize: 38, lineHeight: 1 }}>🙏</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 12, lineHeight: 1.2, letterSpacing: "-0.3px" }}>
          We&apos;re sorry we missed the mark
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-muted)", marginTop: 8, fontWeight: 500, lineHeight: 1.45 }}>
          Tell us what went wrong — this goes straight to the manager, privately.
        </div>
      </div>

      <div style={{ padding: "22px 22px 0", flex: 1, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {ISSUE_CHIPS.map((label) => (
            <button key={label} style={chipStyle(!!issues[label], accent)} onClick={() => onToggle(label)}>
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Add any details (optional)…"
          style={{
            flex: 1,
            minHeight: 110,
            background: "#fffdf8",
            border: "1px solid #ebdfcb",
            borderRadius: 16,
            padding: 14,
            color: "var(--ink)",
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            lineHeight: 1.5,
            resize: "none",
            outline: "none",
          }}
        />
        {error && <p style={{ color: "#c0392b", fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>}
      </div>

      <div style={{ padding: "14px 22px 30px", flex: "none" }}>
        <button
          style={{ ...primaryBtn(true, accent), opacity: submitting ? 0.6 : 1 }}
          onClick={send}
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Send privately to the manager"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- screen 3' · sent (friction) ----------------------------- */

function SentScreen({
  accent,
  subdomain,
  googleReviewUrl,
  thankYouMessage,
  onRestart,
}: Props & { onRestart: () => void }) {
  function openGoogle() {
    void recordEvent(subdomain, "google_cta_click");
    window.open(googleReviewUrl || "https://www.google.com/maps", "_blank", "noopener,noreferrer");
  }
  return (
    <div
      className="scr-fade"
      style={{
        height: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 34px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${accent}, ${hexA(accent, 0.78)})`,
          boxShadow: `0 14px 30px ${hexA(accent, 0.34)}`,
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4 10-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 22, letterSpacing: "-0.3px" }}>
        Sent to the manager
      </div>
      <div style={{ fontSize: 14, color: "var(--ink-muted)", marginTop: 10, fontWeight: 500, lineHeight: 1.5 }}>
        {thankYouMessage} Someone will reach out shortly.
      </div>
      <button style={{ ...primaryBtn(true, accent), width: "auto", padding: "0 40px", marginTop: 26 }} onClick={onRestart}>
        Done
      </button>
      <button
        onClick={openGoogle}
        style={{
          background: "none",
          border: "none",
          fontSize: 12,
          color: "#c2b5a1",
          marginTop: 18,
          fontWeight: 600,
          maxWidth: 230,
          lineHeight: 1.5,
          textDecoration: "underline",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        Still want to post publicly on Google?
      </button>
    </div>
  );
}
