import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nightlife Office MVP",
  description: "Recruiter back-office for nightlife operators",
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
