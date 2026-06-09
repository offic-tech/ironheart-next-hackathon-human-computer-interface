import type { Metadata } from "next";
import Script from "next/script";
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
  const backendUrl =
    process.env.NEXT_PUBLIC_IRONHEART_BACKEND_URL ||
    "https://backend.funtimewithaisolutions.com";
  const firebaseKey =
    process.env.NEXT_PUBLIC_FIREBASE_KEY ||
    "AIzaSyCWTgYvZ7TnYQiVdvJNDysBrzjNojxj2_s";

  return (
    <html lang="en">
      <body>
        <Script
          id="ironheart-runtime-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `var BACKEND_URL=${JSON.stringify(backendUrl)};var FIREBASE_KEY=${JSON.stringify(firebaseKey)};window.BACKEND_URL=BACKEND_URL;window.FIREBASE_KEY=FIREBASE_KEY;`,
          }}
        />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Script src="https://backend.funtimewithaisolutions.com/sdk/history.js" strategy="beforeInteractive" />
        <Script src="https://backend.funtimewithaisolutions.com/sdk/audio.js" strategy="beforeInteractive" />
        <Script src="https://backend.funtimewithaisolutions.com/sdk/sdk.js" strategy="beforeInteractive" />
        <Script
          id="ironheart-runtime-global-bridge"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.CallManager=typeof CallManager!=="undefined"?CallManager:window.CallManager;window.AudioClient=typeof AudioClient!=="undefined"?AudioClient:window.AudioClient;`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
