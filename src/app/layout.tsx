import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RequireAuth from "./auth/RequireAuth";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CXR Triage — AI-Powered Chest X-Ray Triage",
  description: "AI-powered emergency radiology triage system for chest X-rays. Detects pneumothorax, pneumonia, and lung nodules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <RequireAuth>{children}</RequireAuth>
      </body>
    </html>
  );
}
