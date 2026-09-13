import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SKININTEL Dermatology AI",
  description: "AI-powered educational skin analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}