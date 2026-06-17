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
  gpxFileName?: string;
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

  // Cargar Leaflet.GPX si es necesario
  const hasGPX = Array.from(containers).some(container => {
    const rawConfig = container.dataset.mapConfig;
    if (!rawConfig) return false;
    try {
      const config = JSON.parse(decodeURIComponent(rawConfig));
      return !!config.gpxFileName;
    } catch {
      return false;
    }
  });

  const leafletModule = await import('leaflet');
  const L = leafletModule.default ?? leafletModule;

  // Cargar Leaflet.GPX dinámicamente si se necesita
  if (hasGPX) {
    await import('leaflet-gpx');
  }

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

    // Agregar control de descarga GPX y mostrar la trayectoria si gpxFileName está proporcionado
    if (config.gpxFileName) {
      // Control de descarga
      const DownloadControl = L.Control.extend({
        onAdd(map) {
          const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
          const button = L.DomUtil.create('button', '', container);
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
            const baseUrl = document.documentElement.getAttribute('data-base-url') || '';
            const url = `${baseUrl}gpx/strava/${filename}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
          });
          L.DomEvent.disableClickPropagation(button);
          return container;
        },
      });
      new DownloadControl({ position: 'topright' }).addTo(map);

      // Mostrar la trayectoria GPX en el mapa
      const baseUrl = document.documentElement.getAttribute('data-base-url') || '';
      const gpxUrl = `${baseUrl}gpx/strava/${config.gpxFileName}`;
      
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
          opacity: 0.8
        }
      }).on('loaded', function(e) {
        // El track ha cargado, ahora encuadramos y forzamos el redibujado del mapa
        map.fitBounds(e.target.getBounds());
        
        // Forzar un redibujado después de un pequeño retraso para asegurar que el layout esté listo
        setTimeout(() => {
          map.invalidateSize();
        }, 300);
        
      }).on('error', function(e) {
        console.error('Error loading GPX:', e);
      }).addTo(map);
    }

    // SOLUCIÓN CLAVE: Forzar invalidateSize después de la inicialización para corregir problemas de dimensionamiento
    // Esto asegura que el mapa se redimensione correctamente incluso si el contenedor aún no tiene su tamaño final
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  });
}

// Manejar la inicialización tanto en carga inicial como en transiciones de Swup
if (typeof document !== 'undefined') {
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeafletMaps);
  } else {
    initLeafletMaps();
  }

  // Re-inicializar después de cada transición de Swup
  document.addEventListener('swup:page:view', () => {
    // Pequeño retraso para asegurar que el DOM de la nueva página esté completamente renderizado
    setTimeout(initLeafletMaps, 50);
  });

  // También escuchar eventos de redimensionamiento de ventana para casos especiales
  window.addEventListener('resize', () => {
    // Actualizar todos los mapas Leaflet existentes
    const maps = document.querySelectorAll('.leaflet-map-container[data-leaflet-initialized]');
    maps.forEach((container) => {
      // Este enfoque es simplificado; en una implementación más robusta, mantendríamos referencias a los objetos mapa
      // Pero para nuestro propósito, reinicializaremos si es necesario
      if (!container.dataset.leafletUpdatable) {
        container.dataset.leafletUpdatable = 'true';
        setTimeout(() => {
          delete container.dataset.leafletUpdatable;
        }, 100);
      }
    });
  });
}

export {};