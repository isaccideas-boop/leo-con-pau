/* ============================================================
   Leo con Pau · service worker
   Guarda la app para que funcione sin internet después de la
   primera visita. Los audios se guardan a medida que se usan.
   ============================================================ */
const CACHE = "leo-con-pau-v8";
const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/audio-id.js",
  "./js/data.js",
  "./js/audio.js",
  "./js/fx.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./assets/audio/manifest.json",
  "./assets/fonts/fredoka-latin.woff2",
  "./assets/fonts/nunito-latin.woff2",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      /* cache: "reload" evita que GitHub Pages entregue una copia vieja
         desde la caché HTTP justo después de publicar. */
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* si un archivo falla, la app sigue con el resto */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  /*
    Los audios llegan como peticiones parciales (Range), que el
    navegador no deja guardar en caché. Para esos archivos pedimos
    el MP3 completo sin Range la primera vez y lo guardamos.
  */
  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(new Request(request.url, { method: "GET" }));
          if (response.ok && response.status === 200) {
            const copy = response.clone();
            const cache = await caches.open(CACHE);
            await cache.put(request, copy);
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
