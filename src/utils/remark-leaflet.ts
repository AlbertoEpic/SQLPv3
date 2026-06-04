import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Code } from 'mdast';

/**
 * Remark plugin for Leaflet maps using fenced code blocks with lang=map.
 *
 * Example:
 * ```map
 * {
 *   "center": [40.4168, -3.7038],
 *   "zoom": 12,
 *   "markers": [{ "lat": 40.4168, "lng": -3.7038 }]
 * }
 * ```
 */
const remarkLeaflet: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'map') return;
      if (!node.value || typeof node.value !== 'string') return;

      let config: Record<string, unknown>;
      try {
        config = JSON.parse(node.value);
      } catch {
        return;
      }

      const height = (config.height as string) || '400px';
      const mapId = `leaflet-map-${Math.random().toString(36).slice(2, 11)}`;
      const encoded = encodeURIComponent(JSON.stringify(config));

      const html = {
        type: 'html',
        value: `<div
  id="${mapId}"
  class="leaflet-map-container not-prose"
  data-map-config="${encoded}"
  style="height:${height};width:100%;border-radius:0.5rem;overflow:hidden;position:relative;"
  aria-label="Mapa interactivo"
></div>`,
      } as const;

      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1, html as any);
      }
    });
  };
};

export default remarkLeaflet;
