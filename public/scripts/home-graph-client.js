// public/scripts/home-graph-client.js
// Inicializador robusto para HomeGraph compatible con Swup/Astro SPA
// Versión JS para uso directo en navegador

// Asegúrate de que d3 está disponible globalmente (window.d3)
(function() {
  const d3 = window.d3;
  if (!d3) {
    console.error('d3 no está disponible en window. Asegúrate de incluir d3.js en tu layout.');
    return;
  }

  async function initHomeGraph() {
    const svgElement = d3.select('#connection-graph');
    if (svgElement.empty()) return;
    svgElement.selectAll("*").remove();

    const width = 800;
    const height = 500;
    svgElement.attr("width", width).attr("height", height);

    // Cargar datos del grafo
    let data;
    try {
      // Detectar basePath automáticamente
      let base = '/';
      const pathParts = window.location.pathname.split('/');
      if (pathParts.includes('SQLPv3')) {
        // Busca la posición de SQLPv3 y arma la base
        const idx = pathParts.indexOf('SQLPv3');
        base = '/' + pathParts.slice(1, idx + 1).join('/') + '/';
      }
      const res = await fetch(`${base}graph/graph-data.json`);
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
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = zoomGroup.append('g')
      .attr('stroke', '#aaa')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5);

    const node = zoomGroup.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 8)
      .attr('fill', '#3182bd')
      .call(d3.drag()
        .on('start', function(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', function(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', function(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    simulation.on('tick', function() {
      link
        .attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });
      node
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });
    });

    // --- ZOOM ---
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', function(event) {
        zoomGroup.attr('transform', event.transform);
      });
    svgElement.call(zoom);

    // Botón de reset zoom
    const resetBtn = document.getElementById('reset-zoom-btn');
    if (resetBtn) {
      resetBtn.onclick = function() {
        svgElement.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
      };
    }

    // --- FULLSCREEN ---
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.onclick = function() {
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
    document.addEventListener('fullscreenchange', function() {
      if (!document.fullscreenElement) {
        // Opcional: puedes hacer algo al salir de fullscreen
      }
    });

    console.log("Grafo de D3 inicializado con controles y zoom (public/js).");
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
})();
