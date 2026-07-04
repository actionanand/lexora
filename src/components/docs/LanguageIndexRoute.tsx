"use client";

import { AuthGate } from "@/components/auth/AuthGate";
import { DocsLanguageOverview } from "@/components/docs/DocsShell";

export function LanguageIndexRoute({ language }: { language: string }) {
  return (
    <AuthGate>
      <DocsLanguageOverview language={language} />
    </AuthGate>
  );
}
