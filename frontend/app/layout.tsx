import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Manrope is used as a display face for headings, brand wordmarks, and
// numerical surfaces (status counts, prices, etc.). It pairs well with
// Inter and feels appropriately premium for a hosted SaaS tenancy.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nexus Brand Protection",
  description: "Brand monitoring, threat detection, and takedowns for your domains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, manrope.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
