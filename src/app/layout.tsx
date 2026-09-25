import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Norou AI",
  description: "A premium productivity, fitness and lifestyle app with lightweight RPG progression and a built-in AI assistant.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Required on iOS so the app draws edge-to-edge under the notch and
  // home indicator; safe-area insets in globals.css keep content clear.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
