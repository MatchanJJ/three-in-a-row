import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Three in a Row — A little friendly competition",
  description:
    "A playful, two-player tic-tac-toe game. Pick a seat, take a turn, and make your three.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
