---
title: Demo Leaflet + GPX
description: Post de prueba para validar mapa Leaflet y ruta GPX con StravaRouteMap
date: 2026-06-04
tags:
  - leaflet
  - gpx
  - demo
draft: false
gpxMap: true
hideTOC: false
---

## Mapa embebido con bloque map

Este bloque usa el plugin de markdown map y se inicializa con Leaflet en cliente.

```map
{
  "center": [42.145, -0.401],
  "zoom": 12,
  "height": "420px",
  "tiles": "auto",
  "markers": [
    { "lat": 42.145, "lng": -0.401, "popup": "Inicio de demo", "title": "Inicio" },
    { "lat": 42.1555, "lng": -0.3865, "popup": "Final de demo", "title": "Final" }
  ],
  "polylines": [
    {
      "points": [[42.14, -0.408], [42.145, -0.401], [42.150, -0.395], [42.1555, -0.3865]],
      "color": "#ef4444",
      "weight": 4,
      "opacity": 0.95
    }
  ]
}
```

## Mapa GPX automático

Debajo del contenido, el layout del post renderiza StravaRouteMap porque este post tiene gpxMap: true. El archivo se fuerza con manual-links.json.
