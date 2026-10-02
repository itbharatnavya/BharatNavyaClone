"use client";

// /login — one identity, two ways in: mobile OTP or email + password.
// On success, redirect to ?next (if present) or /dashboard.

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useToast } from "@/components/Toast";
import { sendOtp } from "@/lib/api";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useTr } from "@/components/discovery/hooks";
import { useGuestOnly } from "@/lib/useGuestOnly";
import { safeNext } from "@/lib/redirect";
import GoogleSignInButton, { GOOGLE_CLIENT_ID } from "@/components/auth/GoogleSignInButton";
import InternationalPhoneField from "@/components/auth/InternationalPhoneField";
import { phoneApiValue, phoneDisplayValue, validatePhone } from "@/lib/phone";

type Tab = "otp" | "password";
type Stage = "mobile" | "otp";

const DEFAULT_NEXT = "/dashboard";

export default function LoginPage() {
  const router = useRouter();
  const t = useTr();
  const { addToast } = useToast();
  const { loginOtp, login, loginWithGoogle } = useAuth();
  const { branding } = useConfig();

  const [next, setNext] = useState(DEFAULT_NEXT);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("next");
    if (p) setNext(p);
  }, []);

  // Already logged in? Don't show the form — send them onward instead of
  // letting them re-submit credentials or get stuck bouncing between
  // Login/Register (see lib/redirect.ts). Hook must run every render (Rules
  // of Hooks) — the actual "don't render the form" decision happens at the
  // bottom, right before the JSX return.
  const { loading: authLoading, redirecting } = useGuestOnly(next, DEFAULT_NEXT);

  const [tab, setTab] = useState<Tab>("otp");

  // OTP flow
  const [stage, setStage] = useState<Stage>("mobile");
  const [mobile, setMobile] = useState("");
  const [mobileCountry, setMobileCountry] = useState("IN");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Password flow
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Inline field-validation messages (toast is reserved for API/submit outcomes).
  const [mobileError, setMobileError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const RESEND_COOLDOWN_SECONDS = 30;

  // Countdown for the Resend OTP action, ticking only while the OTP-entry
  // stage is showing.
  useEffect(() => {
    if (stage !== "otp" || resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, resendCooldown]);

  const goNext = () => router.push(safeNext(next, DEFAULT_NEXT));

  const handleSendOtp = async () => {
    const validationError = validatePhone(mobileCountry, mobile);
    if (validationError) {
      setMobileError(validationError);
      return;
    }
    setMobileError("");
    setSending(true);
    try {
      const res = await sendOtp(phoneApiValue(mobileCountry, mobile));
      setStage("otp");
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      addToast(res.otp ? `OTP sent (dev: ${res.otp})` : "OTP sent.", "success");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to send OTP.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const nextOtp = [...prev];
      nextOtp[index] = digit;
      return nextOtp;
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (!/^\d{6}$/.test(code)) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    setOtpError("");
    setVerifying(true);
    try {
      await loginOtp(phoneApiValue(mobileCountry, mobile), code);
      addToast("Signed in. Welcome back.", "success");
      goNext();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to verify OTP.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || sending) return;
    await handleSendOtp();
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      hasError = true;
    } else {
      setEmailError("");
    }
    if (!password) {
      setPasswordError("Enter your password.");
      hasError = true;
    } else {
      setPasswordError("");
    }
    if (hasError) return;
    setLoggingIn(true);
    try {
      await login(email.trim(), password);
      addToast("Signed in. Welcome back.", "success");
      goNext();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Login failed.", "error");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      addToast("Signed in with Google.", "success");
      goNext();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Google sign-in failed.", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Already authenticated (or still resolving auth state) — the redirect
  // effect above handles navigation; render nothing rather than the form.
  if (authLoading || redirecting) return null;

  return (
    <div className="counter-auth-page counter-auth-login" style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
      {/* Left brand panel */}
      <div
        className="auth-aside counter-auth-aside"
        style={{
          width: "44%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div className="counter-auth-aside-copy" style={{ maxWidth: 380 }}>
          <span className="eyebrow">{branding.siteName}</span>
          <h2
            style={{
              marginTop: 14,
              fontSize: "var(--fs-xl)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            {t("auth.login.welcome", "Welcome back to Bharat Navya.")}
          </h2>
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
            {t("auth.login.asideCopy", "Companies, careers, and opportunities—all in one place.")}
          </p>
        </div>
      </div>

      {/* Right form */}
      <div
        className="counter-auth-form-zone"
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div className="counter-auth-form" style={{ width: "100%", maxWidth: 400 }}>
          <h1 style={{ fontSize: "var(--fs-xl)", fontWeight: 700, marginBottom: 4 }}>{t("auth.login.title", "Sign in")}</h1>
          <p className="counter-auth-subtitle" style={{ color: "var(--muted)", fontSize: "var(--fs-sm)", marginBottom: 24 }}>
            {t("auth.login.subtitle", "One account to access Directory and Recruitment.")}
          </p>

          {GOOGLE_CLIENT_ID && (
            <div className="counter-auth-social">
              <GoogleSignInButton onCredential={handleGoogleCredential} disabled={googleLoading} />
              <div className="counter-auth-or" aria-hidden="true"><span>{t("auth.or", "OR")}</span></div>
            </div>
          )}

          {/* Tabs */}
          <div
            className="counter-auth-tabs"
            style={{
              display: "flex",
              gap: 28,
              borderBottom: "1px solid var(--border)",
              marginBottom: 24,
            }}
          >
            {(
              [
                ["otp", t("auth.tab.otp", "Mobile OTP")],
                ["password", t("auth.tab.password", "Email & password")],
              ] as const
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTab(key)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 0 12px",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 600,
                    color: active ? "var(--ink)" : "var(--muted)",
                    borderBottom: active
                      ? "2px solid var(--brand)"
                      : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {tab === "otp" ? (
            stage === "mobile" ? (
              <div>
                <InternationalPhoneField
                  id="login-mobile"
                  country={mobileCountry}
                  number={mobile}
                  onCountryChange={(value) => {
                    setMobileCountry(value);
                    setMobile("");
                    if (mobileError) setMobileError("");
                  }}
                  onNumberChange={(value) => {
                    setMobile(value);
                    if (mobileError) setMobileError("");
                  }}
                  error={mobileError}
                />
                <div style={{ marginTop: 18 }}>
                  <Button block variant="brand" onClick={handleSendOtp} disabled={sending}>
                    {sending ? t("auth.sending", "Sending…") : t("auth.sendOtp", "Send OTP")}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label className="field-label">
                  {t("auth.otpSentTo", "Enter the 6-digit OTP sent to")}{" "}
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{phoneDisplayValue(mobileCountry, mobile)}</span>
                </label>
                <div style={{ display: "flex", gap: 8, margin: "8px 0 4px" }}>
                  {otp.map((value, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      className={["input", otpError ? "input-error" : ""].filter(Boolean).join(" ")}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={value}
                      onChange={(e) => {
                        if (otpError) setOtpError("");
                        handleOtpChange(index, e.target.value);
                      }}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      aria-label={`OTP digit ${index + 1}`}
                      style={{ textAlign: "center", padding: "12px 0", fontSize: "var(--fs-lg)" }}
                    />
                  ))}
                </div>
                {otpError ? <p className="field-error" style={{ marginBottom: 14 }}>{otpError}</p> : <div style={{ marginBottom: 18 }} />}
                <Button block variant="brand" onClick={handleVerify} disabled={verifying}>
                  {verifying ? t("auth.verifying", "Verifying…") : t("auth.verify", "Verify & log in")}
                </Button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStage("mobile")}
                    className="btn btn-ghost btn-sm"
                  >
                    {t("auth.changeNumber", "Change number")}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || sending}
                    className="btn btn-ghost btn-sm"
                    style={resendCooldown > 0 ? { color: "var(--faint)", cursor: "default" } : undefined}
                  >
                    {resendCooldown > 0
                      ? t("auth.resendOtpIn", `Resend OTP in ${resendCooldown}s`)
                      : t("auth.resendOtp", "Resend OTP")}
                  </button>
                </div>
              </div>
            )
          ) : (
            <form onSubmit={handlePasswordLogin} noValidate>
              <div style={{ display: "grid", gap: 16 }}>
                <Input
                  id="login-email"
                  name="email"
                  label={t("auth.email", "Email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  error={emailError}
                />
                <Input
                  id="login-password"
                  name="password"
                  label={t("auth.password", "Password")}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  error={passwordError}
                />
              </div>
              <div style={{ marginTop: 18 }}>
                <Button block variant="brand" type="submit" disabled={loggingIn}>
                  {loggingIn ? t("auth.loggingIn", "Logging in…") : t("auth.login", "Log in")}
                </Button>
              </div>
            </form>
          )}

          <div className="divider" style={{ margin: "24px 0" }} />
          <div style={{ textAlign: "center", fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            {t("auth.newHere", "New to Bharat Navya?")}{" "}
            <Link href={(() => {
              const validated = safeNext(next, DEFAULT_NEXT);
              return validated !== DEFAULT_NEXT ? `/register?next=${encodeURIComponent(validated)}` : "/register";
            })()} className="" style={{ color: "var(--brand)", fontWeight: 600 }}>
              {t("auth.createAccountLink", "Create an account")}
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
