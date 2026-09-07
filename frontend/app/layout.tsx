import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Clone",
  description: "A Signal-inspired real-time messaging application.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
