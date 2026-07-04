"use client";

import { sha1 } from "@/lib/auth/crypto";

type StoredSession = {
  v: number;
  n: string;
  p: string;
  u: string;
  t: number;
  h: string;
};

function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function storageKey(activeHash: string) {
  const origin = typeof window === "undefined" ? "lexora" : window.location.origin;
  const seed = await sha1(`${origin}:lexora:${activeHash}:session`);

  return `__lx_${seed.slice(3, 29)}`;
}

export async function readStoredSession(activeHash: string) {
  const key = await storageKey(activeHash);
  const raw = localStorage.getItem(key);

  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;

    if (!parsed || parsed.v !== 1 || !parsed.n || !parsed.p || !parsed.u || !parsed.h) {
      return false;
    }

    const hashProof = await sha1(`hash:${activeHash}`);
    const sessionProof = await sha1(`${parsed.n}:${parsed.u}:${activeHash}:lexora`);

    return parsed.h === hashProof && parsed.p === sessionProof;
  } catch {
    return false;
  }
}

export async function writeStoredSession(username: string, activeHash: string) {
  const key = await storageKey(activeHash);
  const nonce = randomToken();
  const payload: StoredSession = {
    v: 1,
    n: nonce,
    u: await sha1(`${username.trim()}:${nonce}`),
    t: Date.now(),
    h: await sha1(`hash:${activeHash}`),
    p: ""
  };

  payload.p = await sha1(`${payload.n}:${payload.u}:${activeHash}:lexora`);
  localStorage.setItem(key, JSON.stringify(payload));
}

export async function clearStoredSession(activeHash?: string | null) {
  if (!activeHash) {
    return;
  }

  localStorage.removeItem(await storageKey(activeHash));
}
