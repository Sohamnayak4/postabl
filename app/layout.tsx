import type { Metadata } from "next";
import "./globals.css";
import { NotifyProvider } from "@/components/notify";

// metadataBase makes file-convention images (app/icon.tsx,
// app/opengraph-image.tsx, app/twitter-image.tsx) resolve to absolute
// URLs in the <meta> tags that crawlers and link unfurlers look at.
// Without this, Next emits a build-time warning and Slack/X previews
// show as a broken image.
//
// Normalize NEXT_PUBLIC_SITE_URL — Vercel users routinely paste the
// bare hostname (e.g. "postabl.vercel.app"), but `new URL()` requires
// a protocol or it throws ERR_INVALID_URL at build time.
function normalizeSiteUrl(raw: string | undefined): string {
  const fallback = "https://postabl.xyz";
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

const description =
  "The fastest way to turn raw screenshots into scroll-stopping images for X, LinkedIn, and the rest of the internet.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Postabl — Make your screenshots postabl",
    template: "%s · Postabl",
  },
  description,
  applicationName: "Postabl",
  authors: [{ name: "Soham Nayak", url: "https://x.com/soham_nayak04" }],
  creator: "Soham Nayak",
  keywords: [
    "screenshot",
    "screenshot editor",
    "beautify screenshots",
    "twitter screenshots",
    "linkedin screenshots",
    "code screenshots",
    "postabl",
  ],
  openGraph: {
    title: "Postabl — Make your screenshots postabl",
    description,
    url: siteUrl,
    siteName: "Postabl",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Postabl — Make your screenshots postabl",
    description,
    creator: "@soham_nayak04",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=JetBrains+Mono:wght@400;500&family=Geist:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <NotifyProvider>{children}</NotifyProvider>
      </body>
    </html>
  );
}
