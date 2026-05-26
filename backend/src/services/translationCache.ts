import crypto from 'crypto';

type CacheEntry = { value: string; at: number };

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 800;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cacheKey(kind: string, from: string, to: string, text: string): string {
  return crypto.createHash('sha256').update(`${kind}|${from}|${to}|${text}`).digest('hex');
}

function pruneIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at);
  for (let i = 0; i < oldest.length - MAX_ENTRIES; i++) {
    store.delete(oldest[i][0]);
  }
}

export function getCachedTranslation(
  kind: string,
  from: string,
  to: string,
  text: string,
): string | null {
  const key = cacheKey(kind, from, to, text);
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedTranslation(
  kind: string,
  from: string,
  to: string,
  text: string,
  value: string,
): void {
  const key = cacheKey(kind, from, to, text);
  store.set(key, { value, at: Date.now() });
  pruneIfNeeded();
}
