import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

const IMAGE_FILE = /\.(jpe?g|png|webp|avif|gif)$/i;

/** Reference image files present on this machine (they are local-only and git-ignored). */
function localReferenceImages() {
  const dir = path.join(process.cwd(), "public", "references");
  return existsSync(dir) ? readdirSync(dir).filter((file) => IMAGE_FILE.test(file)) : [];
}

/**
 * LAUNCH BLOCKER check: reference images have unconfirmed publication rights and must not ship.
 * A production build warns loudly while any image file remains in public/references/.
 * See public/references/README.md.
 */
function warnAboutReferenceImages(images: string[]) {
  if (images.length === 0) return;
  console.warn(
    `\n⚠  LAUNCH BLOCKER: ${images.length} reference image(s) in public/references/ (${images.join(", ")}).\n` +
      "   Publication rights are unconfirmed. Do NOT deploy this build publicly: remove these files, replace them\n" +
      "   with ARJAN-owned/licensed assets, or move them out of public/ first.\n",
  );
}

/**
 * Locale entry redirects. These replace the former `proxy.ts`: Next.js 16 runs proxy as Node
 * middleware, which the Cloudflare adapter does not support. Static redirect rules behave the
 * same on Node and on Workers.
 *
 * - Arabic is chosen when it is the first supported language in Accept-Language (no "en" before "ar").
 *   The pattern is anchored explicitly: Next.js anchors `has` values itself, the Cloudflare adapter
 *   does not, and without anchors the two runtimes disagree on mixed-language headers.
 * - Anything not already under /en or /ar is sent to the same path under the chosen locale.
 * - Redirects run before public files are looked up, so top-level public folders must be listed
 *   in NOT_LOCALIZED or their files would be redirected. Files at the root (robots.txt etc.) are
 *   excluded by the "no dot" rule.
 */
const PREFERS_ARABIC = { type: "header" as const, key: "accept-language", value: "^(?:(?!\\ben\\b).)*\\bar\\b.*$" };
const NOT_LOCALIZED = ["en", "ar", "admin", "api", "_next", "brand", "references", "nature"];
const UNPREFIXED = `/:first((?!(?:${NOT_LOCALIZED.join("|")})(?:/|$))[^/.]+)/:rest*`;

export default function config(phase: string): NextConfig {
  const references = localReferenceImages();
  if (phase === PHASE_PRODUCTION_BUILD) warnAboutReferenceImages(references);

  return {
    devIndicators: false,
    // Fixed at build / dev-server start, so the reference-image fallback never depends on
    // reading the filesystem at request time (there is no project filesystem on Workers).
    env: { ARJAN_REFERENCE_FILES: references.join(",") },

    // No runtime image optimiser: Workers cannot run Next's, and the Cloudflare Images binding
    // is deliberately not used. Image files are exported at the sizes the layout needs.
    images: { unoptimized: true },

    // Unmatched addresses are answered with one prebuilt page (src/app/global-not-found.tsx)
    // instead of rendering the localized layout on every wrong URL.
    experimental: { globalNotFound: true },

    // Local development only: the lead routes live in the standalone lead Worker, so `next dev`
    // passes them to it (run it with `npm run leads:dev`). On Cloudflare the website Worker's
    // entry does this over a service binding instead; no rewrite exists in a built site.
    async rewrites() {
      if (phase !== PHASE_DEVELOPMENT_SERVER) return [];
      const leads = process.env.LEADS_DEV_ORIGIN ?? "http://127.0.0.1:8788";
      return {
        beforeFiles: [
          { source: "/admin", destination: `${leads}/admin` },
          { source: "/admin/:path*", destination: `${leads}/admin/:path*` },
          { source: "/api/leads", destination: `${leads}/api/leads` },
          { source: "/api/uploads/:submissionId", destination: `${leads}/api/uploads/:submissionId` },
        ],
        afterFiles: [],
        fallback: [],
      };
    },

    async redirects() {
      return [
        // Canonical host: www is not a separate site, just an alias worth redirecting away from.
        // Runs before the locale rules below so a www visitor lands on the apex with locale intact.
        { source: "/:path*", has: [{ type: "host", value: "www.arjandesign.com" }], destination: "https://arjandesign.com/:path*", permanent: true },
        { source: "/", has: [PREFERS_ARABIC], destination: "/ar", permanent: false },
        { source: "/", destination: "/en", permanent: false },
        { source: UNPREFIXED, has: [PREFERS_ARABIC], destination: "/ar/:first/:rest*", permanent: false },
        { source: UNPREFIXED, destination: "/en/:first/:rest*", permanent: false },
      ];
    },
  };
}
