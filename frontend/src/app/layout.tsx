import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AIverse — Your Multi-Modal AI Workspace",
    template: "%s | AIverse"
  },
  description: "AIverse is a unified AI workspace for chat, code generation, image creation, and video production — powered by the world's most advanced AI models.",
  keywords: ["AI workspace", "chat AI", "code generation", "image generation", "AI tools", "multi-modal AI"],
  authors: [{ name: "AIverse" }],
  creator: "AIverse",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aiverse.app",
    title: "AIverse — Your Multi-Modal AI Workspace",
    description: "Chat. Code. Create. All in one AI-powered workspace.",
    siteName: "AIverse",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIverse — Your Multi-Modal AI Workspace",
    description: "Chat. Code. Create. All in one AI-powered workspace.",
    creator: "@aiverse",
  },
  robots: { index: true, follow: true },
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
