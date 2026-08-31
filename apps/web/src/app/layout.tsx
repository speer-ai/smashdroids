import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smash Droids",
  description: "Command AI droid armies across a spherical hex world in sequential tactical turns.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
