import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OYA - AI Meeting Copilot",
  description:
    "OYA is a voice-native AI participant powered by IronHeart.AI Human-Computer Interface Runtime.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
