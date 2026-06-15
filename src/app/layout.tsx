import type { Metadata } from "next";
import "./globals.css";
import { GOOGLE_FONTS_HREF } from "@/lib/textFonts";

export const metadata: Metadata = {
  title: "AI Video Studio",
  description: "AI Video Generation Platform for Business Advertising",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_HREF} rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
