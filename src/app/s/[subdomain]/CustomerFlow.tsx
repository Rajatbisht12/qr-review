"use client";

import { useEffect, useRef, useState } from "react";
import { recordEvent, submitFeedback } from "./actions";

type Props = {
  subdomain: string;
  businessName: string;
  category: string;
  googleReviewUrl: string;
  logoUrl: string | null;
  welcomeMessage: string;
  thankYouMessage: string;
  prompts: string[];
  // Optional "sample reviews" feature (opt-in per tenant). See compliance note in AssistStep.
  sampleReviewsEnabled: boolean;
  sampleReviewThreshold: number;
  sampleReviews: string[];
};

type Step = "rating" | "choose" | "assist" | "private" | "thanks";

export default function CustomerFlow(props: Props) {
  const [step, setStep] = useState<Step>("rating");
  const [rating, setRating] = useState<number>(0);
  const scanFired = useRef(false);

  // Track the scan exactly once when the page loads (PRD 6.6 funnel).
  useEffect(() => {
    if (scanFired.current) return;
    scanFired.current = true;
    void recordEvent(props.subdomain, "scan");
  }, [props.subdomain]);

  function chooseRating(value: number) {
    setRating(value);
    void recordEvent(props.subdomain, "rating", value);
    setStep("choose");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <BrandHeader logoUrl={props.logoUrl} businessName={props.businessName} />

      <div className="mt-6 flex-1">
        {step === "rating" && (
          <RatingStep welcome={props.welcomeMessage} onPick={chooseRating} />
        )}
        {step === "choose" && (
          <ChooseStep
            rating={rating}
            businessName={props.businessName}
            onGoogle={() => setStep("assist")}
            onPrivate={() => setStep("private")}
          />
        )}
        {step === "assist" && (
          <AssistStep
            {...props}
            rating={rating}
            onBack={() => setStep("choose")}
            onPrivate={() => setStep("private")}
          />
        )}
        {step === "private" && (
          <PrivateStep
            {...props}
            rating={rating}
            onDone={() => setStep("thanks")}
            onGoogle={() => setStep("assist")}
          />
        )}
        {step === "thanks" && <ThanksStep message={props.thankYouMessage} />}
      </div>

      <ComplianceFooter />
    </div>
  );
}

function BrandHeader({ logoUrl, businessName }: { logoUrl: string | null; businessName: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={businessName} className="h-16 w-16 rounded-2xl object-cover" />
      ) : (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
          style={{ background: "var(--brand-primary)" }}
        >
          {businessName.charAt(0)}
        </div>
      )}
      <h1 className="mt-3 text-xl font-bold text-slate-900">{businessName}</h1>
    </div>
  );
}

function RatingStep({ welcome, onPick }: { welcome: string; onPick: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="animate-in text-center">
      <h2 className="text-2xl font-semibold text-slate-900">{welcome}</h2>
      <p className="mt-2 text-slate-500">Tap a star to start.</p>
      <div className="mt-8 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onPick(n)}
            className="text-5xl transition-transform hover:scale-110 focus:outline-none focus-visible:scale-110"
            style={{ color: n <= hover ? "var(--brand-primary)" : "#cbd5e1" }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Both paths are offered to EVERY rating (PRD C1/C5). The Google CTA is always
 * present and full-strength. A low rating only makes the private option visually
 * more prominent — it never demotes or hides the Google link.
 */
function ChooseStep({
  rating,
  businessName,
  onGoogle,
  onPrivate,
}: {
  rating: number;
  businessName: string;
  onGoogle: () => void;
  onPrivate: () => void;
}) {
  const lowRating = rating > 0 && rating <= 2;

  const googleCard = (
    <button
      onClick={onGoogle}
      className="w-full rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition hover:ring-brand"
    >
      <p className="text-lg font-semibold text-slate-900">⭐ Share your experience on Google</p>
      <p className="mt-1 text-sm text-slate-500">
        Help others discover {businessName}. You&apos;ll write it in your own words.
      </p>
      <span className="mt-3 inline-block font-medium text-brand">Write a Google review →</span>
    </button>
  );

  const privateCard = (
    <button
      onClick={onPrivate}
      className={`w-full rounded-2xl border-2 p-5 text-left shadow-sm transition hover:ring-brand ${
        lowRating ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-lg font-semibold text-slate-900">✉️ Send private feedback</p>
      <p className="mt-1 text-sm text-slate-500">
        Tell the manager directly — only they will see it.
      </p>
      <span className="mt-3 inline-block font-medium text-brand">Message the manager →</span>
    </button>
  );

  return (
    <div className="animate-in">
      <h2 className="text-center text-xl font-semibold text-slate-900">
        Thanks! What would you like to do?
      </h2>
      <p className="mt-1 text-center text-sm text-slate-500">Both options are open to everyone.</p>
      <div className="mt-6 space-y-4">
        {/* Order flips for low ratings to surface the private channel, but the
            Google option is always shown with equal access. */}
        {lowRating ? (
          <>
            {privateCard}
            {googleCard}
          </>
        ) : (
          <>
            {googleCard}
            {privateCard}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * "Assist, don't author" (PRD C2/C3): open-ended prompts + voice-to-text help the
 * customer compose THEIR OWN words. The app never generates review text for them.
 */
function AssistStep({
  subdomain,
  googleReviewUrl,
  prompts,
  rating,
  sampleReviewsEnabled,
  sampleReviewThreshold,
  sampleReviews,
  onBack,
  onPrivate,
}: Props & { rating: number; onBack: () => void; onPrivate: () => void }) {
  // Opt-in "sample reviews": shown only when the business enabled it and the rating
  // meets its threshold (e.g. 3★+). Customers copy a sample to paste into Google.
  const showSamples =
    sampleReviewsEnabled && rating >= sampleReviewThreshold && sampleReviews.length > 0;
  const [notes, setNotes] = useState("");
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
    setSpeechSupported(Boolean(w.webkitSpeechRecognition || w.SpeechRecognition));
  }, []);

  function toggleVoice() {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      (recognitionRef.current as SpeechRecognitionLike | null)?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: SpeechResultEventLike) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setNotes((prev) => (prev ? prev + " " : "") + text.trim());
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function openGoogle() {
    void recordEvent(subdomain, "google_cta_click", rating);
    const url = googleReviewUrl || "https://www.google.com/maps";
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyOwnWords() {
    if (!notes.trim()) return;
    try {
      await navigator.clipboard.writeText(notes.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked; the user can still select & copy manually */
    }
  }

  return (
    <div className="animate-in">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">
        ← Back
      </button>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">Write your Google review</h2>
      <p className="mt-1 text-sm text-slate-500">
        These are just ideas to jog your memory. Write whatever is true for you.
      </p>

      {showSamples && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">Sample reviews</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Tap to copy one, then paste it on Google — or edit it to match your own experience.
          </p>
          <div className="mt-3 space-y-2">
            {sampleReviews.map((text, i) => (
              <SampleReviewCard key={i} text={text} />
            ))}
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {prompts.map((p) => (
          <li
            key={p}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            💭 {p}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <label className="text-sm font-medium text-slate-700">Your own words (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Jot down your thoughts here…"
          className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus-visible:ring-brand"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {speechSupported && (
            <button
              onClick={toggleVoice}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                listening ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {listening ? "● Stop voice" : "🎙️ Speak instead"}
            </button>
          )}
          {notes.trim() && (
            <button
              onClick={copyOwnWords}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
            >
              {copied ? "Copied your words ✓" : "Copy my words"}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          We never write the review for you. The words are always yours.
        </p>
      </div>

      <button
        onClick={openGoogle}
        className="btn-brand mt-5 w-full rounded-xl py-3.5 text-center font-semibold"
      >
        Open Google review →
      </button>

      <button
        onClick={onPrivate}
        className="mt-3 w-full rounded-xl border border-slate-300 py-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Or send private feedback to the manager instead
      </button>
    </div>
  );
}

function SampleReviewCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked; the user can still select & copy manually */
    }
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm text-slate-700">{text}</p>
      <button
        onClick={copy}
        className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

function PrivateStep({
  subdomain,
  rating,
  onDone,
  onGoogle,
}: Props & { rating: number; onDone: () => void; onGoogle: () => void }) {
  const [feedbackText, setFeedbackText] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [contactName, setName] = useState("");
  const [contactPhone, setPhone] = useState("");
  const [contactEmail, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await submitFeedback({
      subdomain,
      rating,
      feedbackText,
      contactName,
      contactPhone,
      contactEmail,
    });
    setSubmitting(false);
    if (res.ok) onDone();
    else setError(res.error ?? "Something went wrong. Please try again.");
  }

  return (
    <div className="animate-in">
      <h2 className="text-xl font-semibold text-slate-900">Private feedback to the manager</h2>
      <p className="mt-1 text-sm text-slate-500">
        Only the manager sees this. It won&apos;t be posted publicly.
      </p>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        What would you like them to know?
      </label>
      <textarea
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        rows={4}
        placeholder="Tell the manager what happened…"
        className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus-visible:ring-brand"
      />

      {!showContact ? (
        <button
          onClick={() => setShowContact(true)}
          className="mt-3 text-sm font-medium text-brand"
        >
          + Add contact details (optional, for follow-up)
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={contactName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
          <input
            value={contactPhone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
          <input
            value={contactEmail}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          />
          <p className="text-xs text-slate-400">
            Contact details are optional and used only to follow up with you.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting || !feedbackText.trim()}
        className="btn-brand mt-5 w-full rounded-xl py-3.5 text-center font-semibold disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send to manager"}
      </button>

      <button
        onClick={onGoogle}
        className="mt-3 w-full rounded-xl border border-slate-300 py-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Share on Google as well →
      </button>
    </div>
  );
}

function ThanksStep({ message }: { message: string }) {
  return (
    <div className="animate-in flex flex-col items-center pt-12 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full text-4xl text-white"
        style={{ background: "var(--brand-primary)" }}
      >
        ✓
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-slate-900">{message}</h2>
      <p className="mt-2 text-slate-500">Your input helps the team improve. Have a great day!</p>
    </div>
  );
}

function ComplianceFooter() {
  return (
    <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-400">
      Reviews are your own honest words. We never write, edit, filter, or pay for reviews, and the
      Google option is offered to everyone equally.
    </p>
  );
}

// --- Minimal types for the Web Speech API (not in lib.dom for all targets). ---
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
}
interface SpeechResultEventLike {
  resultIndex: number;
  results: Array<Array<{ transcript: string }>>;
}
