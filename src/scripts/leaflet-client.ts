interface MarkerConfig {
  lat: number;
  lng: number;
  popup?: string;
  title?: string;
}

interface PolylineConfig {
  points: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
}

interface PolygonConfig {
  points: [number, number][];
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

interface MapConfig {
  center: [number, number];
  zoom?: number;
  height?: string;
  tiles?: 'osm' | 'carto-light' | 'carto-dark' | 'auto';
  markers?: MarkerConfig[];
  polylines?: PolylineConfig[];
  polygons?: PolygonConfig[];
}

const TILE_PROVIDERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  'carto-light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  'carto-dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
} as const;

function getCurrentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function resolveTiles(tiles: MapConfig['tiles']): (typeof TILE_PROVIDERS)[keyof typeof TILE_PROVIDERS] {
  if (!tiles || tiles === 'auto') {
    return getCurrentTheme() === 'dark' ? TILE_PROVIDERS['carto-dark'] : TILE_PROVIDERS['carto-light'];
  }
  return TILE_PROVIDERS[tiles] ?? TILE_PROVIDERS.osm;
}

async function initLeafletMaps(): Promise<void> {
  const containers = document.querySelectorAll<HTMLElement>('.leaflet-map-container:not([data-leaflet-initialized])');
  if (containers.length === 0) return;

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    await new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
      setTimeout(resolve, 2000);
    });
  }

  const leafletModule = await import('leaflet');
  const L = leafletModule.default ?? leafletModule;

  containers.forEach((container) => {
    const rawConfig = container.dataset.mapConfig;
    if (!rawConfig) return;

    let config: MapConfig;
    try {
      config = JSON.parse(decodeURIComponent(rawConfig));
    } catch {
      return;
    }

    if (!config.center || !Array.isArray(config.center)) return;

    container.setAttribute('data-leaflet-initialized', 'true');

    const tileConfig = resolveTiles(config.tiles);
    const zoom = config.zoom ?? 12;

    const map = L.map(container, {
      center: config.center,
      zoom,
      scrollWheelZoom: false,
    });

    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    (config.markers ?? []).forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { title: m.title ?? '' }).addTo(map);
      if (m.popup) marker.bindPopup(m.popup);
    });

    (config.polylines ?? []).forEach((pl) => {
      L.polyline(pl.points, {
        color: pl.color ?? '#3388ff',
        weight: pl.weight ?? 3,
        opacity: pl.opacity ?? 1,
      }).addTo(map);
    });

    (config.polygons ?? []).forEach((pg) => {
      L.polygon(pg.points, {
        color: pg.color ?? '#3388ff',
        fillColor: pg.fillColor ?? pg.color ?? '#3388ff',
        fillOpacity: pg.fillOpacity ?? 0.2,
      }).addTo(map);
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeafletMaps);
  } else {
    initLeafletMaps();
  }

  document.addEventListener('swup:page:view', initLeafletMaps);
}

export {};
