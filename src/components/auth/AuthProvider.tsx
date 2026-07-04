"use client";

import { loadAuthConfig, type AuthConfig } from "@/lib/auth/config";
import { sha1 } from "@/lib/auth/crypto";
import { clearStoredSession, readStoredSession, writeStoredSession } from "@/lib/auth/session";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AuthStatus = "checking" | "authenticated" | "anonymous";

type LoginResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "username" | "password" | "config";
    };

type AuthContextValue = {
  status: AuthStatus;
  config: AuthConfig | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const activeConfig = await loadAuthConfig();

      if (cancelled) {
        return;
      }

      setConfig(activeConfig);

      if (!activeConfig.hash || !activeConfig.isValid) {
        setStatus("anonymous");
        return;
      }

      const hasSession = await readStoredSession(activeConfig.hash);

      if (!cancelled) {
        setStatus(hasSession ? "authenticated" : "anonymous");
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      const trimmedUsername = username.trim();

      if (!trimmedUsername) {
        return { ok: false, reason: "username" };
      }

      if (!config?.hash || !config.isValid) {
        return { ok: false, reason: "config" };
      }

      const passwordHash = await sha1(password);

      if (passwordHash !== config.hash) {
        await clearStoredSession(config.hash);
        return { ok: false, reason: "password" };
      }

      await writeStoredSession(trimmedUsername, config.hash);
      setStatus("authenticated");

      return { ok: true };
    },
    [config]
  );

  const logout = useCallback(async () => {
    await clearStoredSession(config?.hash);
    setStatus("anonymous");
  }, [config?.hash]);

  const value = useMemo(
    () => ({
      status,
      config,
      login,
      logout
    }),
    [status, config, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
