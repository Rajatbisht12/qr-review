"use client";

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { categoryConfig, SurveyTag } from "@/lib/feedbackCategories";
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

/** espresso tone used for primary actions in the Figma design */
const ESPRESSO = "#4a3a29";

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

const ISSUE_CHIPS = [
  "Slow service",
  "Quality",
  "Order/booking wrong",
  "Cleanliness",
  "Pricing",
  "Staff attitude",
];

export default function CustomerFlow(props: Props) {
  const cfg = categoryConfig(props.category);
  const surveyPages = cfg.surveyPages;

  const [step, setStep] = useState<Step>("rating");
  const [selected, setSelected] = useState<number | null>(null);
  const [surveyPage, setSurveyPage] = useState(0);
  const [love, setLove] = useState<Record<string, boolean>>({});
  const [otherText, setOtherText] = useState("");
  const [issues, setIssues] = useState<Record<string, boolean>>({});
  const [complaintText, setComplaintText] = useState("");
  const scanFired = useRef(false);

  // Total dots on the happy path: rating + each survey page + the review screen.
  const happyTotal = 1 + surveyPages.length + 1;
  const stepIndex =
    step === "rating" ? 0 : step === "survey" ? 1 + surveyPage : step === "review" ? happyTotal - 1 : -1;

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
    setSurveyPage(0);
    setLove({});
    setOtherText("");
    setIssues({});
    setComplaintText("");
    setStep("rating");
  }

  return (
    <Shell
      cfg={cfg}
      logoUrl={props.logoUrl}
      businessName={props.businessName}
      accent={props.accent}
      totalDots={happyTotal}
      activeDot={stepIndex}
      showDots={stepIndex >= 0}
      privateMode={step === "complaint" || step === "sent"}
    >
      {step === "rating" && (
        <RatingScreen
          {...props}
          welcomeSubtitle={cfg.welcomeSubtitle}
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
          accent={props.accent}
          page={surveyPages[surveyPage]}
          love={love}
          otherText={otherText}
          onOtherText={setOtherText}
          onToggle={(k) => toggle("love", k)}
          onBack={() => (surveyPage > 0 ? setSurveyPage((p) => p - 1) : restart())}
          onContinue={() => {
            if (surveyPage < surveyPages.length - 1) setSurveyPage((p) => p + 1);
            else setStep("review");
          }}
        />
      )}

      {step === "review" && (
        <ReviewScreen
          {...props}
          stars={selected ?? 5}
          love={love}
          otherText={otherText}
          onBack={() => {
            setSurveyPage(surveyPages.length - 1);
            setStep("survey");
          }}
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
    </Shell>
  );
}

/* =============================== shell / chrome =============================== */

function Shell({
  cfg,
  logoUrl,
  businessName,
  accent,
  totalDots,
  activeDot,
  showDots,
  privateMode,
  children,
}: {
  cfg: ReturnType<typeof categoryConfig>;
  logoUrl: string | null;
  businessName: string;
  accent: string;
  totalDots: number;
  activeDot: number;
  showDots: boolean;
  privateMode: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 440,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: cfg.gradient,
        overflow: "hidden",
      }}
    >
      {/* full-bleed background photo + warm darkening overlay */}
      {cfg.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cfg.image}
          alt=""
          aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(30,18,8,0.30) 0%, rgba(30,18,8,0.12) 30%, rgba(30,18,8,0.34) 100%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
        {/* top chrome — centered brand + private badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "22px 20px 0", position: "relative" }}>
          <BrandMark logoUrl={logoUrl} businessName={businessName} />
          <div
            aria-label="Private & secure"
            style={{
              position: "absolute",
              right: 20,
              top: 20,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,253,248,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(30,18,8,0.25)",
            }}
          >
            <svg width="15" height="16" viewBox="0 0 14 16" fill="none">
              <rect x="1" y="7" width="12" height="8" rx="2" fill="#6b5b49" />
              <path d="M3.5 7V4.6a3.5 3.5 0 0 1 7 0V7" stroke="#6b5b49" strokeWidth="1.6" fill="none" />
            </svg>
          </div>
        </div>

        {/* progress dots */}
        <div style={{ height: 18, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 14 }}>
          {showDots ? (
            <div style={{ display: "flex", gap: 5 }}>
              {Array.from({ length: totalDots }).map((_, i) => {
                const on = i === activeDot;
                return (
                  <div
                    key={i}
                    style={{
                      width: on ? 26 : 9,
                      height: 4,
                      borderRadius: 999,
                      background: on ? "#fffdf8" : "rgba(255,253,248,0.45)",
                      transition: "width .25s, background .25s",
                    }}
                  />
                );
              })}
            </div>
          ) : privateMode ? (
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "1.2px",
                color: "rgba(255,253,248,0.92)",
                textTransform: "uppercase",
              }}
            >
              Private Feedback
            </div>
          ) : null}
        </div>

        {/* the floating cream card */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 16px 0" }}>
          <div
            className="scr-fade"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(252, 244, 233, 0.97)",
              borderRadius: 28,
              boxShadow: "0 18px 44px rgba(30,18,8,0.28)",
              padding: "26px 22px",
              backdropFilter: "blur(2px)",
            }}
          >
            {children}
          </div>
        </div>

        {/* trust footer over the photo */}
        <TrustFooter />
      </div>
    </div>
  );
}

function BrandMark({ logoUrl, businessName }: { logoUrl: string | null; businessName: string }) {
  if (logoUrl) {
    return (
      <div
        style={{
          height: 56,
          minWidth: 56,
          padding: "0 14px",
          borderRadius: 16,
          background: "rgba(255,253,248,0.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 16px rgba(30,18,8,0.25)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={businessName} style={{ maxHeight: 40, maxWidth: 150, objectFit: "contain", display: "block" }} />
      </div>
    );
  }
  return (
    <div
      className="font-serif"
      style={{
        color: "#fffdf8",
        fontSize: 24,
        letterSpacing: "0.5px",
        textShadow: "0 2px 10px rgba(0,0,0,0.4)",
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 1.1,
      }}
    >
      {businessName}
    </div>
  );
}

function TrustFooter() {
  const items: { icon: ReactNode; label: string }[] = [
    {
      icon: (
        <svg width="9" height="10" viewBox="0 0 10 11" fill="none">
          <rect x="1" y="4.5" width="8" height="5.5" rx="1.3" fill="currentColor" />
          <path d="M2.6 4.5V3.1a2.4 2.4 0 0 1 4.8 0V4.5" stroke="currentColor" strokeWidth="1.1" fill="none" />
        </svg>
      ),
      label: "Private Feedback",
    },
    {
      icon: (
        <svg width="10" height="8" viewBox="0 0 11 8" fill="none">
          <path d="M1 4.2 4 7l6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: "Helps us improve",
    },
    {
      icon: (
        <svg width="10" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.8" r="4.6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.5 3.4v2.6l1.7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
      label: "Takes less than a minute",
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "16px 16px 20px",
        color: "rgba(255,253,248,0.82)",
      }}
    >
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "flex" }}>{it.icon}</span>
          <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.2px", whiteSpace: "nowrap" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/* =============================== shared bits =============================== */

function primaryBtn(active: boolean): CSSProperties {
  return {
    width: "100%",
    height: 50,
    border: "none",
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: "0.2px",
    cursor: active ? "pointer" : "default",
    color: active ? "#fffdf8" : "#b6a892",
    background: active ? ESPRESSO : "#e6dac6",
    boxShadow: active ? "0 12px 26px rgba(40,28,14,0.28)" : "none",
    transition: "all .22s",
    WebkitTapHighlightColor: "transparent",
  };
}

const backStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "1px solid #e6dac6",
  background: "#fffdf8",
  color: "#6b5b49",
  fontSize: 21,
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

function ArrowRight({ color = "#fffdf8" }: { color?: string }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
      <path d="M1 6h11M8 2l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TitleBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 className="font-serif" style={{ fontSize: 22, lineHeight: 1.15, color: "#2a211a", margin: 0, letterSpacing: "0.2px" }}>
        {title}
      </h1>
      <p style={{ fontSize: 13, color: "#9a8c7a", marginTop: 7, fontWeight: 500, lineHeight: 1.45 }}>{subtitle}</p>
    </div>
  );
}

/* =============================== screen 1 · rating =============================== */

function RatingScreen({
  category,
  accent,
  welcomeMessage,
  welcomeSubtitle,
  selected,
  onSelect,
  onContinue,
}: Props & {
  welcomeSubtitle: string;
  selected: number | null;
  onSelect: (n: number) => void;
  onContinue: () => void;
}) {
  const has = selected != null;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ textAlign: "center", flex: "none" }}>
        <h1 className="font-serif" style={{ fontSize: 27, lineHeight: 1.1, color: "#2a211a", margin: 0 }}>
          {welcomeMessage}
        </h1>
        <p style={{ fontSize: 13, color: "#9a8c7a", marginTop: 10, fontWeight: 500, lineHeight: 1.5, padding: "0 6px" }}>
          {welcomeSubtitle}
        </p>
        <div style={{ fontSize: 11, color: "#b0a28e", marginTop: 6, fontWeight: 600, textTransform: "capitalize" }}>{category}</div>
      </div>

      <div style={{ flex: 1, minHeight: 18 }} />

      {/* emoji rating tiles */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4, flex: "none" }}>
        {EMOJIS.map((e) => {
          const on = selected === e.score;
          return (
            <button
              key={e.score}
              aria-label={e.label}
              onClick={() => onSelect(e.score)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  background: on ? "#fffdf8" : "#f4ecdd",
                  border: on ? `2px solid ${accent}` : "2px solid transparent",
                  transform: on ? "translateY(-5px) scale(1.08)" : "none",
                  boxShadow: on ? `0 12px 22px ${hexA(accent, 0.3)}` : "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "transform .22s cubic-bezier(.2,.85,.25,1), box-shadow .22s, background .2s, border-color .2s",
                }}
              >
                {e.glyph}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: on ? 800 : 600,
                  color: on ? "#3a2d20" : "#a99b89",
                  transition: "color .2s",
                }}
              >
                {e.label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 18 }} />

      {/* private-note reassurance card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#fffdf8",
          border: "1px solid #efe4d2",
          borderRadius: 16,
          padding: "13px 14px",
          flex: "none",
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: hexA(accent, 0.12),
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </span>
        <span style={{ fontSize: 12.5, color: "#6b5b49", fontWeight: 500, lineHeight: 1.4 }}>
          Your feedback is private and takes less than a minute.
        </span>
      </div>

      <div style={{ marginTop: 16, flex: "none" }}>
        <button style={primaryBtn(has)} onClick={onContinue} disabled={!has}>
          {has ? "Continue" : "Tap a face above"}
          {has && <ArrowRight />}
        </button>
      </div>
    </div>
  );
}

/* =============================== screen 2 · survey =============================== */

function TagTile({ tag, on, accent, onClick }: { tag: SurveyTag; on: boolean; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "10px 11px",
        borderRadius: 13,
        cursor: "pointer",
        outline: "none",
        border: on ? `1.5px solid ${accent}` : "1.5px solid #ebdfcb",
        background: on ? hexA(accent, 0.1) : "#fffdf8",
        transition: "all .16s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ fontSize: 16, flex: "none", lineHeight: 1 }}>{tag.emoji}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? accent : "#5b4d3d", lineHeight: 1.2 }}>{tag.label}</span>
    </button>
  );
}

function SurveyScreen({
  accent,
  page,
  love,
  otherText,
  onOtherText,
  onToggle,
  onBack,
  onContinue,
}: {
  accent: string;
  page: { title: string; subtitle: string; tags: SurveyTag[] };
  love: Record<string, boolean>;
  otherText: string;
  onOtherText: (v: string) => void;
  onToggle: (k: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [showOther, setShowOther] = useState(false);
  const count = Object.values(love).filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flex: "none" }}>
        <button style={backStyle} onClick={onBack} aria-label="Back">
          ‹
        </button>
        <TitleBlock title={page.title} subtitle={page.subtitle} />
      </div>

      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          {page.tags.map((tag) => (
            <TagTile key={tag.label} tag={tag} on={!!love[tag.label]} accent={accent} onClick={() => onToggle(tag.label)} />
          ))}
        </div>

        {/* Other (Please Specify) */}
        <div
          style={{
            marginTop: 12,
            border: showOther ? `1.5px solid ${accent}` : "1.5px solid #ebdfcb",
            background: showOther ? hexA(accent, 0.06) : "#fffdf8",
            borderRadius: 14,
            padding: "12px 13px",
            transition: "all .16s",
          }}
        >
          <button
            onClick={() => setShowOther((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>✏️</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: showOther ? accent : "#5b4d3d" }}>Other (Please Specify)</span>
          </button>
          {showOther && (
            <textarea
              value={otherText}
              onChange={(e) => onOtherText(e.target.value)}
              placeholder="Tell us more…"
              autoFocus
              style={{
                marginTop: 10,
                width: "100%",
                minHeight: 56,
                background: "#fffdf8",
                border: "1px solid #ebdfcb",
                borderRadius: 11,
                padding: 11,
                color: "var(--ink)",
                fontSize: 13,
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                lineHeight: 1.45,
                resize: "none",
                outline: "none",
              }}
            />
          )}
        </div>
      </div>

      <div style={{ paddingTop: 14, flex: "none" }}>
        <button style={primaryBtn(count > 0 || otherText.trim().length > 0)} onClick={onContinue} disabled={count === 0 && !otherText.trim()}>
          Continue
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

/* =============================== screen 4 · review =============================== */

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

function QuoteIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flex: "none" }}>
      <path
        d="M10 7H6a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h2v-3H6v-2a1 1 0 0 1 1-1h3zM21 7h-4a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h2v-3h-2v-2a1 1 0 0 1 1-1h3z"
        fill={color}
        opacity={0.35}
      />
    </svg>
  );
}

function ReviewScreen({
  businessName,
  accent,
  subdomain,
  googleReviewUrl,
  stars,
  love,
  otherText,
  sampleReviewsEnabled,
  sampleReviewThreshold,
  sampleReviews,
  onBack,
  onRestart,
}: Props & { stars: number; love: Record<string, boolean>; otherText: string; onBack: () => void; onRestart: () => void }) {
  const picks = Object.keys(love).filter((k) => love[k]);

  // When the tenant manages approved sample copy AND this rating meets their configured
  // threshold, offer those reviews to choose from. Otherwise generate a few personalised
  // drafts from the customer's own selections so there's always more than one to pick.
  const useSample = sampleReviewsEnabled && sampleReviews.length > 0 && stars >= sampleReviewThreshold;
  const options = useSample ? sampleReviews : composeVariants(businessName, picks, stars);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const review = options[selectedIdx] ?? options[0];

  const [copied, setCopied] = useState(false);

  // Best-effort auto-copy on mount/selection. Mobile browsers often block clipboard
  // writes that aren't tied to a tap, so we only claim success when it actually worked.
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

  async function openGoogle() {
    // Copy on the tap itself — the gesture browsers trust most.
    await copyToClipboard(review);
    void recordEvent(subdomain, "google_cta_click", stars);
    window.open(googleReviewUrl || "https://www.google.com/maps", "_blank", "noopener,noreferrer");
    onRestart();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flex: "none" }}>
        <button style={backStyle} onClick={onBack} aria-label="Back">
          ‹
        </button>
        <TitleBlock title="Choose your Review" subtitle="Choose one option. You can still edit before posting." />
      </div>

      <div style={{ flex: 1, overflow: "auto", minHeight: 0, paddingRight: 2 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {options.map((opt, i) => {
            const sel = i === selectedIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIdx(i)}
                style={{
                  position: "relative",
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: sel ? "#fffdf8" : "#fbf4e8",
                  border: `1.5px solid ${sel ? accent : "#ebdfcb"}`,
                  borderRadius: 14,
                  padding: "12px 38px 12px 13px",
                  cursor: "pointer",
                  outline: "none",
                  boxShadow: sel ? `0 8px 20px ${hexA(accent, 0.14)}` : "none",
                  transition: "border-color .16s, box-shadow .16s, background .16s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.8px",
                    color: sel ? accent : "#b0a28e",
                    marginBottom: 5,
                  }}
                >
                  OPTION {i + 1}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#4a3b2c", fontWeight: 500, userSelect: "text" }}>{opt}</div>
                <div style={{ position: "absolute", top: 10, right: 10 }}>
                  <QuoteIcon color={accent} />
                </div>
              </button>
            );
          })}
        </div>

        {/* edit-on-Google preview */}
        <div
          style={{
            marginTop: 12,
            background: hexA(accent, 0.06),
            border: `1px dashed ${hexA(accent, 0.4)}`,
            borderRadius: 14,
            padding: "12px 13px",
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#5b4d3d" }}>Want to edit?</div>
          <div style={{ fontSize: 11, color: "#9a8c7a", marginTop: 2, fontWeight: 500 }}>
            {copied ? "Copied — you can tweak it on Google before posting." : "You can tweak it on Google before posting."}
          </div>
          <div
            style={{
              marginTop: 9,
              background: "#fffdf8",
              border: "1px solid #ebdfcb",
              borderRadius: 11,
              padding: 11,
              fontSize: 12,
              lineHeight: 1.5,
              color: "#4a3b2c",
              fontWeight: 500,
            }}
          >
            {review}
          </div>
          {otherText.trim() && (
            <div style={{ fontSize: 10.5, color: "#b0a28e", marginTop: 7, fontWeight: 500, fontStyle: "italic" }}>
              Your note: “{otherText.trim()}”
            </div>
          )}
        </div>
      </div>

      <div style={{ paddingTop: 14, flex: "none" }}>
        <button style={primaryBtn(true)} onClick={openGoogle}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#fffdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.8-1.6 4.6-4.5 6.4l-.04.3 6.5 5 .45.05c4.1-3.8 6.1-9.4 6.1-15z" />
              <path fill="#34A853" d="M24 46c5.9 0 10.9-1.9 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3.02-6.7 5.2-.1.3C7.5 41 15.1 46 24 46z" />
              <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-.02-.3-6.8-5.3-.2.1C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 9.9l7.1-5.5z" />
              <path fill="#EA4335" d="M24 9.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 3.3 29.9 1 24 1 15.1 1 7.5 6 4.4 13.1l7.1 5.5C13.3 13.3 18.2 9.5 24 9.5z" />
            </svg>
          </span>
          Open Google to post
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

/* =============================== screen 2' · complaint (friction) =============================== */

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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flex: "none" }}>
        <button style={backStyle} onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#b0a28e", letterSpacing: "0.6px", textTransform: "uppercase" }}>
          Private feedback
        </div>
      </div>

      <div style={{ textAlign: "center", flex: "none" }}>
        <div style={{ fontSize: 34, lineHeight: 1 }}>🙏</div>
        <h1 className="font-serif" style={{ fontSize: 23, marginTop: 8, lineHeight: 1.15, color: "#2a211a" }}>
          We&apos;re sorry we missed the mark
        </h1>
        <p style={{ fontSize: 12.5, color: "#9a8c7a", marginTop: 7, fontWeight: 500, lineHeight: 1.45 }}>
          Tell us what went wrong — this goes straight to the manager, privately.
        </p>
      </div>

      <div style={{ flex: 1, overflow: "auto", minHeight: 0, marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ISSUE_CHIPS.map((label) => {
            const on = !!issues[label];
            return (
              <button
                key={label}
                onClick={() => onToggle(label)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 12,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  outline: "none",
                  border: on ? `1.5px solid ${accent}` : "1.5px solid #ebdfcb",
                  background: on ? hexA(accent, 0.1) : "#fffdf8",
                  color: on ? accent : "#5b4d3d",
                  transition: "all .16s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Add any details (optional)…"
          style={{
            flex: 1,
            minHeight: 96,
            background: "#fffdf8",
            border: "1px solid #ebdfcb",
            borderRadius: 14,
            padding: 13,
            color: "var(--ink)",
            fontSize: 13.5,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            lineHeight: 1.5,
            resize: "none",
            outline: "none",
          }}
        />
        {error && <p style={{ color: "#c0392b", fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>}
      </div>

      <div style={{ paddingTop: 14, flex: "none" }}>
        <button style={{ ...primaryBtn(true), opacity: submitting ? 0.6 : 1 }} onClick={send} disabled={submitting}>
          {submitting ? "Sending…" : "Send privately to the manager"}
        </button>
      </div>
    </div>
  );
}

/* =============================== screen 3' · sent (friction) =============================== */

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
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        textAlign: "center",
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${accent}, ${hexA(accent, 0.78)})`,
          boxShadow: `0 14px 30px ${hexA(accent, 0.34)}`,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4 10-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="font-serif" style={{ fontSize: 24, marginTop: 20, color: "#2a211a" }}>
        Sent to the manager
      </h1>
      <p style={{ fontSize: 13.5, color: "#9a8c7a", marginTop: 10, fontWeight: 500, lineHeight: 1.5, maxWidth: 280 }}>
        {thankYouMessage} Someone will reach out shortly.
      </p>
      <button style={{ ...primaryBtn(true), width: "auto", padding: "0 44px", marginTop: 24 }} onClick={onRestart}>
        Done
      </button>
      <button
        onClick={openGoogle}
        style={{
          background: "none",
          border: "none",
          fontSize: 12,
          color: "#b0a28e",
          marginTop: 16,
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
