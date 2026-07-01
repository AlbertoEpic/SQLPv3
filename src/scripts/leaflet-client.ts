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
  tiles?: 'topo' | 'esri' | 'auto';
  markers?: MarkerConfig[];
  polylines?: PolylineConfig[];
  polygons?: PolygonConfig[];
  gpxFileName?: string;
}

type LeafletMap = {
  invalidateSize: (options?: { animate?: boolean }) => void;
  fitBounds: (bounds: unknown) => void;
};

type LeafletControl = {
  addTo: (map: LeafletMap) => void;
};

const TILE_PROVIDERS = {
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    maxZoom: 17,
  },
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>',
    maxZoom: 19,
  },
} as const;

const mapInstances = new WeakMap<HTMLElement, LeafletMap>();

function getSiteBasePath(): string {
  const raw = document.documentElement.getAttribute('data-base-url') || '/';
  if (raw === '/') return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function getCurrentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function resolveTiles(tiles: MapConfig['tiles']): (typeof TILE_PROVIDERS)[keyof typeof TILE_PROVIDERS] {
  if (!tiles || tiles === 'auto') {
    return TILE_PROVIDERS.topo;
  }
  return TILE_PROVIDERS[tiles] ?? TILE_PROVIDERS.topo;
}

function invalidateAllLeafletMaps(): void {
  document.querySelectorAll<HTMLElement>('.leaflet-map-container[data-leaflet-initialized]').forEach((container) => {
    mapInstances.get(container)?.invalidateSize();
  });
}

function scheduleMapResize(map: LeafletMap): void {
  [0, 100, 300, 600].forEach((delay) => {
    setTimeout(() => map.invalidateSize(), delay);
  });
}

function addFullscreenControl(L: any, map: LeafletMap, container: HTMLElement): void {
  const FullscreenControl = L.Control.extend({
    onAdd() {
      const controlContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
      const button = L.DomUtil.create('button', '', controlContainer);

      button.type = 'button';
      button.innerHTML = '⛶';
      button.title = 'Pantalla completa';
      button.setAttribute('aria-label', 'Pantalla completa');
      button.style.cssText = `
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        font-weight: 700;
        background: white;
        border: none;
        border-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        color: #333;
      `;

      const updateButtonState = () => {
        const isFullscreen = document.fullscreenElement === container || (document as any).webkitFullscreenElement === container;
        button.innerHTML = isFullscreen ? '⤡' : '⛶';
        button.title = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
        button.setAttribute('aria-label', button.title);
      };

      button.addEventListener('click', () => {
        const isFullscreen = document.fullscreenElement === container || (document as any).webkitFullscreenElement === container;
        if (!isFullscreen) {
          (container.requestFullscreen || (container as any).webkitRequestFullscreen || (() => {})).call(container);
        } else {
          (document.exitFullscreen || (document as any).webkitExitFullscreen || (() => {})).call(document);
        }
      });

      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.disableScrollPropagation(button);

      document.addEventListener('fullscreenchange', () => {
        updateButtonState();
        map.invalidateSize();
      });
      document.addEventListener('webkitfullscreenchange', () => {
        updateButtonState();
        map.invalidateSize();
      });

      updateButtonState();
      return controlContainer;
    },
  });

  new FullscreenControl().addTo(map);
}

async function ensureLeafletAssets(needsGpx: boolean): Promise<{ L: any }> {
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

  if (needsGpx) {
    await import('leaflet-gpx');
  }

  return { L };
}

async function initLeafletMaps(): Promise<void> {
  const containers = document.querySelectorAll<HTMLElement>('.leaflet-map-container:not([data-leaflet-initialized])');
  if (containers.length === 0) return;

  const needsGpx = Array.from(containers).some((container) => {
    const rawConfig = container.dataset.mapConfig;
    if (!rawConfig) return false;
    try {
      const config = JSON.parse(decodeURIComponent(rawConfig)) as MapConfig;
      return !!config.gpxFileName;
    } catch {
      return false;
    }
  });

  const { L } = await ensureLeafletAssets(needsGpx);

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
    }) as LeafletMap;

    mapInstances.set(container, map);

    const topoLayer = L.tileLayer(TILE_PROVIDERS.topo.url, {
      attribution: TILE_PROVIDERS.topo.attribution,
      maxZoom: TILE_PROVIDERS.topo.maxZoom,
    });
    const esriLayer = L.tileLayer(TILE_PROVIDERS.esri.url, {
      attribution: TILE_PROVIDERS.esri.attribution,
      maxZoom: TILE_PROVIDERS.esri.maxZoom,
    });

    const activeLayer = tileConfig === TILE_PROVIDERS.esri ? esriLayer : topoLayer;

    activeLayer.addTo(map);

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

    if (config.gpxFileName) {
      const DownloadControl = L.Control.extend({
        onAdd() {
          const controlContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
          const button = L.DomUtil.create('button', '', controlContainer);
          button.innerHTML = '⬇️ Descargar GPX';
          button.title = 'Descargar track GPX';
          button.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            background: white;
            border: none;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            color: #333;
            white-space: nowrap;
            transition: background 0.2s;
          `;
          button.onmouseover = () => { button.style.background = '#f0f0f0'; };
          button.onmouseout = () => { button.style.background = 'white'; };
          L.DomEvent.on(button, 'click', () => {
            const filename = config.gpxFileName;
            const url = `${getSiteBasePath()}gpx/strava/${filename}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = filename ?? 'track.gpx';
            link.click();
          });
          L.DomEvent.disableClickPropagation(button);
          return controlContainer;
        },
      });
      new DownloadControl({ position: 'topright' }).addTo(map);

      const gpxUrl = `${getSiteBasePath()}gpx/strava/${config.gpxFileName}`;

      new L.GPX(gpxUrl, {
        async: true,
        marker_options: {
          startIconUrl: null,
          endIconUrl: null,
          shadowUrl: null,
        },
        polyline_options: {
          color: '#ff0000',
          weight: 4,
          opacity: 0.8,
        },
      })
        .on('loaded', function loaded(this: { getBounds: () => unknown }) {
          map.fitBounds(this.getBounds());
          scheduleMapResize(map);
        })
        .on('error', function error() {
          scheduleMapResize(map);
        })
        .addTo(map);
    }

    L.control.layers(
      { 'Topográfico': topoLayer, 'Satélite': esriLayer },
      {},
      { position: 'topright', collapsed: true }
    ).addTo(map);

    addFullscreenControl(L, map, container);

    scheduleMapResize(map);
  });
}

function initializeLeafletMaps(): void {
  requestAnimationFrame(() => {
    void initLeafletMaps().then(() => {
      invalidateAllLeafletMaps();
    });
  });
}

if (typeof window !== 'undefined') {
  window.initializeLeafletMaps = initializeLeafletMaps;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLeafletMaps);
  } else {
    initializeLeafletMaps();
  }

  window.addEventListener('load', () => {
    initializeLeafletMaps();
    invalidateAllLeafletMaps();
  });

  window.addEventListener('hashchange', () => {
    setTimeout(invalidateAllLeafletMaps, 50);
    setTimeout(invalidateAllLeafletMaps, 300);
  });

  window.addEventListener('resize', () => {
    invalidateAllLeafletMaps();
  });
}

export {};
