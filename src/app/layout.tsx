import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
      className={`${sora.variable} ${dmSans.variable} h-full antialiased`}
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
