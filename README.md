# Leo con Pau

App en español para aprender a leer jugando. Está pensada para una niña de 5 años:
sílabas que se pueden juntar, palabras que se construyen, juegos de escucha, lectura
en voz alta, comprensión de frases, vocales, estrellas y premios.

Todo funciona sin internet y sin instalar nada: el audio de las sílabas, palabras y
frases ya viene incluido en `assets/audio`.

## Cómo abrirla

### Opción rápida en macOS

1. Haz doble clic en `start.command`.
2. Se abrirá una terminal con un servidor local y el navegador en
   `http://127.0.0.1:4173/`.
3. Para cerrar la app, cierra la ventana de la terminal.

La primera vez macOS puede pedir permiso para ejecutar el archivo. Si no se abre,
haz clic derecho → **Abrir**.

### Opción manual

Desde la carpeta del proyecto:

```bash
python3 -m http.server 4173
```

Y abre en el navegador:

```text
http://127.0.0.1:4173/
```

También puedes abrir `index.html` directamente con doble clic. La opción del
servidor local es la más recomendable, sobre todo en tablet y iPad.

## Qué incluye

| Sección | Qué hace |
| --- | --- |
| **Mi sesión de hoy** | Una ruta corta de 5 pasos: sílabas, palabras, escucha, leer y repaso. Al completarla se gana una estrella extra. |
| **Sílabas mágicas** | Elige una consonante, toca una vocal y escucha cómo se forma la sílaba. |
| **Construye palabras** | Arma palabras tocando sus sílabas en orden. Tiene pistas después de dos intentos. |
| **Escucha y elige** | Juego de discriminación auditiva con sílabas o palabras. Se adapta a lo que necesita práctica. |
| **Leo solito** | Lee palabras y frases. Cada sílaba o palabra se puede escuchar por separado y hay un botón **Leer conmigo**. |
| **Comprensión** | Después de leer una frase, una pregunta sencilla con dibujos comprueba si entendió lo que leyó. |
| **Mi camino** | Mapa de sílabas, palabras y lectura con lo dominado, lo que sigue y recomendaciones. |
| **Repaso inteligente** | Mezcla sílabas y palabras que necesitan refuerzo en una ronda corta de 5. |
| **Las vocales** | Las cinco vocales con una palabra y un dibujo; incluye mini-juego. |
| **Mi álbum** | Estrellas, nivel, estadísticas, dominio y premios que se desbloquean. |

### Mi sesión de hoy

La sesión diaria propone cinco pasos cortitos:

1. **Sílabas:** juntar y escuchar 3 sílabas.
2. **Palabras:** armar 1 palabra con sílabas.
3. **Escucha:** completar el juego de sonidos.
4. **Leer:** leer 1 palabra o frase.
5. **Repaso:** practicar lo que necesita refuerzo.

Cada paso se marca solo al completarlo. Si se deja a medias, la app lo retoma
después. Al terminar los cinco, la sesión se celebra con una estrella extra.

### Mi camino y repaso inteligente

- **Mi camino** muestra el avance por familia de sílabas, categoría de palabras y
  lectura. También recomienda qué practicar después.
- **Repaso inteligente** elige primero los sonidos con más errores o con menos
  racha de aciertos. Si todavía no hay datos, empieza con contenido nuevo.
- Los juegos de palabras y escucha también mezclan de vez en cuando algo que
  necesita refuerzo, sin perder la sensación de juego.

## Progreso, dominio y estrellas

- Cada logro suma estrellas: sílabas nuevas, palabras armadas, palabras leídas,
  frases leídas, comprensión y juegos completados.
- Hay 9 niveles (Semilla → Leyenda) y 12 premios para desbloquear.
- La meta diaria es de 5 estrellas; se reinicia cada día.
- Un contenido se considera **dominado** después de **3 aciertos seguidos**. Un
  error reinicia la racha, pero nunca quita estrellas ni premios.
- El progreso se guarda en el navegador (`localStorage`). No se envía nada a internet.
- La app no castiga los errores: si falla, puede volver a intentarlo las veces que
  quiera y recibe una pista después de dos intentos.

## Zona de papás y mamás

Toca el engranaje ⚙️ de la pantalla de inicio. Para entrar hay que resolver una
multiplicación sencilla.

Desde ahí se puede:

- Cambiar el nombre de la lectora.
- Elegir entre la **voz incluida** (funciona sin internet) y la **voz del dispositivo**.
- Seleccionar una voz del sistema y ajustar la velocidad (0,80× a 1,20×).
- Cambiar entre letra minúscula y MAYÚSCULA.
- Activar o desactivar los sonidos de los juegos.
- Activar o desactivar las **preguntas de comprensión**.
- Ver estrellas, sílabas, palabras, frases, comprensión y contenidos dominados.
- **Descargar una copia** del progreso o **restaurarla** desde un archivo.
- Borrar todo para empezar de cero.
- Leer consejos para acompañar el aprendizaje.

## Copia de seguridad

En **Ajustes → Guardar una copia**:

- **Descargar copia** crea un archivo `leo-con-pau-AAAA-MM-DD.json` con todo el
  progreso.
- **Restaurar copia** lee ese archivo y reemplaza el progreso del dispositivo.

Sirve para cambiar de navegador, pasar la app a otro equipo o recuperar el progreso
si se borran los datos del navegador. La copia se genera y se guarda solo en el
dispositivo; no se sube a ningún servicio.

## Instalar como app (PWA)

La app incluye `manifest.webmanifest`, iconos y un service worker. Si se sirve desde
un servidor local o desde internet, se puede instalar:

- **Chrome o Edge en computadora:** icono de instalar en la barra de direcciones.
- **iPhone o iPad (Safari):** Compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome):** menú → **Instalar aplicación**.

El service worker guarda la pantalla, los estilos, el contenido y los iconos para
abrir la app sin conexión. Los audios se van guardando a medida que se usan; los que
ya se escucharon quedan disponibles offline. El audio incluido en la carpeta no
necesita internet de todos modos.

## Consejos de uso

- Mejor **10 minutos al día**, todos los días, que una sesión larga de vez en cuando.
- Empieza por **Mi sesión de hoy** y deja que elija el orden si quiere.
- Deja que repita la sílaba o la palabra las veces que quiera; repetir es aprender.
- Usa **Leer conmigo** para que escuche el ritmo y después intente leer sola.
- Celebra el esfuerzo y las ganas, no solo los aciertos.
- Si se frustra, cambia de juego o hagan una pausa. La app no penaliza errores.
- Al principio conviene la letra minúscula; las mayúsculas pueden activarse cuando
  empiece a reconocerlas.
- Si la velocidad natural le resulta rápida, baja la voz a 0,85× o 0,90×.
- En las frases, conversen sobre la pregunta de comprensión antes de elegir.

## Audio

Los audios se generaron con **Edge TTS**, la voz neuronal **Dalia (es-MX)** de
Microsoft, y `ffmpeg`. Son **355 clips** en MP3 dentro de `assets/audio/`, con un
`manifest.json` que relaciona cada texto con su archivo, su tipo y su velocidad:

- **Sílabas:** −35 %, con 0,16 s de aire al inicio y 0,60 s al final.
- **Palabras:** −18 %, con 0,13 s al inicio y 0,30 s al final.
- **Frases:** −14 %, con 0,12 s al inicio y 0,30 s al final.

Cada clip termina con un desvanecido suave de 50 ms. Sin ese aire final las
sílabas se cortaban de golpe y costaba entenderlas.

La voz solo necesita internet al generar los audios. Los MP3 quedan guardados y la
app funciona sin conexión.

Requisitos para regenerar:

```bash
python3 -m venv .venv-audio
.venv-audio/bin/pip install edge-tts
# ffmpeg debe estar instalado en el sistema
```

Si se cambia o amplía el contenido educativo en `js/data.js`, hay que regenerar los
audios que falten:

```bash
PATH="$PWD/.venv-audio/bin:$PATH" node scripts/generate-audio.mjs
```

Para regenerar todo desde cero:

```bash
PATH="$PWD/.venv-audio/bin:$PATH" node scripts/generate-audio.mjs --force
```

Para revisar qué textos se generarían, sin escribir archivos:

```bash
node scripts/generate-audio.mjs --dry-run
```

Para usar otra voz neuronal (por ejemplo, una masculina):

```bash
PATH="$PWD/.venv-audio/bin:$PATH" node scripts/generate-audio.mjs --force \
  --voice es-MX-JorgeNeural
```

También se puede volver al motor de macOS, útil si no hay internet:

```bash
node scripts/generate-audio.mjs --force --engine say --voice Paulina
```

La app usa la voz del dispositivo automáticamente si falta un clip, y también puede
usarse esa voz de forma permanente desde los ajustes. Las preguntas de comprensión,
sus opciones y los textos de las pantallas nuevas también tienen audio incluido.

## Estructura

```text
index.html                 Pantalla principal y registro del service worker
manifest.webmanifest       Nombre, colores e iconos de la app instalable
sw.js                      Caché offline del shell y de los audios usados
css/styles.css             Diseño, animaciones y adaptación a móvil/tablet
js/data.js                 Todo el contenido educativo y los textos de voz
js/app.js                  Pantallas, juegos, sesión, dominio, progreso y ajustes
js/audio.js                Reproductor de clips, voz del dispositivo y efectos
js/fx.js                   Confeti, destellos y avisos de premio
js/audio-id.js             Nombre estable de cada archivo de audio
scripts/generate-audio.mjs Generador de la voz incluida
assets/audio/              355 audios MP3 + manifest.json
assets/fonts/              Fredoka y Nunito, incluidas localmente
assets/icons/              Iconos SVG y PNG para la app instalable
```

## Notas técnicas

- HTML, CSS y JavaScript sin frameworks ni proceso de compilación.
- Sin dependencias de red en tiempo de ejecución.
- Estado versionado (versión 2) con migración automática desde el progreso anterior.
- Respeta `prefers-reduced-motion` para reducir animaciones.
- Los datos se guardan solo en el dispositivo. El botón de borrar progreso deja la
  app como nueva.
- El service worker usa una versión de caché; al cambiar archivos de la app conviene
  subir esa versión en `sw.js` para que los dispositivos reciban la actualización.

Hecho con cariño para Pau 💜
