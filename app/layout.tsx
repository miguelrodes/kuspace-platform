import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Space_Grotesk } from "next/font/google";
import { DemoDisclosure } from "@/components/demo/demo-disclosure";
import { SiteFooter } from "@/components/demo/site-footer";
import { isClerkConfigured } from "@/lib/auth/config";
import { isPublicDemoMode } from "@/lib/demo-mode";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "KUSPACE",
  description: "Recruiter back-office for nightlife operators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={spaceGrotesk.variable}>
        {isClerkConfigured() ? (
          <ClerkProvider>
            {isPublicDemoMode() ? <DemoDisclosure /> : null}
            {children}
            <SiteFooter />
          </ClerkProvider>
        ) : (
          <>
            {isPublicDemoMode() ? <DemoDisclosure /> : null}
            {children}
            <SiteFooter />
          </>
        )}
      </body>
    </html>
  );
}
