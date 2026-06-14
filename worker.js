const LEGACY_ROUTE = '/marketing_report_studio_v8_access_folders_fixed';
const API_HEADERS = {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return apiDisabled();
    }

    if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { ...API_HEADERS, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (url.pathname === LEGACY_ROUTE) {
      return new Response(null, {
        status: 308,
        headers: { ...API_HEADERS, Location: '/' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

function apiDisabled() {
  return new Response(
    JSON.stringify({
      error: {
        code: 'API_DISABLED',
        message: 'This deployment stores data only in the user browser.',
      },
    }),
    { status: 404, headers: API_HEADERS },
  );
}
