# ARJAN website — delivery for merge into the Mac repo

## ⚠️ URGENT: fix #4 below unblocks the owner's own admin login (reported failing live right now)

This folder is **not** part of this repo's actual site. It is a parking spot for
verified, ready-to-merge fixes to the real ARJAN project, which lives only on the
owner's Mac at `infra/cloudflare-preview` (never pushed to GitHub, so this session
had no repo to push a proper PR against).

**Status update:** fixes 1–3 below are already confirmed LIVE on arjandesign.com
(verified directly against the real Cloudflare account and the live domain) — someone
already applied and deployed them. Fix 4 is new and not yet applied anywhere; it is
urgent because the owner's own first admin-login attempt is failing because of it,
right now, live.

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

## Fix 4 — Sec-Fetch-Site fallback for the same-origin check (URGENT, not yet live)

Reported live: the owner's own first admin-login attempt was refused (403
`{"ok":false,"error":"forbidden"}`) submitting the login form on arjandesign.com,
reproduced in a fresh Incognito window too (rules out extensions/translate as the
cause). The deployed Worker only accepts an exact `Origin` header match for POSTs
to `/admin*`, `/api/leads`, `/api/uploads`; some browsers/privacy configurations
(e.g. Brave's Shields, suspected here) omit or rewrite Origin on an otherwise
legitimate same-site form POST.

`Sec-Fetch-Site` is a Fetch Metadata request header every current browser (Chrome,
Firefox, Safari, Edge, Brave) sets and rarely strips; `"same-origin"` there is at
least as strong a same-site signal as a matching Origin header. This only widens
what's accepted as same-site — it never accepts a genuinely cross-site request,
since that gets `Sec-Fetch-Site: cross-site`, not `same-origin`. Applied in three
places that previously checked Origin alone: `custom-worker.ts` (the website
Worker's outer gate for all lead/admin routes — apply by hand, see above),
`workers/leads/src/env.ts`'s `originAllowed` (the public `/api/leads` and
`/api/uploads` gate), and `workers/leads/src/admin-session.ts` (the admin
login/verify/save gate, now exported as `isSameOrigin` and reused by `admin.ts`'s
lead-update endpoint too).

Verified: lint, type-check, all 80 `workers/leads/test/*.test.mjs` tests, `cf:build`,
and `cf:preflight` all still pass with this change. Not yet deployed anywhere.

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

- **Deploying fix 4**: needs `wrangler login` / a Cloudflare API token, or someone
  with deploy access applying the targeted change above. This session's Cloudflare
  connector is read-only for Workers (`workers_list`, `workers_get_worker`,
  `workers_get_worker_code` only — no deploy/put tool) and has no DNS tool.
- **Creating a dedicated GitHub repo** for a clean PR: `mcp__github__create_repository`
  returned `403 Resource not accessible by integration`.
- Raw `.patch` files (`git am`-able) for all four fixes were also sent directly to
  the owner in chat.
