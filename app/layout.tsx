import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/layout/LayoutShell";
import GlobalScanner from "@/components/GlobalScanner";
import { SupabaseAuthProvider } from "@/lib/SupabaseAuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "De Digitale Klusjesman",
  description: "Reparatie Dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DDK",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <SupabaseAuthProvider>
          <GlobalScanner />
          <LayoutShell>
            {children}
          </LayoutShell>
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}