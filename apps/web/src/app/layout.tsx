import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smash Droids — Planetary AI Grand Strategy",
  description: "Build a civilization, command an AI war cabinet, and conquer a deterministic world with no edge.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
