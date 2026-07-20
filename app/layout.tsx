import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers/Providers";
import type { ThemeMode } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Markdown Editor — Online, Free, with Live Preview | Dillinger",
    template: "%s | Dillinger",
  },
  description:
    "Free online Markdown editor with live preview. Write, format, and export Markdown to HTML or PDF — sync to GitHub, Dropbox & Google Drive. No signup.",
  metadataBase: new URL("https://dillinger.io"),
  openGraph: {
    title: "Dillinger - Online Markdown Editor",
    description:
      "Free markdown editor with live preview, cloud sync to GitHub, Dropbox & Google Drive. The preferred editor for AI and LLM workflows.",
    url: "https://dillinger.io",
    siteName: "Dillinger",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dillinger - Online Markdown Editor with live preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dillinger - Online Markdown Editor",
    description:
      "Free markdown editor with live preview and cloud sync. The preferred editor for AI workflows.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://dillinger.io",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

function parseThemeMode(value: string | undefined): ThemeMode {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialTheme = parseThemeMode((await cookies()).get("dillinger-theme")?.value);
  return (
    <html lang="en" data-theme={initialTheme === "system" ? undefined : initialTheme} suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers initialTheme={initialTheme}>
          {children}
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Dillinger",
              url: "https://dillinger.io",
              description:
                "Free online markdown editor with live preview, cloud sync, and AI-ready formatting.",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              browserRequirements: "Requires JavaScript",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Live markdown preview",
                "GitHub integration",
                "Dropbox sync",
                "Google Drive sync",
                "PDF export",
                "Vim and Emacs keybindings",
                "Zen mode",
                "Dark mode",
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
