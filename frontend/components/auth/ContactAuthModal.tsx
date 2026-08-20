"use client";

// ContactAuthModal — the gate shown when a logged-out visitor tries to Call
// or WhatsApp a seller. Same OTP/password login + register flows as
// app/login/page.tsx and app/register/page.tsx (kept in sync deliberately —
// no new auth logic here), just inline in a modal so the visitor never
// leaves the listing/seller page. On success the caller's `user` from
// useAuth() becomes truthy and the Call/WhatsApp buttons unlock.

import React, { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { sendOtp } from "@/lib/api";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useTr } from "@/components/discovery/hooks";

export interface ContactAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Mode = "login" | "register";
type LoginTab = "otp" | "password";
type OtpStage = "mobile" | "otp";

export default function ContactAuthModal({ open, onClose, onSuccess }: ContactAuthModalProps) {
  const t = useTr();
  const { addToast } = useToast();
  const { loginOtp, login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");

  // login — OTP
  const [loginTab, setLoginTab] = useState<LoginTab>("otp");
  const [stage, setStage] = useState<OtpStage>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // login — password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // register
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");
  const [registering, setRegistering] = useState(false);

  function resetAll() {
    setMode("login");
    setLoginTab("otp");
    setStage("mobile");
    setMobile("");
    setOtp(["", "", "", "", "", ""]);
    setEmail("");
    setPassword("");
    setRegName("");
    setRegMobile("");
    setRegEmail("");
    setRegPassword("");
    setRegCity("");
    setRegState("");
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
    if (mobile.trim().length < 10) {
      addToast("Enter a valid 10-digit mobile number.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await sendOtp(mobile.trim());
      setStage("otp");
      setOtp(["", "", "", "", "", ""]);
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
    if (code.length < 6) {
      addToast("Enter the 6-digit OTP.", "error");
      return;
    }
    setVerifying(true);
    try {
      await loginOtp(mobile.trim(), code);
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
    if (!email.trim() || !password) {
      addToast("Enter your email and password.", "error");
      return;
    }
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
    if (!regName.trim() || regMobile.trim().length < 10) {
      addToast("Enter your name and a valid 10-digit mobile.", "error");
      return;
    }
    setRegistering(true);
    try {
      await register({
        name: regName.trim(),
        mobile: regMobile.trim(),
        email: regEmail.trim() || undefined,
        password: regPassword || undefined,
        city: regCity.trim() || undefined,
        state: regState.trim() || undefined,
      });
      addToast("Account created. Welcome to BharatSource.", "success");
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
          ? t("auth.contactGate.loginTitle", "Log in to contact this seller")
          : t("auth.contactGate.registerTitle", "Create your account")
      }
    >
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: -8, marginBottom: 18 }}>
        {t(
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
                    fontSize: 13.5,
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
                <Input
                  label={t("auth.mobileLabel", "Mobile number")}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
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
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{mobile}</span>
                </label>
                <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
                  {otp.map((value, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      className="input"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      aria-label={`OTP digit ${index + 1}`}
                      style={{ textAlign: "center", padding: "10px 0", fontSize: 17 }}
                    />
                  ))}
                </div>
                <Button block variant="brand" onClick={handleVerify} disabled={verifying}>
                  {verifying ? t("auth.verifying", "Verifying…") : t("auth.verify", "Verify & log in")}
                </Button>
                <button
                  type="button"
                  onClick={() => setStage("mobile")}
                  className="btn btn-ghost btn-block"
                  style={{ marginTop: 8 }}
                >
                  {t("auth.changeNumber", "Change number")}
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ display: "grid", gap: 14 }}>
                <Input
                  label={t("auth.email", "Email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label={t("auth.password", "Password")}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          <div style={{ textAlign: "center", fontSize: 13.5, color: "var(--muted)" }}>
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
        <form onSubmit={handleRegister}>
          <div style={{ display: "grid", gap: 14 }}>
            <Input
              label={t("auth.fullName", "Full name")}
              placeholder="Your name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
            />
            <Input
              label={t("auth.mobileLabel", "Mobile number")}
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={regMobile}
              onChange={(e) => setRegMobile(e.target.value)}
              required
            />
            <Input
              label={t("auth.email", "Email")}
              hint="Optional — needed for password login."
              type="email"
              placeholder="you@company.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <Input
              label={t("auth.password", "Password")}
              hint="Optional — you can always log in with OTP."
              type="password"
              autoComplete="new-password"
              placeholder="Set a password (optional)"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input
                label={t("auth.city", "City")}
                placeholder="e.g. Pune"
                value={regCity}
                onChange={(e) => setRegCity(e.target.value)}
              />
              <Input
                label={t("auth.state", "State")}
                placeholder="e.g. Maharashtra"
                value={regState}
                onChange={(e) => setRegState(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Button block variant="primary" type="submit" disabled={registering}>
              {registering ? t("auth.creating", "Creating…") : t("auth.createAccount", "Create account")}
            </Button>
          </div>
          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: 13.5, color: "var(--muted)" }}>
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
