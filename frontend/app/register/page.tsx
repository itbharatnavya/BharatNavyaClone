"use client";

// /register — create one unified account (name, mobile, email, optional
// password) then redirect to /dashboard. Optional referral code is redeemed
// right after signup (non-fatal if it fails).

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useToast } from "@/components/Toast";
import { redeemReferral } from "@/lib/api";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useTr } from "@/components/discovery/hooks";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTr();
  const { addToast } = useToast();
  const { register } = useAuth();
  const { branding, featureFlags } = useConfig();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [referral, setReferral] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const referralEnabled = featureFlags.referral !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || mobile.trim().length < 10) {
      addToast("Enter your name and a valid 10-digit mobile.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const user = await register({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        password: password || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      });

      // Redeem referral after signup (auth token is set by register()).
      if (user && referralEnabled && referral.trim()) {
        try {
          await redeemReferral(referral.trim());
          addToast("Referral applied.", "success");
        } catch {
          addToast("Account created — referral code couldn't be applied.", "info");
        }
      }

      addToast("Account created. Welcome to BharatSource.", "success");
      router.push("/dashboard");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create account.", "error");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
      {/* Left brand panel */}
      <div
        className="auth-aside"
        style={{
          width: "44%",
          flexShrink: 0,
          background: "linear-gradient(180deg, var(--action-tint), #fff)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div style={{ maxWidth: 380 }}>
          <span className="eyebrow">{branding.siteName}</span>
          <h2
            style={{
              marginTop: 14,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            {t("auth.register.asideTitle", "One account. Buy and sell.")}
          </h2>
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 15 }}>
            {t(
              "auth.register.asideCopy",
              "Post requirements, list products or services, and chat with vendors — all from a single free account."
            )}
          </p>
        </div>
      </div>

      {/* Right form */}
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {t("auth.register.title", "Create your account")}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
            {t("auth.register.subtitle", "Free forever. No card required.")}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: 16 }}>
              <Input
                label={t("auth.fullName", "Full name")}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label={t("auth.mobileLabel", "Mobile number")}
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
              />
              <Input
                label={t("auth.email", "Email")}
                hint="Optional — needed for password login."
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label={t("auth.password", "Password")}
                hint="Optional — you can always log in with OTP."
                type="password"
                autoComplete="new-password"
                placeholder="Set a password (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Input
                  label={t("auth.city", "City")}
                  placeholder="e.g. Pune"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label={t("auth.state", "State")}
                  placeholder="e.g. Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              {referralEnabled &&
                (showReferral ? (
                  <Input
                    label={t("auth.referralCode", "Referral code")}
                    hint="Have a friend's code? Enter it to apply credits."
                    placeholder="e.g. ALPESH-4821"
                    value={referral}
                    onChange={(e) => setReferral(e.target.value)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReferral(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ justifySelf: "start", paddingLeft: 0 }}
                  >
                    {t("auth.haveReferral", "+ Have a referral code?")}
                  </button>
                ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <Button block variant="primary" type="submit" disabled={submitting}>
                {submitting ? t("auth.creating", "Creating…") : t("auth.createAccount", "Create account")}
              </Button>
            </div>
          </form>

          <div className="divider" style={{ margin: "24px 0" }} />
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
            {t("auth.haveAccount", "Already have an account?")}{" "}
            <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>
              {t("auth.login", "Log in")}
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .auth-aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}
