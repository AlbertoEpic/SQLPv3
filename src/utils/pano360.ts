const PANO360_FEED_URL = 'https://pano360.soloquedalopeor.com/wp-content/uploads/woo-feed/custom/xml/feedpano360.xml';

const FALLBACK_PANO360 = {
  link: 'https://pano360.soloquedalopeor.com/panorama/garmo-negro-3-064m-2/',
  title: 'Garmo Negro (3.064m)',
  image: 'https://pano360.soloquedalopeor.com/wp-content/uploads/2026/04/Garmo-Negro.jpg',
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function parseLatestPano360(xml: string) {
  const products = Array.from(xml.matchAll(/<product>([\s\S]*?)<\/product>/gi)).map((match) => match[1]);

  for (const product of products) {
    const linkMatch = product.match(/<link>([\s\S]*?)<\/link>/i);
    const titleMatch = product.match(/<title>([\s\S]*?)<\/title>/i);
    const imageMatch = product.match(/<image_link>([\s\S]*?)<\/image_link>/i);

    if (!linkMatch?.[1]) {
      continue;
    }

    const link = decodeXmlEntities(linkMatch[1]);
    if (!link.includes('/panorama/')) {
      continue;
    }

    return {
      link,
      title: decodeXmlEntities(titleMatch?.[1] || 'Ver ultima panoramica'),
      image: imageMatch ? decodeXmlEntities(imageMatch[1]) : null,
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
