import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthHashErrorBanner } from "@/components/auth/auth-hash-error-banner";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { getSiteUrl } from "@/lib/site";
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
  applicationName: "Uniwork",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Uniwork",
  },
  title: "Uniwork | Foreign student jobs in Korea",
  description:
    "외국인 유학생을 위한 아르바이트 구인구직과 행정 상담 연결 서비스",
  metadataBase: getSiteUrl(),
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthHashErrorBanner />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
