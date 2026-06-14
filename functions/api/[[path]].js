const HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// Safety fallback for accidental Cloudflare Pages deployments.
export function onRequest() {
  return new Response(
    JSON.stringify({
      error: {
        code: 'API_DISABLED',
        message: 'This deployment stores data only in the user browser.',
      },
    }),
    { status: 404, headers: HEADERS },
  );
}
