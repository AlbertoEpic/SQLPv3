export const prerender = true;

export function GET() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${normalizedBase}favicon.png`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
