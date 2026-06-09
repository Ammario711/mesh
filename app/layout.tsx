import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mesh",
  description: "Decentralized B2B manufacturing marketplace MVP",
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
