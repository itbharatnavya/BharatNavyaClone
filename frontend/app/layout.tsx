import type { Metadata } from "next";
import { Anek_Latin, Inter, Manrope, Work_Sans } from "next/font/google";
import "./globals.css";
import "./bharat-navya-home.css";
import "./directory-design.css";
import "./recruitment-design.css";
import "./recruitment-core.css";
import "./living-evidence.css";
import "./counter-direction.css";
import "./counter-workspace.css";
import "./counter-soft-system.css";
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
import RouteProgress from "@/components/RouteProgress";
import BackToTop from "@/components/BackToTop";
import DropdownEnhancer from "@/components/DropdownEnhancer";
import FloatingRfqButton from "@/components/rfq/FloatingRfqButton";
import GuestAccountNudge from "@/components/auth/GuestAccountNudge";

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

const anekLatin = Anek_Latin({
  subsets: ["latin"],
  variable: "--font-anek-latin",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  // Pages set their own name through a route layout (static pages) or usePageTitle (pages
  // named after loaded data); the template adds the brand.
  title: { default: "Bharat Navya — Companies, work and opportunity connected", template: "%s | Bharat Navya" },
  description:
    "Discover credible companies, useful services and transparent startup and SME roles across India.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${anekLatin.variable} ${workSans.variable}`}>
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
                      <BackToTop />
                      <DropdownEnhancer />
                      <GuestAccountNudge />
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
