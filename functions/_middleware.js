import { resolveAndRecordHit } from './_shared/db.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function onRequest(context) {
  const { request, env, next, waitUntil } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Check if this is a QR redirection request:
  // Either /?k=QR000011 or /r/QR000011 or /api/redirect?k=QR000011
  let qrKey = null;

  if (path.startsWith('/r/')) {
    qrKey = decodeURIComponent(path.slice(3)).trim();
  } else if ((path === '/' || path === '/index.html' || path === '/api/redirect') && url.searchParams.has('k') && url.searchParams.get('dashboard') !== '1') {
    qrKey = url.searchParams.get('k').trim();
  }

  if (qrKey && request.method === 'GET') {
    const wantsText =
      url.searchParams.get('format') === 'text' ||
      path === '/api/redirect' ||
      request.headers.get('sec-fetch-mode') === 'cors' ||
      (request.headers.get('accept') || '').includes('text/plain');

    try {
      const result = await resolveAndRecordHit(env, qrKey, waitUntil);

      if (wantsText) {
        return new Response(result.url || '', {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      }

      if (result.found && result.url) {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': result.url,
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      }

      // QR exists in sheet/DB but has no URL assigned yet -> open dashboard highlighting this QR so user can identify/assign it!
      const targetDashboardUrl = new URL('/', request.url);
      targetDashboardUrl.searchParams.set('scanned', qrKey);
      targetDashboardUrl.searchParams.set('status', result.found ? 'unassigned' : 'notfound');

      return new Response(null, {
        status: 302,
        headers: {
          'Location': targetDashboardUrl.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    } catch (err) {
      if (wantsText) {
        return new Response('', { status: 500, headers: CORS_HEADERS });
      }
    }
  }

  const response = await next();
  return response;
}
