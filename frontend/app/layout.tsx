import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/lib/auth";
import { ConfigProvider } from "@/lib/config";
import { LanguageProvider } from "@/lib/i18n";
import { CompareProvider } from "@/lib/compare";
import { ShortlistProvider } from "@/lib/shortlist";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatAssistant from "@/components/ChatAssistant";
import CompareBar from "@/components/compare/CompareBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BharatSource — Source anything across India",
  description:
    "A horizontal Indian marketplace: source products, hire services, and connect with verified sellers across every industry. Products and services, one catalog.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ConfigProvider>
          <LanguageProvider>
            <ToastProvider>
              <AuthProvider>
                <CompareProvider>
                  <ShortlistProvider>
                    <div className="flex min-h-screen flex-col">
                      <Navbar />
                      <main className="flex-1">{children}</main>
                      <Footer />
                    </div>
                    <ChatAssistant />
                    <CompareBar />
                  </ShortlistProvider>
                </CompareProvider>
              </AuthProvider>
            </ToastProvider>
          </LanguageProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
