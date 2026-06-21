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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <form
        action={action}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
      >
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

        <input type="hidden" name="next" value={next} />
        {expectAdmin && <input type="hidden" name="expectAdmin" value="1" />}

        <label className="mt-5 block text-sm font-medium text-slate-700">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
        />

        {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>

        {hint && <p className="mt-4 text-center text-xs text-slate-400">{hint}</p>}
      </form>
    </main>
  );
}
