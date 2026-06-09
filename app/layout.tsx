import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ironheart-next-hackathon-human-comp.vercel.app"),
  title: "OYA - AI Meeting Copilot",
  description:
    "OYA is a voice-native AI Digital Employee that joins meetings, listens, speaks, remembers, and summarizes in real time.",
  openGraph: {
    title: "OYA - AI Meeting Copilot",
    description:
      "The first AI Digital Employee powered by IronHeart.AI Human-Computer Interface Runtime.",
    images: ["/assets/character.jpg"],
  },
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
