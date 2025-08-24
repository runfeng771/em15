import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "多账号邮件客户端HH@by测试组🟢Steven",
  description: "多账号邮件客户端，支持实时邮件同步和管理",
  keywords: ["邮件客户端", "多账号", "邮件同步", "IMAP", "SMTP"],
  authors: [{ name: "HH@by测试组" }],
  openGraph: {
    title: "多账号邮件客户端HH@by测试组🟢Steven",
    description: "多账号邮件客户端，支持实时邮件同步和管理",
    url: "https://chat.z.ai",
    siteName: "多账号邮件客户端",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "多账号邮件客户端HH@by测试组🟢Steven",
    description: "多账号邮件客户端，支持实时邮件同步和管理",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
