---
title: "SOLUCIONADO: \"Error desconocido al abrir archivo de importaciÃƒÂ³n\""
heroImage: "https://i.imgur.com/ZqwMHzv.gif"
pubDate: 2019-05-08T10:41:15Z
updatedDate: 2019-05-12T12:26:12Z
draft: ó
author: "AlbertoEpic"
description: "El otro dÃƒÂ­a, trasteando con temas de GPS, me surgiÃƒÂ³ este problema: habÃƒÂ­a descargado un track en formato .gpx del Strava, y me disponÃƒÂ­a a estudiarlo y cargarlo en mi reloj GPS para seguir esa ruta. Pero al intentar abrirlo con el Garmin Base"
category: "Tutoriales"
tags:
  - "gps"
---

El otro dÃƒÂ­a, trasteando con temas de GPS, me surgiÃƒÂ³ este problema: habÃƒÂ­a descargado un track en formato .gpx del Strava, y me disponÃƒÂ­a a estudiarlo y cargarlo en mi reloj GPS para seguir esa ruta. Pero al intentar abrirlo con el Garmin BaseCamp, la importaciÃƒÂ³n se detenÃƒÂ­a y me daba el siguiente error: "Error desconocido al abrir archivo de importaciÃƒÂ³n".

![Imagen](https://i.imgur.com/ZqwMHzv.gif)

NingÃƒÂºn problema: como casi siempre, la soluciÃƒÂ³n estaba en internet. DespuÃƒÂ©s de buscar un poco, solucionÃƒÂ© el problema sin mayores dificultades. A continuaciÃƒÂ³n detallo la soluciÃƒÂ³n por si le sirve a alguien:

Por lo que sea, el BaseCamp tiene problemas con los metadatos de algunos archivos .gpx y la soluciÃƒÂ³n es eliminarlos antes de la importaciÃƒÂ³n. Para ello realizamos lo siguiente:

Abrimos el archivo .gpx con un editor de cÃƒÂ³digo, como por ejemplo el Notepad++, o simplemente con el Block de Notas. Accedemos asÃƒÂ­ al cÃƒÂ³digo del track que vemos a continuaciÃƒÂ³n. No lo veremos tan bonito, lo he formateado un poco para clarificar:

[code lang="xml" highlight="5-6"]




1970-01-01T00:00:00.000Z
Strava


Ciclismo por la maÃƒÂ±anaRecorrido en bicicleta

633.71970-01-01T00:00:00.000Z
633.81970-01-01T00:00:26.000Z
633.91970-01-01T00:10:23.000Z
6341970-01-01T00:11:10.000Z
634.11970-01-01T00:12:05.000Z
634.21970-01-01T00:12:43.000Z
634.21970-01-01T00:12:54.000Z

(...)

[/code]

Debemos buscar en el cÃƒÂ³digo el bloque de los metadatos (resaltado en la imagen superior). Para solucionar nuestro problema, simplemente debemos borrar todo el bloque, para que nos quede tal y como se muestra a continuaciÃƒÂ³n:

[code lang="xml"]






Ciclismo por la maÃƒÂ±anaRecorrido en bicicleta

633.71970-01-01T00:00:00.000Z
633.81970-01-01T00:00:26.000Z
633.91970-01-01T00:10:23.000Z
6341970-01-01T00:11:10.000Z
634.11970-01-01T00:12:05.000Z
634.21970-01-01T00:12:43.000Z
634.21970-01-01T00:12:54.000Z

(...)

[/code]

Ahora ya simplemente tenemos que guardar el archivo .gpx para poder abrirlo sin problemas con el Garmin BaseCamp. Pasarlo al GPS, apagar el ordenador... y al monte!

ACTUALIZADO!!!12 MAYO 2019

Desgraciadamente, la soluciÃƒÂ³n anterior no sirve para todos los casos. Hay gente que nos ha comentado que despuÃƒÂ©s de seguir los pasos y eliminar la informaciÃƒÂ³n de los metadatos, el BaseCamp les sigue dando el mismo error. AsÃƒÂ­ que desde SQLP proponemos otra soluciÃƒÂ³n con la que en principio deberÃƒÂ­a solucionarse el problema.

Si todavÃƒÂ­a no lo conoces, debes descargarte e instalar el GPSbabel. Es un programa gratuito para convertir entre la multitud de formatos existentes en el mundo de la geolocalizaciÃƒÂ³n. Lo tienes [disponible en su pÃƒÂ¡gina web](https://www.gpsbabel.org/index.html).

![Imagen](https://i.imgur.com/v14Zlm2.gif)

Una vez instalado, abres el programa y en la secciÃƒÂ³n de 'Entrada' seleccionas formato 'GPX XML' (En este caso, pero puede ser cualquier otro, que corresponda al track que nos da problemas) e indicas el nombre del fichero problemÃƒÂ¡tico. En la secciÃƒÂ³n de 'Salida' seleccionas tambiÃƒÂ©n el formato 'GPX XML' y el nombre y la direcciÃƒÂ³n del track que, ahora seguro que sÃƒÂ­,  vas a poder abrir con el BaseCamp.

Le das a 'Aceptar' y en un instante tendrÃƒÂ¡s creado el track. Ahora ya no habrÃƒÂ¡ track que se te resista!!!

