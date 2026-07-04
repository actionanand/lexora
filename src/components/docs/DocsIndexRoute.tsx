"use client";

import { AuthGate } from "@/components/auth/AuthGate";
import { getFirstDocPath } from "@/generated/content-index.generated";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function DocsIndexRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getFirstDocPath());
  }, [router]);

  return (
    <AuthGate>
      <div />
    </AuthGate>
  );
}
