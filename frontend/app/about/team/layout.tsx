import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "Team | Bharat Navya" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
