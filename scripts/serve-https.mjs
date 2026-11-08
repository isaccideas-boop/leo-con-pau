#!/usr/bin/env node
/* ============================================================
   Servidor HTTPS local para abrir Leo con Pau desde el iPad
   en la misma red Wi-Fi, con service worker y modo offline.

   Uso:
     node scripts/serve-https.mjs
     node scripts/serve-https.mjs 4174

   Certificado: certs/pau.pem + certs/pau-key.pem (mkcert).
   El iPad debe confiar en la CA de mkcert (pau-ca.pem).
   ============================================================ */
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.PORT || 4174);
const CERT = path.join(ROOT, "certs", "pau.pem");
const KEY = path.join(ROOT, "certs", "pau-key.pem");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  res.end(body);
}

function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const relative = decoded.replace(/^\/+/, "");
  const absolute = path.resolve(ROOT, relative || "index.html");
  if (absolute !== ROOT && !absolute.startsWith(ROOT + path.sep)) return null;
  return absolute;
}

const server = https.createServer(
  {
    cert: fs.readFileSync(CERT),
    key: fs.readFileSync(KEY),
  },
  (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Método no permitido", { Allow: "GET, HEAD" });
      return;
    }

    let filePath = safePath(req.url || "/");
    if (!filePath) {
      send(res, 400, "Ruta inválida");
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
    } catch {
      /* se resuelve abajo */
    }

    let stat;
    try {
      stat = fs.statSync(filePath);
      if (!stat.isFile()) throw new Error("no es archivo");
    } catch {
      send(res, 404, "No encontrado");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const cache =
      ext === ".mp3"
        ? "public, max-age=31536000, immutable"
        : ext === ".html" || ext === ".js" || ext === ".css" || ext === ".webmanifest"
          ? "no-cache"
          : "public, max-age=86400";

    const headers = {
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
      "Last-Modified": stat.mtime.toUTCString(),
    };

    /* Safari pide los MP3 por rangos; hay que responder 206. */
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) {
        send(res, 416, "Rango no válido", {
          "Content-Range": `bytes */${stat.size}`,
        });
        return;
      }
      let start = match[1] === "" ? null : Number(match[1]);
      let end = match[2] === "" ? null : Number(match[2]);
      if (start === null && end === null) {
        send(res, 416, "Rango no válido", {
          "Content-Range": `bytes */${stat.size}`,
        });
        return;
      }
      if (start === null) {
        start = Math.max(0, stat.size - end);
        end = stat.size - 1;
      } else {
        end = end === null ? stat.size - 1 : Math.min(end, stat.size - 1);
      }
      if (start > end || start >= stat.size) {
        send(res, 416, "Rango no válido", {
          "Content-Range": `bytes */${stat.size}`,
        });
        return;
      }
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": end - start + 1,
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      ...headers,
      "Content-Length": stat.size,
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  }
);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Leo con Pau (HTTPS) en el puerto ${PORT}`);
  console.log(`  Mac:   https://127.0.0.1:${PORT}/`);
  console.log(`  iPad:  https://192.168.1.78:${PORT}/`);
  console.log(`  iPad:  https://Mac-mini-de-Isacc.local:${PORT}/`);
});
