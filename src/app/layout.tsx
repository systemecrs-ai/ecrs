import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StyleAI — Intelligent Apparel Shopping Assistant",
  description:
    "Your AI-powered personal stylist. Get curated apparel recommendations powered by RAG-enhanced Nvidia Nemotron AI and real-time inventory search.",
  keywords: [
    "AI shopping assistant",
    "apparel recommendations",
    "fashion AI",
    "StyleAI",
    "RAG",
    "Nvidia Nemotron",
  ],
  authors: [{ name: "ECRS" }],
  openGraph: {
    title: "StyleAI — Intelligent Apparel Shopping Assistant",
    description:
      "Get curated fashion recommendations powered by RAG-enhanced Nvidia Nemotron AI.",
    type: "website",
  },
};

import { createClient } from '@/utils/supabase/server';
import AuthWall from '@/components/ui/AuthWall';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {!user && <AuthWall />}
        {user && children}
      </body>
    </html>
  );
}
