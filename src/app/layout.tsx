import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientSessionProvider } from "@/components/providers/session-provider";
import { UserPlanProvider } from "@/lib/subscription/hooks/useUserPlan";
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
  title: "字流 - AI驱动的多平台内容发布工具",
  description: "让文字如流水般顺畅地流向每个平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientSessionProvider>
          <UserPlanProvider>
            {children}
          </UserPlanProvider>
        </ClientSessionProvider>
      </body>
    </html>
  );
}
