// Minimal shapes of the runtime APIs used, so no extra type package is needed.
export type R2Object = { key: string; size: number; customMetadata?: Record<string, string> };
export type R2Body = R2Object & { text(): Promise<string>; body?: ReadableStream | null };
export type R2Bucket = {
  /** Resolves to null when an `onlyIf` condition is not met. */
  put(
    key: string,
    value: ReadableStream | string | null,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string>; onlyIf?: Headers },
  ): Promise<R2Object | null>;
  get(key: string): Promise<R2Body | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options: { prefix: string; limit?: number; include?: "customMetadata"[] }): Promise<{ objects: R2Object[] }>;
};

export type RateLimit = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type Env = {
  /** Staff dashboard is closed until all three settings are configured. */
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
  ADMIN_AUTH_PROVIDER?: "access" | "supabase";
  /** Private bucket: client files under uploads/, parked leads under lead-fallback/, alert outbox under alerts/. */
  UPLOADS: R2Bucket;
  /** Comma-separated origins allowed to call the browser-facing routes. */
  ALLOWED_ORIGINS: string;
  /** Per-IP limits, counted separately for lead submissions and for file uploads. */
  LEADS_LIMITER: RateLimit;
  UPLOADS_LIMITER: RateLimit;
  SUPABASE_URL: string;
  /** Secret. Server-side key of this environment's Supabase project. */
  SUPABASE_SECRET_KEY?: string;
  TURNSTILE_VERIFY_URL: string;
  /** Secret. Server-side key of this environment's Turnstile widget. */
  TURNSTILE_SECRET_KEY?: string;
  /** Secret. Token of this environment's Telegram alert bot. Until it and the chat id are set, alerts queue but are not sent. */
  TELEGRAM_BOT_TOKEN?: string;
  /** Secret. Id of the Telegram group that receives this environment's alerts. */
  TELEGRAM_CHAT_ID?: string;
  /** Label put in front of every alert, e.g. "[PREVIEW]". */
  ALERT_PREFIX?: string;
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const FILE_TYPES = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" } as const;

export const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** Release a body we are not going to use, without pulling its bytes through JavaScript. */
export const discard = (request: Request) => request.body?.cancel();

/**
 * CSRF: a browser request from another site carries that site's Origin. Some privacy extensions
 * and translation proxies strip or rewrite Origin on an otherwise same-site submission, so
 * `Sec-Fetch-Site: same-origin` — a Fetch Metadata header every current browser sets and rarely
 * strips — is accepted as an alternative same-site signal, never a replacement for the allowlist.
 */
export const originAllowed = (request: Request, env: Env) => {
  const origin = request.headers.get("origin");
  if (origin) return env.ALLOWED_ORIGINS.split(",").some((allowed) => allowed.trim() === origin);
  return request.headers.get("sec-fetch-site") === "same-origin";
};
