import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ChatWidget } from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: { default: "Cynbit Technologies — AI automation & software (prototype)", template: "%s · Cynbit (prototype)" },
  description:
    "Prototype improvements for cynbit.in: an AI Project Blueprint builder with instant estimates and call booking, an 'Ask Cynbit' site assistant, and the BitElevate Path Finder.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#070a12", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn-primary">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <ChatWidget />
      </body>
    </html>
  );
}
