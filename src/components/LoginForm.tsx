"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/auth-actions";

export default function LoginForm({
  title,
  subtitle,
  next,
  expectAdmin,
  hint,
}: {
  title: string;
  subtitle: string;
  next: string;
  expectAdmin?: boolean;
  hint?: string;
}) {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <main className="warm-page flex items-center justify-center px-5">
      <form action={action} className="warm-card animate-in w-full max-w-sm p-7">
        <h1 className="font-serif text-2xl tracking-tight text-[var(--ink)]">{title}</h1>
        <p className="warm-muted mt-1.5 text-sm">{subtitle}</p>

        <input type="hidden" name="next" value={next} />
        {expectAdmin && <input type="hidden" name="expectAdmin" value="1" />}

        <label className="warm-label mt-5">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="warm-input mt-1.5"
        />

        <label className="warm-label mt-4">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="warm-input mt-1.5"
        />

        {state?.error && (
          <p className="mt-3 text-sm font-semibold" style={{ color: "#c0392b" }}>
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="warm-btn mt-5 w-full">
          {pending ? "Signing in…" : "Sign in"}
        </button>

        {hint && <p className="warm-muted mt-4 text-center text-xs">{hint}</p>}
      </form>
    </main>
  );
}
