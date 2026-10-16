import type { Metadata } from "next";

export const metadata: Metadata = { title: "What we offer" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
