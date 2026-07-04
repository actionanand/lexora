"use client";

import { AuthGate } from "@/components/auth/AuthGate";
import { DocsShell } from "@/components/docs/DocsShell";

export function DocRouteClient({ language, slug }: { language: string; slug: string }) {
  return (
    <AuthGate>
      <DocsShell language={language} slug={slug} />
    </AuthGate>
  );
}
