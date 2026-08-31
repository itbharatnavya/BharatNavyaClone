import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import "./bharat-navya-home.css";
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

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bharat Navya — Companies, work and opportunity connected",
  description:
    "Discover credible companies, useful services and transparent startup and SME roles across India.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
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
                        <main id="main-content" className="flex-1">{children}</main>
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
