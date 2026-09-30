"use client";

// BharatSource — auth context. One identity (no buyer/seller split).
// Persists the JWT in localStorage.bs_token; hydrates the user via GET /auth/me
// on mount when a token is present.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "./types";
import * as api from "./api";

interface RegisterInput {
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  city?: string;
  state?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginOtp: (mobile: string, otp: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  register: (body: RegisterInput) => Promise<User | null>;
  logout: () => void;
  refresh: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<User | null> => {
    if (!api.getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      return me;
    } catch {
      // token invalid/expired → clear it
      api.clearToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // hydrate on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A mid-session 401 (token revoked, or the rare expiry) is reported here by
  // lib/api.ts's doRequest via a plain DOM event rather than a direct import,
  // so the API client doesn't need to know about React context. Just flips
  // `user` to null — every protected page already redirects on `!user` via
  // useRequireAuth()/its own guard, so no navigation logic is duplicated here.
  useEffect(() => {
    const onSessionExpired = () => setUser(null);
    window.addEventListener("bs:session-expired", onSessionExpired);
    return () => window.removeEventListener("bs:session-expired", onSessionExpired);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const { token, user: u } = await api.login(email, password);
      api.setToken(token);
      setUser(u);
      return u;
    },
    []
  );

  const loginOtp = useCallback(
    async (mobile: string, otp: string): Promise<User> => {
      const { token, user: u } = await api.verifyOtp(mobile, otp);
      api.setToken(token);
      setUser(u);
      return u;
    },
    []
  );

  const loginWithGoogle = useCallback(async (idToken: string): Promise<User> => {
    const { token, user: u } = await api.loginWithGoogle(idToken);
    api.setToken(token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(
    async (body: RegisterInput): Promise<User | null> => {
      const res = await api.register(body);
      if (res.token) {
        api.setToken(res.token);
      }
      if (res.user) {
        setUser(res.user);
        return res.user;
      }
      return null;
    },
    []
  );

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: !!user?.roles?.includes("admin"),
      login,
      loginOtp,
      loginWithGoogle,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, loginOtp, loginWithGoogle, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
