# ARJAN website — delivery for merge into the Mac repo

This folder is **not** part of this repo's actual site. It is a parking spot for three
verified, ready-to-merge fixes to the real ARJAN project, which lives only on the
owner's Mac at `infra/cloudflare-preview` (never pushed to GitHub, so this session
had no repo to push a proper PR against). This was the best available option after
two blockers were hit and confirmed (see bottom).

## What to do with this

On the Mac, inside the real `arjan-website` repo, with the current branch's
uncommitted changes left exactly as they are:

```bash
cp arjan-website-delivery-20261016/files/public__headers public/_headers
cp arjan-website-delivery-20261016/files/next.config.ts next.config.ts
cp arjan-website-delivery-20261016/files/wrangler.production.jsonc wrangler.production.jsonc
cp arjan-website-delivery-20261016/files/docs__launch-status.md docs/launch-status.md
```

Then review the diff, run `npm run lint && npm run type-check && npm run cf:preflight && npm run cf:build`
and the test suite, and commit when satisfied. A Mac-side Claude Code session with
filesystem access can do this mechanically from this README without further
input — it only touches these 4 files, none of which overlap the uncommitted
changes flagged in the handoff doc (`src/lib/leads/build.ts`, `workers/leads/src/alerts.ts`).

## Fix 1 — baseline security headers for the public site

Public pages (served from Workers Static Assets) shipped with no hardening
headers beyond Cloudflare/Next defaults, while `/admin` already had a strict
CSP via the Worker. `public/_headers` now adds, for all routes: X-Content-Type-Options,
Referrer-Policy, X-Frame-Options, a minimal Permissions-Policy, and a conservative
HSTS (180 days, no includeSubDomains/preload — kept reversible).

## Fix 2 — www.arjandesign.com prepared to redirect to the apex

Confirmed live: `www.arjandesign.com` currently has **no DNS record at all**
(not just a missing redirect) — adding DNS in Cloudflare is still needed and is
outside what this session can do. But the production Worker route only matched
`arjandesign.com/*`, so even after DNS exists, requests to www would never reach
this Worker. Fixed in code, ready for when DNS is added:

- `wrangler.production.jsonc`: added a second route for `www.arjandesign.com/*`
  on the same zone.
- `next.config.ts`: added a host-matched 308 redirect from www to the apex,
  path-preserved, ahead of the existing locale redirects.

## Fix 3 — docs/launch-status.md was describing an abandoned plan as current

The file still presented Cloudflare Access/Zero Trust as the active admin-protection
plan ("Configure a narrow owner/staff policy...", "owner decision is required") and
showed a stale 70-test count. In fact the owner declined Access/Zero Trust billing
outright — a closed decision, not a pending one — and production admin protection
is the Supabase PKCE email-link flow, already implemented and deployed. The Access
material was moved into a clearly labeled "Superseded" section (kept for history,
not deleted), and today's independently verified live findings were folded in.
Docs only, no code changes.

## Verified (today, by this session)

- `npm ci`, `npm audit --omit=dev` (0 vulnerabilities), `lint`, `type-check`,
  all 80 `workers/leads/test/*.test.mjs` tests, `next build`, `npm run cf:build`
  (the real webpack+OpenNext production pipeline), and `cf:preflight` all pass
  with all three fixes applied, on an isolated copy of the Mac handoff export.
- The www redirect was verified locally with `next dev` + a spoofed Host header
  (www has no DNS yet to test it live): `www.arjandesign.com/ar/services` →
  308 to `https://arjandesign.com/ar/services`; apex behavior unchanged.
- Live on `arjandesign.com` today (unrelated to these fixes, verified separately):
  `/ar` and `/en` serve the real ARJAN site (200), `/admin` redirects anonymous
  visitors to `/admin/login` with no customer data (303, private/no-store/noindex),
  robots.txt/sitemap.xml/canonical/hreflang/OG/JSON-LD are all correct, the
  projects page shows no leaked sample/dev content, the privacy page makes no
  false auto-deletion promise, and admin-login security edge cases (non-allowlisted
  email, wrong Origin, wrong Content-Type) were exercised live and rejected
  correctly — without touching the real owner account.
- A full synthetic "ARJAN QA TEST" lead submission (AR + EN, with a test PDF
  attachment) was attempted end-to-end via real browser automation against the
  live site, both headless and headful (Xvfb). Every step up to Cloudflare
  Turnstile worked correctly. Turnstile itself refused the check — confirmed to
  be because this cloud environment's outbound traffic is forced through a single
  corporate proxy, which is exactly the signal Turnstile is designed to catch.
  **No synthetic lead was created in production as a result**; this was not
  bypassed. A real submission still needs to run from a normal, non-proxied
  network (any ordinary device off this specific sandboxed environment).

## Confirmed blockers hit while trying to avoid handing over patch files

- **Deploying any of these fixes**: needs `wrangler login` / a Cloudflare API token.
  No Cloudflare connector or credential exists anywhere in this session's tools.
- **Creating a dedicated GitHub repo** for a clean PR: `mcp__github__create_repository`
  was called and returned `403 Resource not accessible by integration` — this
  session's GitHub App cannot create repositories, only operate within ones
  already granted. That is why this landed here instead, on an isolated branch
  of an unrelated repo this session already had push access to.
- Raw `.patch` files (`git am`-able) were also sent directly to the owner in
  chat as a fallback, in case this repo isn't convenient to pull from.
