"use client";

import { LoginModal } from "@/components/auth/LoginModal";
import { loadAuthConfig, type AuthConfig } from "@/lib/auth/config";
import { sha1 } from "@/lib/auth/crypto";
import { clearStoredSession, readStoredSession, writeStoredSession } from "@/lib/auth/session";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/auth/AuthGate.module.css";

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
  openLoginModal: (redirectTo?: string) => void;
  closeLoginModal: () => void;
  loginModalOpen: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const pendingRedirectRef = useRef<string | null>(null);
  const router = useRouter();

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

  const openLoginModal = useCallback((redirectTo?: string) => {
    pendingRedirectRef.current = redirectTo ?? null;
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    pendingRedirectRef.current = null;
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
      setLoginModalOpen(false);

      const redirect = pendingRedirectRef.current;
      pendingRedirectRef.current = null;
      if (redirect) {
        router.push(redirect);
      }

      return { ok: true };
    },
    [config, router]
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
      logout,
      openLoginModal,
      closeLoginModal,
      loginModalOpen,
    }),
    [status, config, login, logout, openLoginModal, closeLoginModal, loginModalOpen]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {loginModalOpen && (
        <div className={styles.overlay}>
          <LoginModal onClose={closeLoginModal} />
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
