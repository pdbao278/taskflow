import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { Providers } from "./components/Providers";
import { ToastContainer } from "./components/ToastContainer";
import { OfflineBanner } from "./components/OfflineBanner";

export const metadata: Metadata = {
  title: "TaskFlow — Team Productive Workspace",
  description: "Quản lý công việc team hiệu quả, đơn giản và tốc độ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GlobalErrorBoundary>
          <Providers>{children}</Providers>
        </GlobalErrorBoundary>
        <ToastContainer />
        <OfflineBanner />
      </body>
    </html>
  );
}
