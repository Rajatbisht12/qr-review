import type { Metadata } from "next";
import { Marcellus, Manrope, Itim, Kalam, Roboto } from "next/font/google";
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
// Customer-flow fonts taken straight from the Figma: Itim for headings,
// Kalam for handwritten body text, Roboto for sub-headers and small labels.
const itim = Itim({ subsets: ["latin"], weight: "400", variable: "--font-itim", display: "swap" });
const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-kalam", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${marcellus.variable} ${manrope.variable} ${itim.variable} ${kalam.variable} ${roboto.variable}`}
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
