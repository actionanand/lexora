"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import styles from "@/components/auth/AuthGate.module.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, openLoginModal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const didRedirectRef = useRef(false);

  useEffect(() => {
    if (status === "anonymous" && !didRedirectRef.current) {
      didRedirectRef.current = true;
      openLoginModal(pathname);
      router.replace("/");
    }
  }, [status, openLoginModal, pathname, router]);

  if (status === "checking" || status === "anonymous") {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>Checking secure access...</div>
      </div>
    );
  }

  return <>{children}</>;
}
