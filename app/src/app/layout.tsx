import { esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cocapital-five.vercel.app"),
  title: "CoCapital",
  description: "Capital compartido, claro para los dos.",
  openGraph: {
    title: "CoCapital",
    description:
      "Shared capital for small partnerships: log every sale, loan and payment, and always know where the money is.",
    siteName: "CoCapital",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={esES}
      appearance={{
        theme: dark,
        variables: { colorPrimary: "#34d399" },
      }}
    >
      <html
        lang="es"
        className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {children}
          <Toaster theme="dark" position="bottom-center" />
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
