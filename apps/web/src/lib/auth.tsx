"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, AUTH_EXPIRED_EVENT } from "./api";

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
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
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

/** Seconds-since-epoch expiry from a JWT, or 0 if unreadable. */
function tokenExpiry(token: string | null) {
  if (!token) return 0;
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(part)).exp) || 0;
  } catch {
    return 0;
  }
}

/** True when the token is gone or expires within `marginSec`. */
function expiresSoon(token: string | null, marginSec = 60) {
  return tokenExpiry(token) - marginSec <= Date.now() / 1000;
}

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

  // Refresh tokens rotate on every use, so only one renewal may run at a time.
  const refreshRef = useRef<string | null>(null);
  const renewing = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    refreshRef.current = refreshToken;
  }, [refreshToken]);

  const renew = useCallback(async () => {
    if (renewing.current) return renewing.current;
    const token = refreshRef.current ?? loadStored()?.tokens.refreshToken ?? null;
    if (!token) return false;
    renewing.current = (async () => {
      try {
        const result = await api<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>("/auth/refresh", { method: "POST", body: { refreshToken: token } });
        refreshRef.current = result.refreshToken;
        setSession(
          { accessToken: result.accessToken, refreshToken: result.refreshToken },
          result.user ?? loadStored()?.user,
        );
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        renewing.current = null;
      }
    })();
    return renewing.current;
  }, [setSession, clearSession]);

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
    if (!stored) {
      setLoading(false);
      return;
    }
    setRefreshToken(stored.tokens.refreshToken);
    refreshRef.current = stored.tokens.refreshToken;
    setUser(stored.user);
    if (!expiresSoon(stored.tokens.accessToken, 30)) {
      setAccessToken(stored.tokens.accessToken);
      setLoading(false);
      return;
    }
    // Stale session from an earlier visit: renew before pages load data.
    renew().finally(() => setLoading(false));
  }, [renew]);

  // Renew a minute before expiry, when the tab regains focus (timers are
  // throttled in background tabs), and whenever a request comes back 401.
  useEffect(() => {
    if (!accessToken) return;
    const ms = Math.max(5_000, (tokenExpiry(accessToken) - 60) * 1000 - Date.now());
    const timer = window.setTimeout(() => void renew(), ms);
    const onVisible = () => {
      if (document.visibilityState === "visible" && expiresSoon(accessToken)) void renew();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken, renew]);

  useEffect(() => {
    const onExpired = () => void renew();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [renew]);

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
      return result.user;
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
      return result.user;
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
