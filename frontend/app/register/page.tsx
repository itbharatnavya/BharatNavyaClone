"use client";

// /register — create one unified account (name, mobile, email, optional
// password) then redirect to ?next (if present) or /dashboard. Optional
// referral code is redeemed right after signup (non-fatal if it fails).

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useToast } from "@/components/Toast";
import { redeemReferral } from "@/lib/api";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import { useTr } from "@/components/discovery/hooks";
import { STATE_OPTIONS, CityField } from "@/components/LocationPicker";
import { useGuestOnly } from "@/lib/useGuestOnly";
import { safeNext } from "@/lib/redirect";

const DEFAULT_NEXT = "/";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTr();
  const { addToast } = useToast();
  const { register } = useAuth();
  const { branding, featureFlags } = useConfig();

  const [next, setNext] = useState(DEFAULT_NEXT);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("next");
    if (p) setNext(p);
  }, []);

  // Already logged in? Don't show the form — send them onward instead of
  // letting them re-register or get stuck bouncing between Login/Register
  // (see lib/redirect.ts). Hook runs every render (Rules of Hooks); the
  // actual "don't render the form" decision happens right before the JSX
  // return, below.
  const { loading: authLoading, redirecting } = useGuestOnly(next, DEFAULT_NEXT);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [referral, setReferral] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inline field-validation messages (toast is reserved for API/submit outcomes).
  const [nameError, setNameError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const referralEnabled = featureFlags.referral !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    if (!name.trim()) {
      setNameError("Enter your full name.");
      hasError = true;
    } else {
      setNameError("");
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      setMobileError("Enter a valid 10-digit mobile number.");
      hasError = true;
    } else {
      setMobileError("");
    }
    // Email and password are optional, but must be valid if entered.
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      hasError = true;
    } else {
      setEmailError("");
    }
    if (password && password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      hasError = true;
    } else {
      setPasswordError("");
    }
    if (hasError) return;
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
      router.push(safeNext(next, DEFAULT_NEXT));
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create account.", "error");
      setSubmitting(false);
    }
  };

  // Already authenticated (or still resolving auth state) — the redirect
  // effect above handles navigation; render nothing rather than the form.
  if (authLoading || redirecting) return null;

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

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "grid", gap: 16 }}>
              <Input
                label={t("auth.fullName", "Full name")}
                placeholder="Your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                error={nameError}
              />
              <Input
                label={t("auth.mobileLabel", "Mobile number")}
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (mobileError) setMobileError("");
                }}
                error={mobileError}
              />
              <Input
                label={t("auth.email", "Email")}
                hint={emailError ? undefined : "Optional — needed for password login."}
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                error={emailError}
              />
              <Input
                label={t("auth.password", "Password")}
                hint={passwordError ? undefined : "Optional — you can always log in with OTP."}
                type="password"
                autoComplete="new-password"
                placeholder="Set a password (optional)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                error={passwordError}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Select
                  label={t("auth.state", "State")}
                  placeholder="Select state"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setCity("");
                  }}
                  options={STATE_OPTIONS}
                  id="reg-state"
                />
                <CityField
                  key={`reg-city-${state}`}
                  state={state}
                  city={city}
                  onChange={setCity}
                  idPrefix="reg"
                  label={t("auth.city", "City")}
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
            <Link href={(() => {
              const validated = safeNext(next, DEFAULT_NEXT);
              return validated !== DEFAULT_NEXT ? `/login?next=${encodeURIComponent(validated)}` : "/login";
            })()} style={{ color: "var(--brand)", fontWeight: 600 }}>
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
