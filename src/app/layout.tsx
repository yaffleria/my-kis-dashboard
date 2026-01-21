import type { Metadata } from "next";
import "./globals.css";
import { Providers, EnvInitializer } from "@/components";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  title: "Charlotte",
  description: "Advanced Portfolio Visualization",
  icons: {
    icon: "/my-kis-dashboard-logo.jpg",
  },
  openGraph: {
    title: "Charlotte",
    description: "Advanced Portfolio Visualization",
    url: "/",
    siteName: "Charlotte",
    images: [
      {
        url: "/banner.jpg",
        width: 1200,
        height: 630,
        alt: "Charlotte Dashboard",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Charlotte",
    description: "Advanced Portfolio Visualization",
    images: ["/banner.jpg"],
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
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body
        className="antialiased min-h-screen selection:bg-primary/30 bg-background text-foreground overflow-hidden font-sans"
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
                    }),
                  ),
                );
              } catch {
                return undefined;
              }
            })()}
          />

          <main className="relative w-full h-screen overflow-hidden">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
