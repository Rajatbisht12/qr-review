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

const EMOJIS: { glyph: string; label: string; score: number; key: string; ring?: string }[] = [
  { glyph: "😠", label: "Awful", score: 1, key: "awful" },
  { glyph: "🙁", label: "Poor", score: 2, key: "poor" },
  // The "okay" art ships paler than the others — give its disc a defined darker border.
  { glyph: "😐", label: "Okay", score: 3, key: "okay", ring: "#C9A36A" },
  { glyph: "😊", label: "Good", score: 4, key: "good" },
  { glyph: "😍", label: "Loved it", score: 5, key: "loved" },
];

/** espresso tone used for primary actions in the Figma design */
const ESPRESSO = "#4a3a29";

/** Figma fonts: Itim headings, Kalam handwritten body, Roboto sub-headers / small labels. */
const DISPLAY: CSSProperties = { fontFamily: "var(--font-display)" };
const HAND: CSSProperties = { fontFamily: "var(--font-hand)" };
const UI: CSSProperties = { fontFamily: "var(--font-ui)" };

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
          onPick={(score) => {
            setSelected(score);
            void recordEvent(props.subdomain, "rating", score);
            setStep(score >= 3 ? "survey" : "complaint");
          }}
        />
      )}

      {step === "survey" && (
        <SurveyScreen
          page={surveyPages[surveyPage]}
          love={love}
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
              flex: 0.5,
              display: "flex",
              flexDirection: "column",
              background: "rgba(253, 240, 230, 0.98)",
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
    {
      icon: (
        <svg width="11" height="10" viewBox="0 0 12 11" fill="none">
          <path
            d="M6 9.5C2.5 7.2 1 5.4 1 3.6 1 2.2 2.1 1.2 3.4 1.2c.9 0 1.7.5 2.1 1.2.4-.7 1.2-1.2 2.1-1.2C8.9 1.2 10 2.2 10 3.6 10 5.4 8.5 7.2 6 9.5z"
            stroke="currentColor"
            strokeWidth="1.1"
            fill="none"
            strokeLinejoin="round"
          />
        </svg>
      ),
      label: "Makes a difference",
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
      <h1 style={{ ...DISPLAY, fontSize: 22, lineHeight: 1.2, color: "#202020", margin: 0 }}>
        {title}
      </h1>
      <p style={{ ...UI, fontSize: 12.5, color: "#6b5f52", marginTop: 6, fontWeight: 400, lineHeight: 1.4 }}>{subtitle}</p>
    </div>
  );
}

/**
 * Custom illustrated rating icon — a plate flanked by a fork & knife with a face whose
 * expression maps to the 1–5 score (recreated as SVG to match the Figma rating row).
 * `Loved it` (5) gets a pair of sparkle stars; the selected plate fills warm gold.
 */
function RatingIcon({ mood, active }: { mood: number; active: boolean }) {
  const line = active ? "#5b3a1e" : "#6b4a30";

  // Mouth curve per mood: frown → neutral → smile (the mood badge sits above the plate).
  const mouths: Record<number, string> = {
    1: "M24 38 Q28 34 32 38",
    2: "M24.5 37 Q28 34.8 31.5 37",
    3: "M25 36 Q28 37.6 31 36",
    4: "M24 35.6 Q28 39.6 32 35.6",
    5: "M23.5 35 Q28 40.6 32.5 35",
  };

  // Coloured badge above each plate: broken heart, blob, dots, sprig, stars.
  function badge() {
    switch (mood) {
      case 1:
        return (
          <g>
            <path d="M28 14.6 24 10.6c-1.2-1.2-1.2-3.1.1-3.9.9-.6 2.1-.3 2.7.6L28 9l1.2-1.7c.6-.9 1.8-1.2 2.7-.6 1.3.8 1.3 2.7.1 3.9z" fill="#d24b39" />
            <path d="M28 8.4l-1.2 1.8 1.6 1.2-1.3 1.6" stroke="#fffdf8" strokeWidth="1" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      case 2:
        return (
          <path
            d="M24.2 14.2a2.1 2.1 0 0 1-.3-4.1 2.9 2.9 0 0 1 5.4-1.7 2.3 2.3 0 0 1 3.3 2.2 1.6 1.6 0 0 1-.1.4 2 2 0 0 1-.7 3.2z"
            fill="#9c7a52"
          />
        );
      case 3:
        return (
          <g fill="#7a5a3a">
            <circle cx="24" cy="9.5" r="1.3" />
            <circle cx="28" cy="9.5" r="1.3" />
            <circle cx="32" cy="9.5" r="1.3" />
          </g>
        );
      case 4:
        return (
          <g fill="#7d9a48">
            <path d="M28 14.5c-1.6-3-1-6.3 2-8.4.8 3-.3 6.3-2 8.4z" />
            <path d="M27.4 13.6c-2.2-1.4-3.4-4.1-2.6-6.8 2.5.8 4 3.4 2.6 6.8z" />
          </g>
        );
      case 5:
        return (
          <g>
            <path d="M28 4.4l1.1 2.6 2.8.2-2.1 1.9.7 2.7L28 12.9l-2.5 1.4.7-2.7-2.1-1.9 2.8-.2z" fill="#e3922e" />
            <path d="M33.4 4.2l.5 1.3 1.4.1-1 .9.3 1.3-1.2-.7-1.2.7.3-1.3-1-.9 1.4-.1z" fill="#e8a83f" />
          </g>
        );
      default:
        return null;
    }
  }

  return (
    <svg width="46" height="46" viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* fork */}
      <path d="M9.6 26v4M11 26v4.6M12.4 26v4" stroke={line} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 30.5V43" stroke={line} strokeWidth="1.6" strokeLinecap="round" />
      {/* knife */}
      <path d="M45 26c1.7 1.3 1.7 4.7 0 6.4V43" stroke={line} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* plate */}
      <circle cx="28" cy="33" r="13.4" fill="#fffdf8" stroke={line} strokeWidth="1.8" />
      <circle cx="28" cy="33" r="9.8" stroke={line} strokeWidth="1" opacity="0.4" />
      {/* eyes */}
      <circle cx="24" cy="31" r="1.5" fill={line} />
      <circle cx="32" cy="31" r="1.5" fill={line} />
      {/* mouth */}
      <path d={mouths[mood]} stroke={line} strokeWidth="2" strokeLinecap="round" fill="none" />
      {badge()}
    </svg>
  );
}

/**
 * Rating face: prefers the exported art at /ratings/<key>.png, falling back to the
 * built-in SVG recreation if that file is missing. The PNG already includes its own
 * peach disc, so selection just adds a gold ring + glow; the SVG fallback draws the disc.
 */
function RatingArt({ artKey, mood, active, ring }: { artKey: string; mood: number; active: boolean; ring?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const size = active ? 60 : 56;
  const base: CSSProperties = {
    width: size,
    height: size,
    flex: "none",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: active ? "translateY(-4px)" : "none",
    transition: "width .2s, height .2s, transform .24s cubic-bezier(.2,.85,.25,1), box-shadow .24s, background .2s, border-color .2s",
  };

  if (!imgFailed) {
    return (
      <span
        style={{
          ...base,
          border: active ? "2px solid #E3B24F" : `2px solid ${ring ?? "transparent"}`,
          boxShadow: active ? "0 9px 20px rgba(225,170,70,0.42)" : "0 2px 6px rgba(60,40,20,0.05)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/ratings/${artKey}.png`}
          alt=""
          width={size}
          height={size}
          style={{ display: "block", objectFit: "contain", borderRadius: "50%" }}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      style={{
        ...base,
        background: active ? "#F7D680" : "#FFF3E8",
        border: active ? "1.5px solid #E3B24F" : "1.5px solid #f0e6d6",
        boxShadow: active ? "0 9px 20px rgba(225,170,70,0.42)" : "0 2px 6px rgba(60,40,20,0.05)",
      }}
    >
      <RatingIcon mood={mood} active={active} />
    </span>
  );
}

/** Botanical line-art (exported from Figma) trailing down from the card's top-right corner. */
function LeafDecoration() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/leaf-decoration.svg"
      alt=""
      aria-hidden
      style={{
        position: "absolute",
        top: -10,
        right: -8,
        width: "auto",
        height: 300,
        opacity: 1,
        pointerEvents: "none",
      }}
    />
  );
}

/* =============================== screen 1 · rating =============================== */

function RatingScreen({
  welcomeMessage,
  welcomeSubtitle,
  selected,
  onPick,
}: Props & {
  welcomeSubtitle: string;
  selected: number | null;
  onPick: (n: number) => void;
}) {
  // Local pick gives instant visual feedback; we let the plate animate, then advance.
  const [picked, setPicked] = useState<number | null>(selected);
  const advancing = useRef(false);

  function choose(score: number) {
    if (advancing.current) return;
    advancing.current = true;
    setPicked(score);
    window.setTimeout(() => onPick(score), 340);
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>
      {/* botanical sprig in the card's top-right corner (Figma) */}
      <LeafDecoration />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ flex: 1, minHeight: 8 }} />

      <div style={{ textAlign: "center", flex: "none" }}>
        <h1 style={{ ...DISPLAY, fontSize: 26, lineHeight: 1.2, color: "#202020", margin: 0 }}>
          {welcomeMessage}
        </h1>
        <p style={{ ...UI, fontSize: 12.5, color: "#6b5f52", marginTop: 12, fontWeight: 400, lineHeight: 1.5, padding: "0 8px" }}>
          {welcomeSubtitle}
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 22 }} />

      {/* plate-face rating row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4, flex: "none" }}>
        {EMOJIS.map((e) => {
          const on = picked === e.score;
          return (
            <button
              key={e.score}
              aria-label={e.label}
              onClick={() => choose(e.score)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 9,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <RatingArt artKey={e.key} mood={e.score} active={on} ring={e.ring} />
              <span
                style={{
                  ...UI,
                  fontSize: 11.5,
                  fontWeight: on ? 600 : 400,
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

      <div style={{ flex: 1, minHeight: 22 }} />

      {/* reassurance card (Figma copy) — chat icon left, handwritten text centred */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#fffdf8",
          border: "1px solid #efe4d2",
          borderRadius: 16,
          padding: "14px 16px",
          flex: "none",
        }}
      >
        <span style={{ flex: "none", display: "flex" }}>
          <svg width="38" height="38" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="url(#chatBubbleBg)" />
            <path
              d="M22.4 9C23.2417 8.99995 24.0517 9.32257 24.6641 9.90183C25.2765 10.4811 25.6451 11.2732 25.6945 12.1161L25.7 12.3103V14.5172C26.5417 14.5172 27.3517 14.8398 27.9641 15.4191C28.5765 15.9983 28.9451 16.7905 28.9945 17.6334L29 17.8276V22.2414C29 23.0857 28.6784 23.8982 28.101 24.5126C27.5235 25.1269 26.7339 25.4967 25.8936 25.5462L25.7 25.5517V26.6177C25.7 27.7432 24.4427 28.3766 23.5506 27.7575L23.445 27.6781L20.9018 25.5517H16.9C16.0893 25.5518 15.307 25.2525 14.7022 24.7109L14.5482 24.563L12.5 26.1034C11.6299 26.7578 10.4034 26.1862 10.3066 25.1335L10.3 25V23.3448C9.45827 23.3449 8.64833 23.0223 8.03591 22.443C7.42349 21.8637 7.05488 21.0716 7.0055 20.2287L7 20.0345V12.3103C6.99995 11.466 7.32156 10.6535 7.89901 10.0392C8.47647 9.42482 9.26612 9.05505 10.1064 9.00552L10.3 9H22.4ZM25.7 16.7241H16.9C16.6083 16.7241 16.3285 16.8404 16.1222 17.0473C15.9159 17.2543 15.8 17.5349 15.8 17.8276V22.2414C15.8 22.534 15.9159 22.8147 16.1222 23.0216C16.3285 23.2286 16.6083 23.3448 16.9 23.3448H20.9018C21.4164 23.3451 21.9146 23.5262 22.3098 23.8568L23.5066 24.8566C23.5424 24.444 23.731 24.0599 24.0352 23.7801C24.3395 23.5002 24.7372 23.3449 25.15 23.3448H25.7C25.9917 23.3448 26.2715 23.2286 26.4778 23.0216C26.6841 22.8147 26.8 22.534 26.8 22.2414V17.8276C26.8 17.5349 26.6841 17.2543 26.4778 17.0473C26.2715 16.8404 25.9917 16.7241 25.7 16.7241ZM22.4 11.2069H10.3C10.0083 11.2069 9.72847 11.3232 9.52218 11.5301C9.31589 11.737 9.2 12.0177 9.2 12.3103V20.0345C9.2 20.3271 9.31589 20.6078 9.52218 20.8147C9.72847 21.0217 10.0083 21.1379 10.3 21.1379H10.85C11.2876 21.1379 11.7073 21.3123 12.0167 21.6227C12.3262 21.9331 12.5 22.3541 12.5 22.7931V23.3448L13.611 22.5095C13.6037 22.4203 13.6001 22.3309 13.6 22.2414V17.8276C13.6 16.9496 13.9477 16.1076 14.5665 15.4868C15.1854 14.866 16.0248 14.5172 16.9 14.5172H23.5V12.3103C23.5 12.0177 23.3841 11.737 23.1778 11.5301C22.9715 11.3232 22.6917 11.2069 22.4 11.2069Z"
              fill="#C08A60"
            />
            <defs>
              <linearGradient id="chatBubbleBg" x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFE9D8" />
                <stop offset="1" stopColor="#FFF2E8" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span style={{ ...HAND, flex: 1, textAlign: "center", fontSize: 13.5, color: "#3a2d20", lineHeight: 1.2 }}>
          Your feedback helps us improve and takes less than a minute.
        </span>
      </div>

      <div style={{ flex: "none", height: 6 }} />
      </div>
    </div>
  );
}

/* =============================== screen 2 · survey =============================== */

/** Monochrome line-art icons for the survey chips (matches the Figma's tan outline glyphs). */
function TagIcon({ name, color }: { name: string; color: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
          <circle cx="7.5" cy="7.5" r="1.2" fill={color} stroke="none" />
        </svg>
      );
    case "badge":
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="6" />
          <path d="M8.5 14 7 22l5-2.7L17 22l-1.5-8" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4.5" />
          <circle cx="12" cy="16" r="1" fill={color} stroke="none" />
        </svg>
      );
    case "smile":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2" />
          <circle cx="9" cy="10" r="1" fill={color} stroke="none" />
          <circle cx="15" cy="10" r="1" fill={color} stroke="none" />
        </svg>
      );
    case "bulb":
      return (
        <svg {...common}>
          <path d="M9.5 18h5M10 21.5h4" />
          <path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.4h6c0-1 .3-1.8 1-2.4a6.5 6.5 0 0 0-4-11.6z" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20.5l1.8-5A8 8 0 1 1 21 11.5z" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z" />
          <path d="M2 21c0-3 1.9-5.4 5.1-6" />
        </svg>
      );
    case "fork":
      return (
        <svg {...common}>
          <path d="M6 2v6a2 2 0 0 0 4 0V2M8 8v14" />
          <path d="M16 2c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v11" />
        </svg>
      );
    case "pot":
      return (
        <svg {...common}>
          <path d="M3 10h18v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z" />
          <path d="M2 10h2M20 10h2M9 6.5C9 5 10.3 4 12 4s3 1 3 2.5" />
        </svg>
      );
    case "plate":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4.5" />
        </svg>
      );
    case "chili":
      return (
        <svg {...common}>
          <path d="M12 22c4 0 7-3 7-7 0-3.7-2.7-5.7-2.7-8.3 0 0-2 1.8-2.8 3.8-.8-1.7-.8-3.5-.8-5.5-3 2-4 5-4 8 0 1 0 2 .5 3C9.5 18 9 22 12 22z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" />
          <path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "thermo":
      return (
        <svg {...common}>
          <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
          <path d="M12 9v6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

/** Slug used to look up a chip's image asset, e.g. "Fresh Ingredients" → "fresh-ingredients". */
function chipSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Renders the exported art at /chips/<slug>.png, falling back to the supplied node
 * (SVG line icon or emoji) if that file is absent.
 */
function PngIcon({ slug, size = 26, fallback }: { slug: string; size?: number; fallback: ReactNode }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (imgFailed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/chips/${slug}.png`}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain" }}
      onError={() => setImgFailed(true)}
    />
  );
}

/** Survey-chip icon: Figma PNG when present, otherwise the built-in SVG line icon / emoji. */
function ChipIcon({ tag, color }: { tag: SurveyTag; color: string }) {
  return (
    <PngIcon
      slug={chipSlug(tag.label)}
      fallback={tag.icon ? <TagIcon name={tag.icon} color={color} /> : <span style={{ fontSize: 16, lineHeight: 1 }}>{tag.emoji}</span>}
    />
  );
}

function TagTile({ tag, on, onClick }: { tag: SurveyTag; on: boolean; onClick: () => void }) {
  const iconColor = on ? "#624630" : "#b08d62";
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "13px 14px",
        borderRadius: 12,
        cursor: "pointer",
        outline: "none",
        border: on ? "1px solid #624630" : "1px solid #E8DED2",
        background: on ? "#FFEBD9" : "#FFFCF9",
        transition: "all .16s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ flex: "none", display: "flex", alignItems: "center", color: iconColor }}>
        <ChipIcon tag={tag} color={iconColor} />
      </span>
      <span style={{ ...HAND, fontSize: 14, fontWeight: 400, color: on ? "#624630" : "#5b4d3d", lineHeight: 1.2 }}>
        {tag.label}
      </span>
    </button>
  );
}

function SurveyScreen({
  page,
  love,
  onToggle,
  onBack,
  onContinue,
}: {
  page: { title: string; subtitle: string; tags: SurveyTag[] };
  love: Record<string, boolean>;
  onToggle: (k: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
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
            <TagTile key={tag.label} tag={tag} on={!!love[tag.label]} onClick={() => onToggle(tag.label)} />
          ))}
        </div>
      </div>

      <div style={{ paddingTop: 14, flex: "none" }}>
        <button style={primaryBtn(count > 0)} onClick={onContinue} disabled={count === 0}>
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

/** Left/right chevron control for the review carousel. */
function CarouselArrow({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "left" ? "Previous" : "Next"}
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "absolute",
        top: "44%",
        left: dir === "left" ? -4 : undefined,
        right: dir === "right" ? -4 : undefined,
        transform: "translateY(-50%)",
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: "1px solid #e6dac6",
        background: "#fffdf8",
        color: "#6b5b49",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        boxShadow: "0 4px 12px rgba(30,18,8,0.18)",
        zIndex: 2,
        WebkitTapHighlightColor: "transparent",
        transition: "opacity .16s",
      }}
    >
      <svg width="9" height="14" viewBox="0 0 9 14" fill="none" style={{ transform: dir === "right" ? "rotate(180deg)" : "none" }}>
        <path d="M7 1 1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Five-star row under each review draft (filled = the customer's rating), using the
 *  exported /star.png art. */
function Stars({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src="/star.png"
          alt=""
          width={16}
          height={16}
          style={{ display: "block", opacity: i < value ? 1 : 0.3 }}
        />
      ))}
    </div>
  );
}

function ReviewScreen({
  businessName,
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
  const useSample = sampleReviewsEnabled && sampleReviews.length > 0 && stars >= sampleReviewThreshold;
  const options = useSample ? sampleReviews : composeVariants(businessName, picks, stars);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedReview = options[selectedIdx] ?? options[0];

  // The customer can tweak the chosen draft right here before posting; `reviewText`
  // holds the live, editable copy and is what we copy / hand off to Google.
  const [reviewText, setReviewText] = useState(selectedReview);
  const [copied, setCopied] = useState(false);
  // All drafts live in the horizontal carousel — swipe or use the side arrows.
  const visibleOptions = options;

  // Editable draft auto-grows to fit its text so there's no inner scrollbar.
  const editRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = editRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [reviewText]);

  // Horizontal carousel: keep the selected card scrolled into the centre.
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    cardRefs.current[selectedIdx]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedIdx]);
  function step(dir: number) {
    setSelectedIdx((i) => Math.min(visibleOptions.length - 1, Math.max(0, i + dir)));
  }

  // Best-effort auto-copy on mount/selection. Mobile browsers often block clipboard
  // writes that aren't tied to a tap, so we only claim success when it actually worked.
  useEffect(() => {
    setReviewText(selectedReview);
    let active = true;
    setCopied(false);
    void copyToClipboard(selectedReview).then((ok) => {
      if (active && ok) setCopied(true);
    });
    return () => {
      active = false;
    };
  }, [selectedReview]);

  async function openGoogle() {
    // Copy on the tap itself — the gesture browsers trust most.
    await copyToClipboard(reviewText);
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
        <TitleBlock title="Share your experience" subtitle="Choose one option below. You can still edit before posting." />
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingRight: 2 }}>
        {/* horizontal draft carousel — a peeking next card + side arrows (Figma) */}
        <div style={{ position: "relative" }}>
          <div
            className="hide-scroll"
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              padding: "2px 2px 4px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {visibleOptions.map((opt, i) => {
              const sel = i === selectedIdx;
              return (
                <button
                  key={i}
                  type="button"
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    position: "relative",
                    flex: "0 0 86%",
                    scrollSnapAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 6,
                    textAlign: "left",
                    background: sel ? "#FFEBD9" : "#fbf4e8",
                    border: `1px solid ${sel ? "#C08A60" : "#ebdfcb"}`,
                    borderRadius: 12,
                    padding: "14px 42px 14px 15px",
                    cursor: "pointer",
                    outline: "none",
                    overflow: "hidden",
                    filter: sel ? "none" : "grayscale(1)",
                    boxShadow: sel ? "0 10px 24px rgba(160,115,60,0.16)" : "none",
                    transition: "border-color .16s, box-shadow .16s, background .16s, filter .16s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* faint botanical line-art behind the draft (Figma) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/leaf-decoration.svg"
                    alt=""
                    aria-hidden
                    style={{
                      position: "absolute",
                      bottom: -28,
                      right: -22,
                      height: 150,
                      width: "auto",
                      opacity: sel ? 0.6 : 0.35,
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 11px",
                      borderRadius: 999,
                      border: `1px solid ${sel ? "#C99A5E" : "#D8C3A0"}`,
                      background: sel ? "#FBEFDD" : "transparent",
                      fontSize: 10,
                      fontWeight: 700,
                      fontStyle: "italic",
                      letterSpacing: "0.6px",
                      color: sel ? "#9c6f3f" : "#b0a28e",
                      textTransform: "uppercase",
                    }}
                  >
                    OPTION {i + 1}
                  </div>
                  <div style={{ ...HAND, position: "relative", zIndex: 1, fontSize: 13.5, lineHeight: 1.45, color: "#4a3b2c", userSelect: "text" }}>{opt}</div>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <Stars value={stars} />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/quotes.png"
                    alt=""
                    aria-hidden
                    width={32}
                    height={26}
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 14,
                      zIndex: 1,
                      display: "block",
                      objectFit: "contain",
                      opacity: sel ? 1 : 0.55,
                    }}
                  />
                </button>
              );
            })}
          </div>

          {visibleOptions.length > 1 && (
            <>
              <CarouselArrow dir="left" disabled={selectedIdx === 0} onClick={() => step(-1)} />
              <CarouselArrow dir="right" disabled={selectedIdx === visibleOptions.length - 1} onClick={() => step(1)} />
            </>
          )}
        </div>

        {/* edit-on-Google preview */}
        <div
          style={{
            marginTop: 12,
            background: "rgba(199,154,94,0.08)",
            border: "1px dashed rgba(199,154,94,0.45)",
            borderRadius: 14,
            padding: "12px 13px",
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#5b4d3d" }}>Want to edit?</div>
          <div style={{ fontSize: 11, color: "#9a8c7a", marginTop: 2, fontWeight: 500 }}>
            {copied ? "Copied — edit it here, or tweak it on Google before posting." : "Edit it here, or tweak it on Google before posting."}
          </div>
          <textarea
            ref={editRef}
            value={reviewText}
            onChange={(e) => {
              setReviewText(e.target.value);
              setCopied(false);
            }}
            aria-label="Edit your review"
            style={{
              ...HAND,
              marginTop: 9,
              width: "100%",
              minHeight: 96,
              background: "#fffdf8",
              border: "1px solid #ebdfcb",
              borderRadius: 11,
              padding: 11,
              fontSize: 13,
              lineHeight: 1.4,
              color: "#4a3b2c",
              resize: "none",
              outline: "none",
              overflow: "hidden",
            }}
          />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/devicon_google.png" alt="" width={14} height={14} style={{ display: "block", objectFit: "contain" }} />
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
        <h1 style={{ ...DISPLAY, fontSize: 23, marginTop: 8, lineHeight: 1.2, color: "#202020" }}>
          We&apos;re sorry we missed the mark
        </h1>
        <p style={{ ...UI, fontSize: 12.5, color: "#6b5f52", marginTop: 7, fontWeight: 400, lineHeight: 1.45 }}>
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
      <h1 style={{ ...DISPLAY, fontSize: 24, marginTop: 20, color: "#202020" }}>
        Sent to the manager
      </h1>
      <p style={{ ...UI, fontSize: 13, color: "#6b5f52", marginTop: 10, fontWeight: 400, lineHeight: 1.5, maxWidth: 280 }}>
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
