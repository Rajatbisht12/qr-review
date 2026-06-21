"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession } from "@/lib/auth";

/** Log in. `next` is where to send the user on success. */
export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const expectAdmin = formData.get("expectAdmin") === "1";

  const session = await authenticate(email, password);
  if (!session) return { error: "Invalid email or password." };
  if (expectAdmin && session.role !== "admin") {
    return { error: "This account is not an admin." };
  }
  await createSession(session);
  redirect(next);
}

export async function logoutAction(redirectTo: string) {
  await destroySession();
  redirect(redirectTo);
}
