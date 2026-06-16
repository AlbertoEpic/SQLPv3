interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
}

interface GPXTrack {
  name?: string;
  points: GPXPoint[];
}

interface ParsedGPX {
  tracks: GPXTrack[];
  points: GPXPoint[];
  bounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

function parseGPXString(gpxString: string): ParsedGPX {
  const tracks: GPXTrack[] = [];
  const allPoints: GPXPoint[] = [];

  // Simple regex-based parsing for server-side
  const trkRegex = /<trk>([\s\S]*?)<\/trk>/g;
  const trksegRegex = /<trkseg>([\s\S]*?)<\/trkseg>/g;
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">([\s\S]*?)<\/trkpt>/g;
  const eleRegex = /<ele>([^<]+)<\/ele>/;
  const nameRegex = /<name>([^<]+)<\/name>/;

  let trkMatch;
  while ((trkMatch = trkRegex.exec(gpxString)) !== null) {
    const trkContent = trkMatch[1];
    const nameMatch = nameRegex.exec(trkContent);
    const trackName = nameMatch ? nameMatch[1] : 'Track';

    const points: GPXPoint[] = [];
    let trksegMatch;

    while ((trksegMatch = trksegRegex.exec(trkContent)) !== null) {
      const trksegContent = trksegMatch[1];
      let trkptMatch;

      while ((trkptMatch = trkptRegex.exec(trksegContent)) !== null) {
        const lat = parseFloat(trkptMatch[1]);
        const lon = parseFloat(trkptMatch[2]);
        const pointContent = trkptMatch[3];
        const eleMatch = eleRegex.exec(pointContent);
        const ele = eleMatch ? parseFloat(eleMatch[1]) : undefined;

        const point: GPXPoint = { lat, lon, ...(ele !== undefined && { ele }) };
        points.push(point);
        allPoints.push(point);
      }
    }

    if (points.length > 0) {
      tracks.push({ name: trackName, points });
    }
  }

  // Calculate bounds
  let bounds: ParsedGPX['bounds'] | undefined;
  if (allPoints.length > 0) {
    const lats = allPoints.map((p) => p.lat);
    const lons = allPoints.map((p) => p.lon);

    bounds = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    };
  }

  return {
    tracks,
    points: allPoints,
    bounds,
  };
}

function calculateCenterAndZoom(bounds: ParsedGPX['bounds']): { center: [number, number]; zoom: number } {
  if (!bounds) {
    return { center: [42.145, -0.401], zoom: 10 };
  }

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;

  // Calculate zoom level based on bounds
  const latDiff = bounds.maxLat - bounds.minLat;
  const lonDiff = bounds.maxLon - bounds.minLon;
  const maxDiff = Math.max(latDiff, lonDiff);

  let zoom = 10;
  if (maxDiff < 0.01) zoom = 15;
  else if (maxDiff < 0.05) zoom = 14;
  else if (maxDiff < 0.1) zoom = 13;
  else if (maxDiff < 0.25) zoom = 12;
  else if (maxDiff < 0.5) zoom = 11;

  return { center: [centerLat, centerLon], zoom };
}

export { parseGPXString, calculateCenterAndZoom, type ParsedGPX, type GPXPoint };

