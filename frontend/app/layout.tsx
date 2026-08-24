import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/lib/auth";
import { ConfigProvider } from "@/lib/config";
import { CatalogProvider } from "@/lib/catalog";
import { LanguageProvider } from "@/lib/i18n";
import { ShortlistProvider } from "@/lib/shortlist";
import { SearchDockProvider } from "@/lib/searchDock";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatAssistant from "@/components/ChatAssistant";
import FloatingRfqButton from "@/components/rfq/FloatingRfqButton";
import RouteProgress from "@/components/RouteProgress";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BharatSource — Source anything across India",
  description:
    "BharatSource is India's business suite, one account for sourcing verified suppliers on Directory and hiring vetted candidates on Recruitment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <RouteProgress />
        <ConfigProvider>
          <CatalogProvider>
            <LanguageProvider>
              <ToastProvider>
                <AuthProvider>
                  <ShortlistProvider>
                    <SearchDockProvider>
                      <div className="flex min-h-screen flex-col">
                        <Navbar />
                        <main className="flex-1">{children}</main>
                        <Footer />
                      </div>
                      <ChatAssistant />
                      <FloatingRfqButton />
                    </SearchDockProvider>
                  </ShortlistProvider>
                </AuthProvider>
              </ToastProvider>
            </LanguageProvider>
          </CatalogProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
