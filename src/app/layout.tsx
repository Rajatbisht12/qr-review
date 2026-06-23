import type { Metadata } from "next";
import { Marcellus, Manrope } from "next/font/google";
import "./globals.css";

// Display serif for brand names, Manrope for everything else — matches the hi-fi design.
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning className={`${marcellus.variable} ${manrope.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
