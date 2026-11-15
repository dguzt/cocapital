import { enUS, esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { dictionaries } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/get-locale";
import { I18nProvider } from "@/i18n/i18n-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const clerkLocalization = { es: esES, en: enUS };

/**
 * Title, description and link preview in the visitor's language.
 * @returns the page metadata
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = dictionaries[locale];
  const image = {
    url: `/og/${locale}`,
    width: 1200,
    height: 630,
    alt: t.og.alt,
  };

  return {
    metadataBase: new URL("https://cocapital-five.vercel.app"),
    title: "CoCapital",
    description: t.meta.description,
    openGraph: {
      title: "CoCapital",
      description: t.meta.description,
      siteName: "CoCapital",
      type: "website",
      locale: locale === "es" ? "es_PE" : "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      images: [image],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <ClerkProvider
      localization={clerkLocalization[locale]}
      appearance={{
        theme: dark,
        variables: { colorPrimary: "#34d399" },
      }}
    >
      <html
        lang={locale}
        className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <I18nProvider locale={locale}>{children}</I18nProvider>
          <Toaster theme="dark" position="bottom-center" />
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
