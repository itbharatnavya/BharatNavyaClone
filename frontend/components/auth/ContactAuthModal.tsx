"use client";

// ContactAuthModal — the gate shown when a logged-out visitor tries to Call
// or WhatsApp a seller. Same OTP/password login + register flows as
// app/login/page.tsx and app/register/page.tsx (kept in sync deliberately —
// no new auth logic here), just inline in a modal so the visitor never
// leaves the listing/seller page. On success the caller's `user` from
// useAuth() becomes truthy and the Call/WhatsApp buttons unlock.

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { sendOtp } from "@/lib/api";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import { useTr } from "@/components/discovery/hooks";
import { STATE_OPTIONS, CityField } from "@/components/LocationPicker";
import InternationalPhoneField from "@/components/auth/InternationalPhoneField";
import { phoneApiValue, phoneDisplayValue, validatePhone } from "@/lib/phone";

export interface ContactAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  purpose?: "contact" | "apply" | "account" | "review";
}

type Mode = "login" | "register";
type LoginTab = "otp" | "password";
type OtpStage = "mobile" | "otp";

export default function ContactAuthModal({ open, onClose, onSuccess, purpose = "contact" }: ContactAuthModalProps) {
  const t = useTr();
  const { addToast } = useToast();
  const { loginOtp, login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");

  // login — OTP
  const [loginTab, setLoginTab] = useState<LoginTab>("otp");
  const [stage, setStage] = useState<OtpStage>("mobile");
  const [mobile, setMobile] = useState("");
  const [mobileCountry, setMobileCountry] = useState("IN");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // login — password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // register
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regMobileCountry, setRegMobileCountry] = useState("IN");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");
  const [registering, setRegistering] = useState(false);

  // Inline field-validation messages (toast is reserved for API/submit outcomes).
  const [mobileError, setMobileError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [regNameError, setRegNameError] = useState("");
  const [regMobileError, setRegMobileError] = useState("");
  const [regEmailError, setRegEmailError] = useState("");
  const [regPasswordError, setRegPasswordError] = useState("");

  const RESEND_COOLDOWN_SECONDS = 30;

  // Countdown for the Resend OTP action, ticking only while the modal is open
  // and the OTP-entry stage is showing.
  useEffect(() => {
    if (!open || stage !== "otp" || resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [open, stage, resendCooldown]);

  function resetAll() {
    setMode("login");
    setLoginTab("otp");
    setStage("mobile");
    setMobile("");
    setMobileCountry("IN");
    setOtp(["", "", "", "", "", ""]);
    setEmail("");
    setPassword("");
    setRegName("");
    setRegMobile("");
    setRegMobileCountry("IN");
    setRegEmail("");
    setRegPassword("");
    setRegCity("");
    setRegState("");
    setResendCooldown(0);
    setMobileError("");
    setOtpError("");
    setEmailError("");
    setPasswordError("");
    setRegNameError("");
    setRegMobileError("");
    setRegEmailError("");
    setRegPasswordError("");
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  function handleSuccess() {
    resetAll();
    onSuccess?.();
    onClose();
  }

  const handleSendOtp = async () => {
    const phoneError = validatePhone(mobileCountry, mobile);
    if (phoneError) {
      setMobileError(phoneError);
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

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || sending) return;
    await handleSendOtp();
  };

  const handleOtpChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
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
      addToast("Logged in. Welcome back.", "success");
      handleSuccess();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to verify OTP.", "error");
    } finally {
      setVerifying(false);
    }
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
      addToast("Logged in. Welcome back.", "success");
      handleSuccess();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Login failed.", "error");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    if (!regName.trim()) {
      setRegNameError("Enter your full name.");
      hasError = true;
    } else {
      setRegNameError("");
    }
    const phoneError = validatePhone(regMobileCountry, regMobile);
    if (phoneError) {
      setRegMobileError(phoneError);
      hasError = true;
    } else {
      setRegMobileError("");
    }
    if (regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setRegEmailError("Enter a valid email address.");
      hasError = true;
    } else {
      setRegEmailError("");
    }
    if (regPassword && regPassword.length < 6) {
      setRegPasswordError("Password must be at least 6 characters.");
      hasError = true;
    } else {
      setRegPasswordError("");
    }
    if (hasError) return;
    setRegistering(true);
    try {
      await register({
        name: regName.trim(),
        mobile: phoneApiValue(regMobileCountry, regMobile),
        email: regEmail.trim() || undefined,
        password: regPassword || undefined,
        city: regCity.trim() || undefined,
        state: regState.trim() || undefined,
      });
      addToast("Account created. Welcome to Bharat Navya.", "success");
      handleSuccess();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create account.", "error");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      title={
        mode === "login"
          ? purpose === "apply"
            ? "Sign in to apply"
            : purpose === "review"
              ? "Sign in to write a review"
            : purpose === "account"
              ? "Sign in to Bharat Navya"
              : t("auth.contactGate.loginTitle", "Log in to contact this seller")
          : t("auth.contactGate.registerTitle", "Create your account")
      }
    >
      <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: -8, marginBottom: 18 }}>
        {purpose === "apply"
          ? "Sign in or create an account to continue. Your application is not submitted until you complete the review step."
          : purpose === "review"
            ? "Reviews come from real accounts. Sign in or create one, and you'll come straight back to your review."
          : purpose === "account"
            ? "Sign in or create an account to return to shortlisted companies and roles without starting over."
            : t(
              "auth.contactGate.subtitle",
              "Phone and WhatsApp details are shown to logged-in members only."
            )}
      </p>

      {mode === "login" ? (
        <>
          <div
            style={{
              display: "flex",
              gap: 20,
              borderBottom: "1px solid var(--border)",
              marginBottom: 18,
            }}
          >
            {(
              [
                ["otp", t("auth.tab.otp", "Mobile OTP")],
                ["password", t("auth.tab.password", "Email & password")],
              ] as const
            ).map(([key, label]) => {
              const active = loginTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLoginTab(key)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 0 10px",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 600,
                    color: active ? "var(--ink)" : "var(--muted)",
                    borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {loginTab === "otp" ? (
            stage === "mobile" ? (
              <div>
                <InternationalPhoneField
                  id="contact-login-mobile"
                  country={mobileCountry}
                  number={mobile}
                  compact
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
                <div style={{ marginTop: 16 }}>
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
                      style={{ textAlign: "center", padding: "10px 0", fontSize: "var(--fs-md)" }}
                    />
                  ))}
                </div>
                {otpError ? <p className="field-error" style={{ marginBottom: 12 }}>{otpError}</p> : <div style={{ marginBottom: 16 }} />}
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
              <div style={{ display: "grid", gap: 14 }}>
                <Input
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
              <div style={{ marginTop: 16 }}>
                <Button block variant="brand" type="submit" disabled={loggingIn}>
                  {loggingIn ? t("auth.loggingIn", "Logging in…") : t("auth.login", "Log in")}
                </Button>
              </div>
            </form>
          )}

          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            {t("auth.newHere", "New here?")}{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--brand)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("auth.createAccountLink", "Create an account")}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleRegister} noValidate>
          <div style={{ display: "grid", gap: 14 }}>
            <Input
              label={t("auth.fullName", "Full name")}
              placeholder="Your name"
              value={regName}
              onChange={(e) => {
                setRegName(e.target.value);
                if (regNameError) setRegNameError("");
              }}
              error={regNameError}
            />
            <InternationalPhoneField
              id="contact-register-mobile"
              country={regMobileCountry}
              number={regMobile}
              compact
              onCountryChange={(value) => {
                setRegMobileCountry(value);
                setRegMobile("");
                if (regMobileError) setRegMobileError("");
              }}
              onNumberChange={(value) => {
                setRegMobile(value);
                if (regMobileError) setRegMobileError("");
              }}
              error={regMobileError}
            />
            <Input
              label={t("auth.email", "Email")}
              hint={regEmailError ? undefined : "Optional — needed for password login."}
              type="email"
              placeholder="you@company.com"
              value={regEmail}
              onChange={(e) => {
                setRegEmail(e.target.value);
                if (regEmailError) setRegEmailError("");
              }}
              error={regEmailError}
            />
            <Input
              label={t("auth.password", "Password")}
              hint={regPasswordError ? undefined : "Optional — you can always log in with OTP."}
              type="password"
              autoComplete="new-password"
              placeholder="Set a password (optional)"
              value={regPassword}
              onChange={(e) => {
                setRegPassword(e.target.value);
                if (regPasswordError) setRegPasswordError("");
              }}
              error={regPasswordError}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Select
                label={t("auth.state", "State")}
                placeholder="Select state"
                value={regState}
                onChange={(e) => {
                  setRegState(e.target.value);
                  setRegCity("");
                }}
                options={STATE_OPTIONS}
                id="cam-reg-state"
              />
              <CityField
                key={`cam-reg-city-${regState}`}
                state={regState}
                city={regCity}
                onChange={setRegCity}
                idPrefix="cam-reg"
                label={t("auth.city", "City")}
              />
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Button block variant="primary" type="submit" disabled={registering}>
              {registering ? t("auth.creating", "Creating…") : t("auth.createAccount", "Create account")}
            </Button>
          </div>
          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            {t("auth.haveAccount", "Already have an account?")}{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--brand)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("auth.login", "Log in")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
