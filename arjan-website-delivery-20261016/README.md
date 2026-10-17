# ARJAN website — delivery for merge into the Mac repo

## ⚠️ Fix #5 below is new and not yet applied anywhere

This folder is **not** part of this repo's actual site. It is a parking spot for
verified, ready-to-merge fixes to the real ARJAN project, which lives only on the
owner's Mac at `infra/cloudflare-preview` (never pushed to GitHub, so this session
had no repo to push a proper PR against).

**Status update:** fixes 1–4 below are already confirmed LIVE on arjandesign.com
(fix 4 was applied by hand through the Cloudflare dashboard's "Edit code" view on
both `arjan-website-production` and `arjan-leads-production`, then deployed; the
owner's own login went through afterwards). Fix 5 is new, not urgent (login already
works), and not yet applied anywhere.

## What to do with this

On the Mac, inside the real `arjan-website` repo, with the current branch's
uncommitted changes left exactly as they are:

```bash
cp arjan-website-delivery-20261016/files/public__headers public/_headers
cp arjan-website-delivery-20261016/files/next.config.ts next.config.ts
cp arjan-website-delivery-20261016/files/wrangler.production.jsonc wrangler.production.jsonc
cp arjan-website-delivery-20261016/files/docs__launch-status.md docs/launch-status.md
cp arjan-website-delivery-20261016/files/workers-leads-src__env.ts workers/leads/src/env.ts
cp arjan-website-delivery-20261016/files/workers-leads-src__admin-session.ts workers/leads/src/admin-session.ts
```

(`admin.ts` also changed — two lines only. Apply by hand or diff against this repo's
own workers/leads/src/admin.ts, which is unchanged from baseline otherwise:
1. Import line: add `isSameOrigin` to the existing `import { adminSession } from "./admin-session"` line.
2. In the `/admin/leads/:id` POST handler, replace
   `if (request.headers.get("origin") !== url.origin) return message(403, ...)`
   with `if (!isSameOrigin(request, url.origin)) return message(403, ...)`.)

**custom-worker.ts — DO NOT COPY A FULL FILE FOR THIS ONE.** Confirmed via the
Cloudflare connector (read-only `workers_get_worker_code`) that the live deployed
`custom-worker.ts` has already diverged from this session's baseline: it now wraps
every response in a `harden(...)` call that doesn't exist in this delivery's copy.
Overwriting it whole would silently drop that. Instead apply this exact, minimal
change by hand (same idea as the other two files: accept `Sec-Fetch-Site: same-origin`
as an alternative to an exact Origin match):

```ts
// Add this function near the top of custom-worker.ts, after the existing `refuse` definition:
function isSameOrigin(request: Request, origin: string): boolean {
  if (request.headers.get("origin") === origin) return true;
  return request.headers.get("sec-fetch-site") === "same-origin";
}

// Then change this one line inside the fetch handler:
//   OLD: if (request.method === "POST" && request.headers.get("origin") !== new URL(request.url).origin) return refuse(403, "forbidden");
//   NEW:
if (request.method === "POST" && !isSameOrigin(request, new URL(request.url).origin)) return refuse(403, "forbidden");
```

If the live file already wraps the return in `harden(...)`, keep that wrapper —
only the condition inside the `if` changes.

Then review, run `npm run lint && npm run type-check && npm run cf:preflight && npm run cf:build`
and the test suite, and deploy.

## Fix 5 — click-confirm step before the magic-link callback completes login (NOT yet deployed)

Live auth logs (via the Supabase `query_logs` tool, `auth_logs` source, project
`qbndyibtbwomdcgzzwwe`) showed the owner's magic-link login actually *succeeding*
(`GET /verify` → 303 → `POST /token` pkce → 200 → `GET /user` → 200, with an explicit
`{"action":"login","login_method":"pkce","provider":"magiclink"}` event) — immediately
followed 7 seconds later by a second `GET /verify` **from a different IP** that failed
with `"One-time token not found"` because the one-time code had already been consumed.

The likely cause: an automated link-scanner (Gmail/Outlook/a mail-security gateway
prefetching links in incoming email) issued a plain GET to `/admin/callback` and
completed the whole PKCE exchange — including minting a real session cookie that
went nowhere useful, since it's not the owner's browser — before the owner himself
clicked. By the time he clicked, the code was already spent, so he saw "link already
used," even though his own click never actually ran the exchange.

Fix: `GET /admin/callback` in `workers/leads/src/admin-session.ts` no longer touches
Supabase at all. It renders a plain confirmation page with one button ("تأكيد الدخول")
that POSTs the code back to the same path; the actual PKCE token exchange only runs on
that same-origin POST. A scanner that only issues GETs can no longer consume the code;
a real visitor clicking the link sees one extra tap before landing on `/admin`.

Changed: `workers/leads/src/admin-session.ts` only (`files/workers-leads-src__admin-session.ts`
above is the full, current file — safe to copy whole, no divergence risk like
`custom-worker.ts`). `workers/leads/test/admin-session.test.mjs` was updated to match
(2 tests rewritten, 1 added) — copy is optional since it's test-only, but recommended
to keep coverage: diff against this repo's own copy, the only changed tests are the
three named around `/admin/callback`.

Verified: lint, type-check, all 82 `workers/leads/test/*.test.mjs` tests (count went
from 80 to 82), `cf:build` and `cf:preflight` all pass with this change.

## Fix 4 — Sec-Fetch-Site fallback for the same-origin check (CONFIRMED LIVE)

Reported live: the owner's own first admin-login attempt was refused (403
`{"ok":false,"error":"forbidden"}`) submitting the login form on arjandesign.com,
reproduced in a fresh Incognito window too (rules out extensions/translate as the
cause). The deployed Worker only accepted an exact `Origin` header match for POSTs
to `/admin*`, `/api/leads`, `/api/uploads`; some browsers/privacy configurations
omit or rewrite Origin on an otherwise legitimate same-site form POST.

`Sec-Fetch-Site` is a Fetch Metadata request header every current browser (Chrome,
Firefox, Safari, Edge, Brave) sets and rarely strips; `"same-origin"` there is at
least as strong a same-site signal as a matching Origin header. This only widens
what's accepted as same-site — it never accepts a genuinely cross-site request,
since that gets `Sec-Fetch-Site: cross-site`, not `same-origin`. Applied in three
places that previously checked Origin alone: `custom-worker.ts` (the website
Worker's outer gate for all lead/admin routes), `workers/leads/src/env.ts`'s
`originAllowed` (the public `/api/leads` and `/api/uploads` gate), and
`workers/leads/src/admin-session.ts` (the admin login/verify/save gate, exported
as `isSameOrigin` and reused by `admin.ts`'s lead-update endpoint too).

Applied by hand through the Cloudflare dashboard "Edit code" view on both
`arjan-website-production` and `arjan-leads-production`, then deployed. The
owner's own login went through afterwards — confirmed in live Supabase auth logs.

## Fix 1 — baseline security headers for the public site (CONFIRMED LIVE)

Public pages (served from Workers Static Assets) shipped with no hardening
headers beyond Cloudflare/Next defaults, while `/admin` already had a strict
CSP via the Worker. `public/_headers` now adds, for all routes: X-Content-Type-Options,
Referrer-Policy, X-Frame-Options, a minimal Permissions-Policy, and a conservative
HSTS (180 days, no includeSubDomains/preload — kept reversible).

## Fix 2 — www.arjandesign.com redirect to the apex (CONFIRMED LIVE)

`www.arjandesign.com` now has DNS and 308-redirects to the apex, path preserved.
Confirmed live today: `https://www.arjandesign.com/ar/services` → 308 to
`https://arjandesign.com/ar/services`.

## Fix 3 — docs/launch-status.md was describing an abandoned plan as current (CONFIRMED pushed; docs-only, nothing to "deploy")

The file still presented Cloudflare Access/Zero Trust as the active admin-protection
plan and showed a stale 70-test count. Moved into a clearly labeled "Superseded"
section (kept for history, not deleted); today's live findings folded in.

## Confirmed blockers hit along the way

- **Deploying fix 5**: needs `wrangler login` / a Cloudflare API token, or someone
  with deploy access applying the change above. This session's Cloudflare connector
  is read-only for Workers (`workers_list`, `workers_get_worker`,
  `workers_get_worker_code` only — no deploy/put tool) and has no DNS tool.
- **Creating a dedicated GitHub repo** for a clean PR: `mcp__github__create_repository`
  returned `403 Resource not accessible by integration`.
- Raw `.patch` files (`git am`-able) for fixes 1–4 were sent directly to the owner in
  chat earlier; fix 5's patch is likewise available on request.
