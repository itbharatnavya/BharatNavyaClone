import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found | BharatSource — India's B2B Marketplace",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "96px 24px",
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 120,
          lineHeight: 1,
          fontWeight: 700,
          color: "var(--border)",
        }}
      >
        404
      </span>
      <h2
        className="t-h2"
        style={{ marginTop: 16, color: "var(--text-primary)" }}
      >
        PAGE NOT FOUND
      </h2>
      <p
        style={{
          marginTop: 12,
          fontSize: 15,
          color: "var(--text-secondary)",
          maxWidth: 420,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div style={{ marginTop: 32 }}>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
