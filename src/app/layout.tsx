import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewLoop — QR Review & Feedback Platform",
  description:
    "Frictionless, policy-compliant Google reviews and private feedback for local businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. Liner, BeFrugal) inject
    // attributes onto <html>/<body> before hydration. This silences that benign
    // attribute mismatch at the document level only — it does not affect the app tree.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
