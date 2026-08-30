import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smash Droids",
  description: "Field an army of AI agents and battle your friends on the grid.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
