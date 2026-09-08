# CV interactivo — VAGM / Systems

Versión rediseñada del CV interactivo, a partir de la maqueta de galaxia/vórtice
de opción 3. Bilingüe (ES/EN), autocontenida y verificada con `pruebas.py`.

## Qué cambió frente a la maqueta

- Jerarquía tipográfica clara: titulares de impacto con **Big Shoulders**, cuerpo y metadatos separados.
- Portada editorial con retrato, estado de disponibilidad y llamadas a la acción.
- Narrativa por secciones tradicionales: **Perfil → SIGR → Arquitectura → Experiencia → Capacidades → Proyectos → Formación → Contacto**, en vez del lector fijo con scroll de la maqueta.
- El SIGR pasa a ser el proyecto protagonista y sus cifras tienen lectura visual inmediata.
- Se añadió una representación visual de la arquitectura del SIGR.
- La galaxia funciona como sistema de fondo: responde al scroll y al puntero y culmina en el cierre.
- Audio ambiental usando los archivos entregados: cama, barrido, nacimiento, impacto y roce.

## Lo que se corrigió después de la entrega de ChatGPT

1. **Bug de scroll (`let scrollY = scrollY || 0`).** Rompía todo el script por
   *temporal dead zone*: el botón de sonido y el resto de la interacción nunca
   se conectaban. Renombrado a `scrollPos`.
2. **Contraste y tamaño de texto.** Las etiquetas y textos funcionales estaban
   entre 8px y 12px; se subieron a un mínimo de 14px, y el gris `--dim` se
   aclaró para cumplir AA (4.5:1) contra el fondo real.
3. **El correo y el teléfono del cierre** eran el texto interactivo más chico
   de todo el sitio pese a ser el llamado a la acción final. Ahora usan la
   tipografía Big y escalan de 24px a 37px.
4. **El SIGR se describía como "en operación".** Es falso: sigue siendo un
   sistema interno sin aprobar (ver `ESTADO.md` en la raíz del repo). Corregido
   a "sistema interno sin aprobar".
5. **`lib/` vivía fuera de esta carpeta** (`../lib/`, en `opcion-3/lib/`), lo
   que rompía el sitio si se serví­a o se movía por separado. Ahora tiene su
   propia copia de Three.js en `cv_pro/lib/` y es autocontenida.
6. **Sin `og:image`, sin idioma, sin soporte real de `prefers-reduced-motion`,
   sin pruebas.** Los cuatro se agregaron: ver más abajo.
7. **El navegador restauraba el scroll al recargar**, dejando a quien visita
   a mitad de la galaxia. Ahora fuerza `scrollTo(0,0)` en carga, `load` y
   `pageshow`.
8. **El audio requería encontrar el botón "AMBIENTE".** Ahora arranca con el
   primer clic, tecla o toque en cualquier parte de la página.

## Estructura

- `index.html` — contenido y estructura, bilingüe (`<span lang="es">`/`<span lang="en">`).
- `pro.css` — dirección visual y responsive.
- `pro.js` — idioma, animación, galaxia, interacción y audio.
- `bigshoulders.woff2` — tipografía de titulares.
- `victor.jpg` — retrato.
- `og-image.png` / `og.py` — vista previa al compartir el enlace (Playwright).
- `sonido/` — pistas de audio.
- `lib/` — Three.js, local y autocontenido.
- `pruebas.py` — verificación automatizada (`python pruebas.py`).

## Verificado con `pruebas.py`

Consola limpia, sin desborde horizontal de 320 a 2560px, las dos secciones
de cada nodo traducible tienen su par ES/EN, el toggle de idioma cambia y
persiste, el sonido enciende y apaga, `prefers-reduced-motion` detiene el
giro por tiempo sin romper nada, el scroll vuelve a 0 al recargar, contraste
AA en los textos tenues, el `og-image` existe en 1200×630, y el aviso del
SIGR dice "sin aprobar" y no "en operación".
