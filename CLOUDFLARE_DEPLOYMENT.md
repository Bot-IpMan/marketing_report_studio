# Cloudflare Deployment

This project is deployed as a browser-only static application through a
Cloudflare Worker with Static Assets.

## GitHub / Workers Builds

Connect the GitHub repository in Cloudflare Workers Builds and use:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

The production output directory is `dist/`, configured in `wrangler.toml`.

## Required Resources

None. Do not add:

- D1 databases;
- R2 buckets;
- KV namespaces;
- Cloudflare Access JWT variables;
- application API tokens or secrets.

The Worker routes `/api` and `/api/*` only to return `404 API_DISABLED`. A
Cloudflare Pages fallback handler does the same if the repository is deployed
through Pages by mistake.

## Security Headers

The build writes `dist/_headers`. Cloudflare Static Assets applies this file to
the hosted responses. It includes:

- a script-hash Content Security Policy;
- `connect-src 'none'`;
- HSTS for one year;
- `frame-ancestors 'none'` and `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- COOP, CORP, MIME sniffing protection, and a restrictive Permissions Policy;
- no-store and noindex directives.

After deployment, verify:

```bash
curl -I https://mrsai.lookdata.live/
curl -i https://mrsai.lookdata.live/api/health
```

The first response must contain `connect-src 'none'` and
`Strict-Transport-Security`. The second must return `404` with
`error.code = API_DISABLED`.

## Optional Cloudflare Access

Use Cloudflare Access only if the static application itself must be private.
This is independent of file storage: selected files remain in the browser in
either case. If Access is enabled, protect the entire hostname, not only
`/api/*`.

## Cloudflare Dashboard Checklist

1. SSL/TLS mode is `Full (strict)`.
2. Always Use HTTPS is enabled.
3. No public D1/R2/API bindings are attached to this Worker.
4. Remove obsolete plaintext variables and encrypted secrets from Worker
   Settings > Variables and Secrets.
5. Production and preview branches use the same browser-only build.
6. Logs do not intentionally capture request bodies or report contents.
7. Bot/indexing settings match the intended privacy level.

Do not enable HSTS preload or `includeSubDomains` without reviewing every
subdomain first. The application sends a host-only HSTS header.
