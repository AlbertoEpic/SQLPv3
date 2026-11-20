import type { APIRoute } from 'astro';

export const prerender = false;

const ALLOWED_HOSTS = new Set([
  'alberguesyrefugios.com',
  'etraffic.dgt.es',
  'imgproxy.windy.com',
]);

export const GET: APIRoute = async ({ url }) => {
  let imageUrl: URL;
  try {
    imageUrl = new URL(url.searchParams.get('url') ?? '');
  } catch {
    return new Response('bad url', { status: 400 });
  }

  if (
    imageUrl.protocol !== 'https:' ||
    !ALLOWED_HOSTS.has(imageUrl.hostname) ||
    imageUrl.username ||
    imageUrl.password ||
    imageUrl.port
  ) {
    return new Response('forbidden', { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 SQLP-webcams' },
      redirect: 'manual',
    });
  } catch (error) {
    console.error('[api/snap] Image fetch failed:', error);
    return new Response('upstream error', { status: 502 });
  }

  if (!upstream.ok) {
    console.error(`[api/snap] Image host returned ${upstream.status}`);
    return new Response('upstream error', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) return new Response('not an image', { status: 415 });

  return new Response(upstream.body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
