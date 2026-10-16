import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mutual" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
