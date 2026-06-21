"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/auth-actions";

export default function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => logoutAction(redirectTo))}
      disabled={pending}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}
