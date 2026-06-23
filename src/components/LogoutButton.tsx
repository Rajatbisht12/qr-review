"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/auth-actions";

export default function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => logoutAction(redirectTo))}
      disabled={pending}
      className="warm-btn-ghost"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}
