import type { Metadata, Viewport } from "next";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/big-shoulders-display/900";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { heroImage } from "@/lib/assets";

export async function generateMetadata(): Promise<Metadata> {
  const og = heroImage("og-image.jpg");
  return {
    title: { default: `${siteConfig.name} — Behind the mask`, template: `%s · ${siteConfig.name}` },
    description: siteConfig.description,
    openGraph: { title: siteConfig.name, description: siteConfig.description, images: og ? [{ url: og, width: 1200, height: 630 }] : [] },
  };
}

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-ink text-bone antialiased">{children}</body>
    </html>
  );
}
