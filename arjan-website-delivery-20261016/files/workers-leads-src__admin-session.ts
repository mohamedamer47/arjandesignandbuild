import type { Env } from "./env";

const COOKIE = "__Host-arjan-admin";
const FLOW_COOKIE = "__Host-arjan-admin-flow";
export const staffEmails = (env: Env) => (env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const cookieToken = (request: Request) => (request.headers.get("cookie") ?? "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
const authHeaders = (env: Env) => ({ apikey: env.SUPABASE_SECRET_KEY ?? "", "content-type": "application/json" });
const flowCookie = (value: string, age: number) => `${FLOW_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/** Mirrors custom-worker.ts's same-origin check: an Origin match or a matching Sec-Fetch-Site
 * (a Fetch Metadata header set by every current browser and less often stripped by extensions). */
export const isSameOrigin = (request: Request, origin: string) =>
  request.headers.get("origin") === origin || request.headers.get("sec-fetch-site") === "same-origin";

/** Supabase verifies the token on every request; local cookie contents are never trusted. */
export async function supabaseIdentity(request: Request, env: Env): Promise<string | null> {
  const token = cookieToken(request);
  if (!token || token.length > 16000 || !env.SUPABASE_SECRET_KEY || !staffEmails(env).length) return null;
  try {
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { ...authHeaders(env), authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user = await response.json() as { id?: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean; role?: string };
    const email = user.email?.toLowerCase() ?? "";
    return user.id && user.email_confirmed_at && user.role === "authenticated" && !user.is_anonymous && staffEmails(env).includes(email) ? email : null;
  } catch { return null; }
}

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const sessionHeaders = {
  "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer", "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};
const cookie = (token: string, age: number) => `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
const redirect = (location: string, token?: string, age = 0) => new Response(null, { status: 303, headers: { ...sessionHeaders, location, ...(token !== undefined ? { "set-cookie": cookie(token, age) } : {}) } });

function page(text = "", email = "", verify = false, status = 200) {
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>أرچان | دخول الإدارة</title><style>body{background:#f3f0e9;color:#292b26;font:17px/1.8 system-ui;margin:0}main{max-width:440px;margin:10vh auto;padding:28px}h1{font-size:28px;font-weight:500}label{display:block;margin-top:20px}input,button{box-sizing:border-box;width:100%;padding:12px;font:inherit;border:1px solid #bbb;background:#fcfbf7}button{background:#47523e;color:white;margin-top:24px;cursor:pointer}a{color:#47523e}input:focus,button:focus{outline:2px solid #697957;outline-offset:3px}</style><main><small>ARJAN · DESIGN & BUILD</small><h1>دخول لوحة العملاء</h1><p>${escape(text || "الدخول متاح لحساب الإدارة المعتمد فقط.")}</p><form method="post" action="/admin/${verify ? "verify" : "login"}"><label>البريد الإلكتروني<input name="email" type="email" dir="ltr" required maxlength="254" autocomplete="email" value="${escape(email)}" ${verify ? "readonly" : ""}></label>${verify ? '<label>كود الدخول<input name="code" type="text" dir="ltr" inputmode="numeric" pattern="[0-9]{6,10}" minlength="6" maxlength="10" autocomplete="one-time-code" required></label>' : ""}<button>${verify ? "دخول" : "إرسال رابط الدخول"}</button></form>${verify ? '<p><a href="/admin/login">طلب كود جديد</a></p>' : ""}<p><a href="/ar">العودة للموقع</a></p></main></html>`, { status, headers: { ...sessionHeaders, "content-type": "text/html; charset=utf-8" } });
}

/**
 * A plain GET to this link, as done by an email client's or provider's automatic security
 * scanner, must not by itself consume the one-time code. Rendering a page with a button that
 * POSTs the code does that: scanners fetch the URL but don't submit forms, so the code stays
 * valid for the person who actually clicks.
 */
function confirmPage(code: string) {
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>أرچان | تأكيد الدخول</title><style>body{background:#f3f0e9;color:#292b26;font:17px/1.8 system-ui;margin:0}main{max-width:440px;margin:10vh auto;padding:28px}h1{font-size:28px;font-weight:500}button{box-sizing:border-box;width:100%;padding:12px;font:inherit;border:1px solid #bbb;background:#47523e;color:white;margin-top:24px;cursor:pointer}button:focus{outline:2px solid #697957;outline-offset:3px}</style><main><small>ARJAN · DESIGN & BUILD</small><h1>تأكيد الدخول</h1><p>اضغط الزر أدناه لإكمال تسجيل الدخول إلى لوحة العملاء.</p><form method="post" action="/admin/callback"><input type="hidden" name="code" value="${escape(code)}"><button>تأكيد الدخول</button></form></main></html>`, { status: 200, headers: { ...sessionHeaders, "content-type": "text/html; charset=utf-8" } });
}

/** Bounded form-body reader shared by every POST handler here; null on anything malformed. */
async function readForm(request: Request): Promise<URLSearchParams | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return null;
  if (Number(request.headers.get("content-length")) > 2048) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let body = ""; let size = 0;
  const decoder = new TextDecoder();
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 2048) { await reader.cancel(); return null; } body += decoder.decode(value, { stream: true }); }
  body += decoder.decode();
  return new URLSearchParams(body);
}

/** All login endpoints use same-origin POSTs, small bounded bodies, and a separate IP limiter key. */
export async function adminSession(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!["/admin/login", "/admin/verify", "/admin/callback", "/admin/logout"].includes(url.pathname)) return null;
  if (url.pathname === "/admin/callback") {
    if (url.protocol !== "https:" || !env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).includes(url.origin)) return page("طلب غير مسموح.", "", false, 403);
    const flow = (request.headers.get("cookie") ?? "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${FLOW_COOKIE}=`))?.slice(FLOW_COOKIE.length + 1);
    const [verifier, encodedEmail] = (flow ?? "").split(":");
    if (!verifier || !/^[A-Za-z0-9_-]{43}$/.test(verifier) || !encodedEmail) return page("الرابط انتهى أو فُتح في متصفح آخر. اطلب رابطًا جديدًا وافتحه في نفس المتصفح.", "", false, 400);
    if (request.method === "GET") {
      const code = url.searchParams.get("code") ?? "";
      if (!/^[A-Za-z0-9_-]{1,256}$/.test(code)) return page("الرابط انتهى أو فُتح في متصفح آخر. اطلب رابطًا جديدًا وافتحه في نفس المتصفح.", "", false, 400);
      // A GET only shows the confirm button; it never touches Supabase, so an automated
      // scanner that fetches this URL cannot consume the one-time code.
      return confirmPage(code);
    }
    if (request.method !== "POST" || !isSameOrigin(request, url.origin)) return page("طلب غير مسموح.", "", false, 403);
    const form = await readForm(request);
    const code = form?.get("code") ?? "";
    if (!form || !/^[A-Za-z0-9_-]{1,256}$/.test(code)) return page("الرابط انتهى أو فُتح في متصفح آخر. اطلب رابطًا جديدًا وافتحه في نفس المتصفح.", "", false, 400);
    try {
      const email = decodeURIComponent(encodedEmail);
      if (!staffEmails(env).includes(email) || !env.SUPABASE_SECRET_KEY) return page("الحساب غير مصرح له.", "", false, 403);
      const result = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=pkce`, { method: "POST", headers: authHeaders(env), body: JSON.stringify({ auth_code: code, code_verifier: verifier }), signal: AbortSignal.timeout(8000) });
      if (!result.ok) return page("الرابط غير صالح أو استُخدم بالفعل. اطلب رابطًا جديدًا.", "", false, 401);
      const data = await result.json() as { access_token?: string; expires_in?: number };
      if (!data.access_token || !/^[A-Za-z0-9_.-]{1,16000}$/.test(data.access_token)) return page("تعذر تأكيد الجلسة.", "", false, 401);
      const candidate = new Request(request.url, { headers: { cookie: `${COOKIE}=${data.access_token}` } });
      if (await supabaseIdentity(candidate, env) !== email) return page("الحساب غير مصرح له.", "", false, 403);
      const response = redirect("/admin", data.access_token, Math.max(1, Math.min(3600, Number(data.expires_in) || 3600)));
      response.headers.append("set-cookie", flowCookie("", 0));
      return response;
    } catch { return page("تعذر إكمال الدخول. اطلب رابطًا جديدًا.", "", false, 503); }
  }
  if (request.method === "GET") {
    if (url.pathname === "/admin/logout") return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><form method="post"><button>تأكيد تسجيل الخروج</button></form></html>', { headers: { ...sessionHeaders, "content-type": "text/html; charset=utf-8" } });
    return page();
  }
  if (request.method !== "POST" || url.protocol !== "https:" || !isSameOrigin(request, url.origin) || !env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).includes(url.origin)) return page("طلب غير مسموح.", "", false, 403);
  if (url.pathname === "/admin/logout") {
    const token = cookieToken(request);
    if (token && env.SUPABASE_SECRET_KEY) {
      try { await fetch(`${env.SUPABASE_URL}/auth/v1/logout?scope=local`, { method: "POST", headers: { ...authHeaders(env), authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }); } catch { /* The browser cookie is always removed. */ }
    }
    return redirect("/admin/login", "", 0);
  }
  if (!env.SUPABASE_SECRET_KEY || !staffEmails(env).length) return page("الدخول لم يُفعّل بعد.", "", false, 503);
  try {
    const limited = await env.LEADS_LIMITER.limit({ key: `admin-auth:${request.headers.get("cf-connecting-ip") ?? "unknown"}` });
    if (!limited.success) return page("محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.", "", false, 429);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return page("طلب غير صالح.", "", false, 415);
    if (Number(request.headers.get("content-length")) > 2048) return page("طلب غير صالح.", "", false, 413);
    const reader = request.body?.getReader(); let body = ""; let size = 0;
    if (!reader) return page("طلب غير صالح.", "", false, 400);
    const decoder = new TextDecoder();
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 2048) { await reader.cancel(); return page("طلب غير صالح.", "", false, 413); } body += decoder.decode(value, { stream: true }); }
    body += decoder.decode();
    const form = new URLSearchParams(body); const email = (form.get("email") ?? "").trim().toLowerCase();
    const verifying = url.pathname === "/admin/verify";
    if (!staffEmails(env).includes(email)) return page("تعذر بدء الدخول بهذا الحساب.", "", false, 403);
    const code = form.get("code") ?? "";
    if (verifying && !/^\d{6,10}$/.test(code)) return page("راجع كود الدخول.", email, true, 400);
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/${verifying ? "verify" : `otp?redirect_to=${encodeURIComponent(`${url.origin}/admin/callback`)}`}`, {
      method: "POST", headers: authHeaders(env),
      body: JSON.stringify(verifying ? { email, token: code, type: "email" } : { email, create_user: false, code_challenge: challenge, code_challenge_method: "s256" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return page(verifying ? "الكود غير صالح أو انتهت صلاحيته." : "تعذر إرسال الكود. حاول لاحقًا.", email, verifying, verifying ? 401 : 503);
    if (!verifying) {
      const sent = page("أرسلنا رابط دخول مؤقتًا إلى بريدك. افتحه في نفس المتصفح الذي طلبت منه الدخول.");
      sent.headers.set("set-cookie", flowCookie(`${verifier}:${encodeURIComponent(email)}`, 600));
      return sent;
    }
    const result = await response.json() as { access_token?: string; expires_in?: number };
    if (!result.access_token || !/^[A-Za-z0-9_.-]+$/.test(result.access_token) || result.access_token.length > 16000) return page("تعذر تأكيد الجلسة.", email, true, 401);
    const candidate = new Request(request.url, { headers: { cookie: `${COOKIE}=${result.access_token}` } });
    if (await supabaseIdentity(candidate, env) !== email) return page("الحساب غير مصرح له بالدخول.", "", false, 403);
    const age = Math.max(1, Math.min(3600, Number(result.expires_in) || 3600));
    return redirect("/admin", result.access_token, age);
  } catch { return page("خدمة الدخول غير متاحة مؤقتًا. حاول لاحقًا.", "", false, 503); }
}
