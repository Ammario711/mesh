import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mesh-marketplace-mvp.vercel.app"),
  title: "Mesh",
  description: "Decentralized B2B manufacturing marketplace MVP",
  openGraph: {
    title: "Mesh",
    description:
      "Upload CAD files, get instant manufacturing quotes, and match with local 3D printer and CNC operators.",
    siteName: "Mesh",
    type: "website",
    url: "https://mesh-marketplace-mvp.vercel.app",
  },
  twitter: {
    card: "summary",
    title: "Mesh",
    description:
      "A decentralized B2B manufacturing marketplace for students, startups, and local makers.",
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
