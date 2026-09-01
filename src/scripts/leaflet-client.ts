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
  elevationTargetId?: string;
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

function ensureStylesheet(id: string, href: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  if (existing) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
    setTimeout(resolve, 2000);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

async function loadScriptWithFallback(sources: string[]): Promise<void> {
  let lastError: unknown = null;
  for (const src of sources) {
    try {
      await loadScript(src);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No se pudo cargar el script requerido.');
}

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

function addFullscreenControl(L: any, map: LeafletMap, container: HTMLElement, config: MapConfig): void {
  const fullscreenTarget = container.closest<HTMLElement>('.leaflet-map-shell') ?? container;
  const elevationTarget = config.elevationTargetId
    ? document.getElementById(config.elevationTargetId)
    : null;

  function getFullscreenRows(): string {
    if (typeof window === 'undefined') return '3fr 1fr';
    const mobileViewport = window.matchMedia('(max-width: 768px), (max-height: 800px)').matches;
    return mobileViewport ? '7fr 3fr' : '3fr 1fr';
  }

  function applyFullscreenLayout(isFullscreen: boolean): void {
    if (fullscreenTarget !== container) {
      if (isFullscreen) {
        fullscreenTarget.style.display = 'grid';
        fullscreenTarget.style.gridTemplateRows = getFullscreenRows();
        fullscreenTarget.style.gap = '0.5rem';
        fullscreenTarget.style.padding = '0.75rem';
        fullscreenTarget.style.boxSizing = 'border-box';
        fullscreenTarget.style.height = '100dvh';
        fullscreenTarget.style.width = '100vw';
        fullscreenTarget.style.overflow = 'hidden';
      } else {
        fullscreenTarget.style.removeProperty('display');
        fullscreenTarget.style.removeProperty('grid-template-rows');
        fullscreenTarget.style.removeProperty('gap');
        fullscreenTarget.style.removeProperty('padding');
        fullscreenTarget.style.removeProperty('box-sizing');
        fullscreenTarget.style.removeProperty('height');
        fullscreenTarget.style.removeProperty('width');
        fullscreenTarget.style.removeProperty('overflow');
      }
    }

    if (isFullscreen) {
      container.style.height = '100%';
      if (elevationTarget) {
        elevationTarget.style.height = '100%';
        elevationTarget.style.minHeight = '0';
      }
    } else {
      container.style.height = config.height ?? '400px';
      if (elevationTarget) {
        elevationTarget.style.removeProperty('height');
        elevationTarget.style.removeProperty('min-height');
      }
    }
  }

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
        const isFullscreen = document.fullscreenElement === fullscreenTarget || (document as any).webkitFullscreenElement === fullscreenTarget;
        applyFullscreenLayout(isFullscreen);
        button.innerHTML = isFullscreen ? '⤡' : '⛶';
        button.title = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
        button.setAttribute('aria-label', button.title);
      };

      button.addEventListener('click', () => {
        const isFullscreen = document.fullscreenElement === fullscreenTarget || (document as any).webkitFullscreenElement === fullscreenTarget;
        if (!isFullscreen) {
          (fullscreenTarget.requestFullscreen || (fullscreenTarget as any).webkitRequestFullscreen || (() => {})).call(fullscreenTarget);
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
  await ensureStylesheet('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

  const leafletModule = await import('leaflet');
  const L = leafletModule.default ?? leafletModule;

  if (needsGpx) {
    await import('leaflet-gpx');

    await ensureStylesheet(
      'leaflet-elevation-css',
      'https://unpkg.com/@raruto/leaflet-elevation@2.5.2/dist/leaflet-elevation.min.css'
    );

    const elevationReady = typeof L?.control?.elevation === 'function';
    if (!elevationReady) {
      await loadScriptWithFallback([
        'https://unpkg.com/d3@7.9.0/dist/d3.min.js',
        'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
      ]);
      await loadScriptWithFallback([
        'https://unpkg.com/@raruto/leaflet-elevation@2.5.2/dist/leaflet-elevation.min.js',
        'https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.2/dist/leaflet-elevation.min.js',
      ]);
    }
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
      const elevationTargetSelector = config.elevationTargetId ? `#${config.elevationTargetId}` : null;

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
        .on('loaded', function loaded(this: { getBounds: () => unknown; get_elevation_gain?: () => number }) {
          if (elevationTargetSelector && typeof L?.control?.elevation === 'function') {
            const elevationTarget = document.querySelector<HTMLElement>(elevationTargetSelector);
            if (elevationTarget) {
              const theme = getCurrentTheme() === 'dark' ? 'magenta-theme' : 'lightblue-theme';
              const elevationGain = this.get_elevation_gain?.() ?? 0;
              elevationTarget.classList.remove('hidden');

              const elevationControl = L.control.elevation({
                detached: true,
                elevationDiv: elevationTargetSelector,
                theme,
                followMarker: true,
                autohide: false,
                collapsed: false,
                summary: 'inline',
                slope: false,
                speed: false,
                acceleration: false,
                waypoints: false,
                distanceMarkers: false,
                gpxOptions: {
                  async: true,
                },
              });

              const updateElevationSummary = () => {
                const averageElevation = elevationTarget.querySelector<HTMLElement>('.avgele');
                const label = averageElevation?.querySelector<HTMLElement>('.summarylabel');
                const value = averageElevation?.querySelector<HTMLElement>('.summaryvalue');
                const formattedGain = `${Math.round(elevationGain)} m`;
                if (label && label.textContent !== 'Desnivel+ acumulado: ') {
                  label.textContent = 'Desnivel+ acumulado: ';
                }
                if (value && value.textContent !== formattedGain) {
                  value.textContent = formattedGain;
                }
              };

              const summaryObserver = new MutationObserver(updateElevationSummary);
              summaryObserver.observe(elevationTarget, { childList: true, subtree: true, characterData: true });

              elevationControl.addTo(map);
              elevationControl.on('eledata_loaded', updateElevationSummary);
              elevationControl.load(gpxUrl);
            }
          }

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

    addFullscreenControl(L, map, container, config);

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
