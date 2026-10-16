# ARJAN launch status — 2026-10-16 (updated by a Claude cloud session, same date)

Latest handoff: `docs/CLAUDE-HANDOFF-2026-10-16.md` supersedes older activation blockers below.
**Admin protection is Supabase PKCE email-link auth (`ADMIN_AUTH_PROVIDER=supabase`), not
Cloudflare Access.** The owner declined Access/Zero Trust billing authorization outright — this
is a closed decision, not a pending one; do not resume that checkout. See "Superseded: Cloudflare
Access path" below for what this replaced.

Verified live today (cloud session, no credentials needed): `https://arjandesign.com/ar` and `/en`
serve the real site (200). Anonymous `GET /admin` redirects to `/admin/login` (303,
private/no-store, noindex) with no customer data. Admin-login edge cases exercised live and
rejected correctly (non-allowlisted email, wrong Origin, wrong Content-Type) without touching the
owner's real account. robots.txt/sitemap.xml/canonical/hreflang/OG/JSON-LD all correct. Projects
page shows no leaked sample content. Privacy page makes no false auto-deletion promise.
`www.arjandesign.com` confirmed to have **no DNS record at all**.

Two code fixes (not yet deployed — this session has no Cloudflare credentials) are ready at
https://github.com/mohamedamer47/arjandesignandbuild/tree/claude/arjan-website-delivery-20261016/arjan-website-delivery-20261016:
baseline security response headers for the public site, and a www→apex redirect + matching Worker
route (www still needs a DNS record added in Cloudflare before that redirect can take effect).

Real staff login/save, intake end-to-end test through Turnstile, production notifications and
marketing connections remain incomplete. An automated "ARJAN QA TEST" submission attempt (real
browser automation, not a direct API call) reached Turnstile and was correctly refused there,
because the environment running it had to go through a single corporate proxy — the kind of
traffic Turnstile is built to catch. No test lead was created as a result; a real end-to-end test
still needs to run from an ordinary, non-proxied device.

This snapshot supersedes the historical baseline tables in production-readiness.md.
Notion tracker: https://app.notion.com/p/3fb22a91fac081e58957d257f8b3d1ab

## Implemented locally

- Modern bilingual site with distinct original nature-led concept images, public contact details,
  and an existing intake flow. Concepts are not presented as completed ARJAN projects.
- Customer follow-up at `/admin`: Supabase-verified session (not a Cloudflare Access JWT) and
  email allowlist, latest 200 requests, search/filter, status, notes, follow-up dates, optimistic
  concurrency and database audit history.
- Migrations `0001_leads.sql` and `0002_lead_admin.sql` are now applied to the separate
  production project `qbndyibtbwomdcgzzwwe`. Live SQL verified all three tables have RLS
  enabled and neither anon nor authenticated roles can SELECT them.
- Optional analytics consent, bilingual choices, withdrawal, and consent-gated attribution/events.
  No GTM ID is configured locally, so no Google or Meta account integration has been verified.
  Verified live today: the consent banner itself (essential-only vs allow-measurement) renders
  and works in both languages on the real site.
- Staff pages are excluded from indexing, and every admin response uses private/no-store headers.

## Verified

- **80** automated cases passed (not 70 — grew since the count below was last written):
  ingestion/replay/alerts, authenticated administration, private files, SQL privileges and
  concurrency, analytics consent. Tests use synthetic data and do not touch real customers.
- Full ESLint and TypeScript passed.
- Optimized webpack Next build and the complete OpenNext Cloudflare bundle passed.
  OpenNext now invokes the verified webpack build with its own standalone/tracing settings.
- Lead Worker dry-run compiled successfully; no deployment performed.
- Website dry-run compiled successfully: gzip upload ≈1101 KiB (reconfirmed independently by the
  cloud session today, close to the 1097.75 KiB figure previously recorded here — normal minor
  drift, not a regression). Reference-image preflight also passed. The package remains configured
  for the preview binding.
- Dashboard desktop 1280px and mobile 390px checked. Mobile privacy choices and Arabic/English
  switching checked. No horizontal overflow observed. Reconfirmed today directly on the live
  production domain (not just locally) across several pages in both languages.
- `npm audit --omit=dev`: zero reported production advisories after compatible updates.
  Reconfirmed today on a fresh `npm ci`.
- Remaining development-only advisory chain: braces → micromatch → fast-glob → Next ESLint.
  npm suggests a downgrade to Next ESLint 14; deliberately not applied to this Next 16 project.

## External activation still required

- Spaceship confirmed the nameserver update to `amalia.ns.cloudflare.com` /
  `vin.ns.cloudflare.com`. Cloudflare now confirms the zone is active. After the owner's
  approved temporary disablement, DNSSEC was re-enabled at Cloudflare and its DS record
  saved at Spaceship (key tag 2371, algorithm 13, digest type 2). Cloudflare explicitly
  confirms the domain is protected with DNSSEC. **Application binding is done**: the production
  Worker route for `arjandesign.com/*` is live and verified serving the real site (see above).
- **`www.arjandesign.com` has no DNS record yet** (confirmed directly today, not inferred).
  Once added in Cloudflare, the prepared route + redirect above need deploying to take effect.
- Production database, private bucket `arjan-leads-uploads-production`, internal Worker
  `arjan-leads-production`, separate rate-limit namespaces, origins and managed Turnstile
  widget are provisioned. Supabase and Turnstile secrets are encrypted in the production
  Worker. No secret file was created; direct browser-to-browser transfer was used after
  explicit approval. Production alerts (Telegram secrets still unset) and real end-to-end
  validation (owner login, a genuine test submission past Turnstile) are still pending.
- Production build now uses the canonical apex URL, production indexing flag, public
  contact details and the separate real Turnstile site key. Build and image preflight passed.
  The public build variables live in ignored `.env.production.local`; future preview builds
  must explicitly override the production flag/URL/site key to retain preview isolation.
- Finish the factual privacy notice and review final collection/processor/retention settings.
  (The live page's own wording already avoids promising automatic deletion — verified today.)
- Connect Search Console, GTM/GA4 and Meta using company-owned accounts; verify consent and
  successful lead events. No paid advertising or spend has been authorized.
- Deploy only after these gates, then verify HTTPS, canonical/alternate links, robots, sitemap,
  both language flows with uploads, notification delivery and staff login/save.

## Superseded: Cloudflare Access path (kept for history, not the current plan)

Earlier sessions scoped admin protection around Cloudflare Access/Zero Trust: a JWT-validated
policy, `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD` Worker settings, and a dashboard-side policy covering
`/admin*`. Cloudflare Zero Trust Free onboarding reached checkout, which required Terms
acceptance and card authorization for usage beyond free limits. **The owner declined this
outright** — neither the checkbox nor Activate was selected, and this was re-confirmed explicitly
in the 2026-10-16 handoff ("do not resume that checkout"). This is a closed decision, not an open
one waiting on the owner. The production admin path actually implemented and deployed is the
Supabase PKCE email-link flow described above and in `docs/admin-dashboard.md` /
`workers/leads/src/admin-session.ts`. The Access code (`admin-auth.ts`) still exists in the
codebase as a documented, inactive alternative for a deployment that explicitly chooses it — it
is not what `arjandesign.com` runs today.

## Access and data handling

Cloudflare CLI OAuth was refreshed successfully (in an earlier session; this cloud session has no
Cloudflare credentials of its own — see `docs/CLAUDE-HANDOFF-2026-10-16.md` for what it could and
could not verify independently). Browser sign-in to the intended Cloudflare account was verified,
as was browser sign-in to Spaceship. The registrar saved the new nameservers; Cloudflare
activation and DNSSEC restoration are confirmed. Supabase production access and schema
installation are confirmed.
No credentials are stored in this report.
No account password, token or customer payload is copied into Notion or this report.
The internal production lead Worker is deployed without a public URL. Public website/domain
binding is live (see above); staff authentication is implemented but not yet exercised with a
real login, and marketing integrations are not completed.
