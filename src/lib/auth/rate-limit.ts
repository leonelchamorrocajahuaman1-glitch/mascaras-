import "server-only";

const g = globalThis as unknown as { __smRate?: Map<string, { count: number; reset: number }> };
const buckets = (g.__smRate ??= new Map());

/** Limitador en memoria (suficiente para un único servidor). */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, retryAfter: Math.ceil((entry.reset - now) / 1000) };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
