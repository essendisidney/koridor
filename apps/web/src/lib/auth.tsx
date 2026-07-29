"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  organisationId?: string | null;
  roles: string[];
  permissions: string[];
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSession: (tokens: Tokens, user: AuthUser) => void;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
};

const STORAGE_KEY = "koridor.auth";

const AuthContext = createContext<AuthState | null>(null);

function loadStored() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { tokens: Tokens; user: AuthUser }) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((tokens: Tokens, nextUser: AuthUser) => {
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setUser(nextUser);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tokens, user: nextUser }),
    );
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!accessToken) return;
    const profile = await api<AuthUser>("/users/me", { token: accessToken });
    setUser(profile);
    const stored = loadStored();
    if (stored) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tokens: stored.tokens, user: profile }),
      );
    }
  }, [accessToken]);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setAccessToken(stored.tokens.accessToken);
      setRefreshToken(stored.tokens.refreshToken);
      setUser(stored.user);
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>("/auth/login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), password },
      });
      setSession(
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        result.user,
      );
    },
    [setSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await api<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>("/auth/register", {
        method: "POST",
        body: input,
      });
      setSession(
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        result.user,
      );
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      if (accessToken && refreshToken) {
        await api("/auth/logout", {
          method: "POST",
          token: accessToken,
          body: { refreshToken },
        });
      }
    } finally {
      clearSession();
    }
  }, [accessToken, refreshToken, clearSession]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      setSession,
    }),
    [
      user,
      accessToken,
      refreshToken,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      setSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
