import { withBasePath } from "@/lib/base-path";

const DEFAULT_DEV_ADMIN_SHA1 = "d033e22ae348aeb5660fc2140aec35850c4da997";
const SHA1_PATTERN = /^[a-f0-9]{40}$/i;

export type AuthConfig = {
  hash: string | null;
  isValid: boolean;
  source: "runtime" | "env" | "default-dev" | "missing" | "invalid";
};

function normalizeHash(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return SHA1_PATTERN.test(normalized) ? normalized : null;
}

async function loadRuntimeHash() {
  const runtimePath = process.env.NEXT_PUBLIC_LEXORA_AUTH_CONFIG_PATH?.trim();

  if (!runtimePath) {
    return null;
  }

  const configUrl = /^https?:\/\//i.test(runtimePath)
    ? runtimePath
    : withBasePath(runtimePath.startsWith("/") ? runtimePath : `/${runtimePath}`);

  try {
    const response = await fetch(configUrl, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { passwordSha1?: string };

    return payload.passwordSha1 ?? null;
  } catch {
    return null;
  }
}

export async function loadAuthConfig(): Promise<AuthConfig> {
  const runtimeHash = normalizeHash(await loadRuntimeHash());

  if (runtimeHash) {
    return {
      hash: runtimeHash,
      isValid: true,
      source: "runtime"
    };
  }

  const envValue = process.env.NEXT_PUBLIC_LEXORA_PASSWORD_SHA1?.trim();
  const envHash = normalizeHash(envValue);

  if (envHash) {
    return {
      hash: envHash,
      isValid: true,
      source: "env"
    };
  }

  if (envValue && !envHash) {
    return {
      hash: null,
      isValid: false,
      source: "invalid"
    };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      hash: null,
      isValid: false,
      source: "missing"
    };
  }

  return {
    hash: DEFAULT_DEV_ADMIN_SHA1,
    isValid: true,
    source: "default-dev"
  };
}
