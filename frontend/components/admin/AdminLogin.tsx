"use client";

// components/admin/AdminLogin.tsx — email/password login gate for the admin panel.
// Uses useAuth().login(email, password). Shown when the visitor is not an admin.

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      // AuthProvider updates user; the page re-gates on isAdmin.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-bs flex min-h-[70vh] items-center justify-center py-16 counter-admin-login">
      <div className="w-full max-w-[400px]">
        <div className="card card-flat p-7">
          <div className="mb-6 text-center">
            <div className="counter-workspace-label mb-2">Bharat Navya operations</div>
            <h1 className="text-h3 font-bold text-ink">Admin control centre</h1>
            <p className="mt-1 text-sm text-muted">
              Sign in with an admin account to manage the platform.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="admin@bharatsource.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error || undefined}
              required
            />
            <Button
              type="submit"
              variant="brand"
              block
              disabled={busy}
              className={busy ? "opacity-70" : ""}
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
