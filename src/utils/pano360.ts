const PANO360_FEED_URL = 'https://pano360.soloquedalopeor.com/rss.xml';

const FALLBACK_PANO360 = {
  link: 'https://pano360.soloquedalopeor.com/productos/tres-guegas-2-303m-verano/',
  title: 'Tres Güegas (2.303m) - verano',
  image: 'https://pano360.soloquedalopeor.com/products/tres-guegas-2-303m-verano.jpg',
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/^<!\[CDATA\[/i, '')
    .replace(/\]\]>$/i, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function getPano360ImageUrl(link: string) {
  try {
    const productUrl = new URL(link);
    const productSlug = productUrl.pathname.match(/^\/productos\/([^/]+)\/?$/i)?.[1];

    if (productUrl.hostname !== 'pano360.soloquedalopeor.com' || !productSlug) {
      return null;
    }

    return `${productUrl.origin}/products/${productSlug}.jpg`;
  } catch {
    return null;
  }
}

function parseLatestPano360(xml: string) {
  const items = Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)).map((match) => match[1]);

  for (const item of items) {
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);

    if (!linkMatch?.[1]) {
      continue;
    }

    const link = decodeXmlEntities(linkMatch[1]);
    if (!link.includes('/productos/')) {
      continue;
    }

    return {
      link,
      title: decodeXmlEntities(titleMatch?.[1] || 'Ver ultima panoramica'),
      image: getPano360ImageUrl(link),
    };
  }

  return null;
}

export async function getLatestPano360() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(PANO360_FEED_URL, {
      headers: {
        Accept: 'application/xml,text/xml',
        'User-Agent': 'SQLP-Astro/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return FALLBACK_PANO360;
    }

    const xml = await response.text();
    return parseLatestPano360(xml) ?? FALLBACK_PANO360;
  } catch {
    return FALLBACK_PANO360;
  }
}
