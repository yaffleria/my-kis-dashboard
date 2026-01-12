import type { Metadata } from "next";
import "./globals.css";
import { Providers, EnvInitializer } from "@/components";
import { FloatingNav } from "@/components/layout/FloatingNav";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  title: "Blanc",
  description: "Advanced Portfolio Visualization",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Blanc",
    description: "Advanced Portfolio Visualization",
    url: "/",
    siteName: "Blanc",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Blanc Dashboard",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blanc",
    description: "Advanced Portfolio Visualization",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.cdnfonts.com/css/inter" rel="stylesheet" />
      </head>
      <body
        className="antialiased min-h-screen selection:bg-violet-500/30 bg-black text-foreground overflow-hidden"
        suppressHydrationWarning
      >
        <Providers>
          {/* Environment safe-guarding */}
          <EnvInitializer
            envAccountsJson={(() => {
              try {
                const raw = process.env.KIS_ACCOUNTS;
                if (!raw) return undefined;
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) return undefined;
                return JSON.stringify(
                  parsed.map(
                    (acc: {
                      accountNo: string;
                      productCode: string;
                      accountName?: string;
                      name?: string;
                      isPension?: boolean;
                    }) => ({
                      accountNo: acc.accountNo,
                      productCode: acc.productCode,
                      accountName: acc.accountName || acc.name,
                      isPension:
                        acc.isPension ??
                        ["22", "29"].includes(String(acc.productCode || "")),
                    })
                  )
                );
              } catch {
                return undefined;
              }
            })()}
          />

          <main className="relative w-full h-screen overflow-hidden">
            {children}
          </main>

          <FloatingNav />
        </Providers>
      </body>
    </html>
  );
}
