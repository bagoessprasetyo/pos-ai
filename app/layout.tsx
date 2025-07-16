import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { StoreProvider } from "@/contexts/store-context";
import { ErrorProvider } from "@/contexts/error-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "POS AI - Mobile-First Point of Sale System",
  description: "A comprehensive mobile-first POS system for small to medium businesses",
  // manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ErrorBoundary>
          <ErrorProvider>
            <AuthProvider>
              <StoreProvider>
                {children}
              </StoreProvider>
            </AuthProvider>
          </ErrorProvider>
        </ErrorBoundary>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={4000}
        />
      </body>
    </html>
  );
}
