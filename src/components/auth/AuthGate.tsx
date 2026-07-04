"use client";

import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth/AuthProvider";
import styles from "@/components/auth/AuthGate.module.css";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>Checking secure access...</div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className={styles.screen}>
        <LoginModal />
      </div>
    );
  }

  return <>{children}</>;
}
