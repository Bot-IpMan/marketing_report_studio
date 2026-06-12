import { onRequest as handleApiRequest } from './functions/api/[[path]].js';

const LEGACY_ROUTE = '/marketing_report_studio_v8_access_folders_fixed';
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const path = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
      return handleApiRequest({
        request,
        env,
        params: { path },
        waitUntil: ctx.waitUntil.bind(ctx),
        passThroughOnException: ctx.passThroughOnException?.bind(ctx),
      });
    }

    if (url.pathname === LEGACY_ROUTE) {
      const assetUrl = new URL('/', url.origin);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
