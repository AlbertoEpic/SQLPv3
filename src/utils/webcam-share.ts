const siteOrigin = 'https://soloquedalopeor.com';

export const webcamPageUrl = `${siteOrigin}/webcams`;

export function webcamShareUrl(id: string): string {
  return `${webcamPageUrl}/compartir/${encodeURIComponent(id)}/`;
}

export function webcamShareImage(type: string, embedUrl: string): string {
  if ((type === 'dgt' || type === 'snapshot') && embedUrl.startsWith('https://')) {
    return embedUrl;
  }
  return `${siteOrigin}/banner-webcams.png`;
}
