// src/scripts/home-graph-client.ts
// Inicializador robusto para HomeGraph compatible con Swup/Astro SPA
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links?: GraphLink[];
  connections?: GraphLink[];
}

function resolveEndpoint(endpoint: string | GraphNode, nodes: GraphNode[]): GraphNode | undefined {
  return typeof endpoint === 'string'
    ? nodes.find((node) => node.id === endpoint)
    : endpoint;
}

async function initHomeGraph() {
  const svgElement = d3.select<SVGSVGElement, unknown>('#connection-graph');
  if (svgElement.empty()) return;
  svgElement.selectAll("*").remove();

  const width = 800;
  const height = 500;
  svgElement.attr("width", width).attr("height", height);

  // Cargar datos del grafo
  let data: GraphData;
  try {
    const res = await fetch('graph/graph-data.json');
    data = await res.json();
  } catch (e) {
    svgElement.append('text').attr('x', 20).attr('y', 40).text('Error cargando el grafo');
    return;
  }
  const nodes = data.nodes || [];
  const links = data.links || data.connections || [];

  // Grupo para zoom
  const zoomGroup = svgElement.append('g').attr('id', 'zoom-group');

  // Simulación y renderizado mínimo (nodos y enlaces)
  const simulation = d3.forceSimulation<GraphNode>(nodes)
    .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((node) => node.id).distance(90))
    .force('charge', d3.forceManyBody().strength(-220))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const link = zoomGroup.append('g')
    .attr('stroke', '#aaa')
    .selectAll<SVGLineElement, GraphLink>('line')
    .data(links)
    .join('line')
    .attr('stroke-width', 1.5);

  const node = zoomGroup.append('g')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .selectAll<SVGCircleElement, GraphNode>('circle')
    .data(nodes)
    .join('circle')
    .attr('r', 8)
    .attr('fill', '#3182bd')
    .call(d3.drag<SVGCircleElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
    );

  simulation.on('tick', () => {
    link.each(function (d) {
      const source = resolveEndpoint(d.source, nodes);
      const target = resolveEndpoint(d.target, nodes);
      if (!source || !target) return;
      d3.select(this)
        .attr('x1', source.x ?? 0)
        .attr('y1', source.y ?? 0)
        .attr('x2', target.x ?? 0)
        .attr('y2', target.y ?? 0);
    });
    node
      .attr('cx', d => d.x ?? 0)
      .attr('cy', d => d.y ?? 0);
  });

  // --- ZOOM ---
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      zoomGroup.attr('transform', event.transform);
    });
  svgElement.call(zoom as any);

  // Botón de reset zoom
  const resetBtn = document.getElementById('reset-zoom-btn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      svgElement.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    };
  }

  // --- FULLSCREEN ---
  const fsBtn = document.getElementById('fullscreen-btn');
  if (fsBtn) {
    fsBtn.onclick = () => {
      const container = document.getElementById('graph-container');
      if (!container) return;
      if (!document.fullscreenElement) {
        container.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    };
  }

  // Accesibilidad: salir de fullscreen con Esc
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      // Opcional: puedes hacer algo al salir de fullscreen
    }
  });

}

// Siempre idempotente: limpia y reinicializa
window.initializeHomeGraph = initHomeGraph;

// Inicialización automática si el DOM está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomeGraph);
} else {
  initHomeGraph();
}
document.addEventListener('astro:page-load', initHomeGraph);
