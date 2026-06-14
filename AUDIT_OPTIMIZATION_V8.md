# Security And Optimization Audit

Updated: 2026-06-15

## Verified Production State

Audit target: <https://mrsai.lookdata.live/>

Before the current changes, the live site returned strong CSP, no-store,
no-referrer, frame blocking, MIME sniffing protection, and noindex headers.
`/api/health` returned `{ "ok": true, "configured": false }`, confirming that
D1 and R2 were not configured in production.

The live response did not yet include HSTS, COOP, or CORP, and its CSP allowed
connections, images, and frames from arbitrary HTTPS origins.

## Changes Applied

1. Browser-only mode is now explicit in the UI.
2. Worker and Pages `/api/*` routes always return `404 API_DISABLED`.
3. D1/R2/Access configuration and SQL migration were removed.
4. Production CSP now uses `connect-src 'none'` and blocks remote image/frame
   sources while preserving local `data:` and `blob:` previews.
5. HSTS, COOP, CORP, Origin-Agent-Cluster, and cross-domain policy headers were
   added.
6. HTML and PDF previews are sandboxed with no referrer.
7. File and archive limits reduce browser memory-exhaustion and ZIP-bomb risk.
8. Temporary download blob URLs are revoked.
9. Tests enforce browser-only deployment and fail if server storage or network
   access is reintroduced.
10. Current files and Git history were scanned for common secret patterns; no
    matching credentials were found.

## Data Flow

```text
User file -> Browser File API -> In-memory report/browser storage -> UI/export
```

There is no application data path from the page to Cloudflare storage or an
external API. Opening the site still sends ordinary HTTP metadata to Cloudflare.

## Remaining Risks

- Browser `localStorage` persists in the current profile until cleared.
- Exported HTML/ZIP files contain the data selected for export and must be
  protected by the user.
- Browser extensions, malware, or another person using the same unlocked browser
  profile are outside the application's security boundary.
- Restricting who may open the site requires a hostname-wide Cloudflare Access
  policy; `robots.txt` is not authentication.
- A real-browser E2E test and post-deployment header check should be run after
  each production release.

## Verification

```bash
npm run check
```
