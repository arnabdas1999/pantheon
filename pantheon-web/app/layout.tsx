import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Pantheon — Startup Idea Validator",
    template: "%s | The Pantheon",
  },
  description:
    "Stress-test any startup idea in under 2 minutes. 7 AI agents tear it apart across market, technical, GTM, financial, and risk dimensions.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://pantheon.app"
  ),
  openGraph: {
    type: "website",
    siteName: "The Pantheon",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@thepantheonai",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
