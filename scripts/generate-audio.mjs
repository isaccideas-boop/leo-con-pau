#!/usr/bin/env node
/* ============================================================
   Genera el paquete de voz de la app.

   Motor por defecto: Edge TTS (voz neuronal de Microsoft).
   Solo necesita internet al generar; los MP3 quedan guardados
   en assets/audio y la app funciona sin conexión.

   Uso:
     node scripts/generate-audio.mjs
     node scripts/generate-audio.mjs --force
     node scripts/generate-audio.mjs --dry-run
     node scripts/generate-audio.mjs --voice es-MX-JorgeNeural
     node scripts/generate-audio.mjs --engine say --voice Paulina

   Requisitos:
     - edge-tts (pip install edge-tts) si se usa el motor edge
     - ffmpeg
     - say (solo para el motor say de macOS)
   ============================================================ */
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "audio");
const TMP_DIR = path.join(os.tmpdir(), "leo-con-pau-audio");

const data = require(path.join(ROOT, "js", "data.js"));
const { audioId } = require(path.join(ROOT, "js", "audio-id.js"));

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const ENGINE = option("--engine", "edge");
const VOICE =
  option("--voice", ENGINE === "say" ? "Paulina" : "es-MX-DaliaNeural");

/* Velocidad por tipo de texto. En edge-tts el valor es un porcentaje
   respecto a la velocidad natural de la voz. */
const EDGE_RATES = {
  silaba: option("--rate-silaba", "-35%"),
  palabra: option("--rate-palabra", "-18%"),
  frase: option("--rate-frase", "-14%"),
};

/* Equivalentes en palabras por minuto para el motor say de macOS. */
const SAY_RATES = { silaba: 120, palabra: 138, frase: 150 };

/* Aire a cada lado del audio. Sin esta pausa las sílabas terminan de golpe
   y cuesta entenderlas. */
const PAUSES = {
  silaba: { leadMs: 160, tailMs: 0.6 },
  palabra: { leadMs: 130, tailMs: 0.3 },
  frase: { leadMs: 120, tailMs: 0.3 },
};

const FADE_IN = 0.012;
const FADE_OUT = 0.05;

const CONCURRENCY = 4;
const RETRIES = 3;

function filterFor(kind) {
  const pause = PAUSES[kind] || PAUSES.frase;
  const trim =
    "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB";
  return [
    trim,
    "areverse", trim, "areverse",
    `afade=t=in:st=0:d=${FADE_IN}`,
    "areverse", `afade=t=in:st=0:d=${FADE_OUT}`, "areverse",
    `adelay=${pause.leadMs}:all=1`,
    `apad=pad_dur=${pause.tailMs}`,
  ].join(",");
}

/* Recolecta cada texto que necesita audio, junto con su tipo.
   Si un mismo texto aparece en varios tipos, gana el más lento. */
const texts = new Map();
const ORDER = { silaba: 0, palabra: 1, frase: 2 };

function add(text, kind = "frase") {
  if (typeof text !== "string") return;
  const clean = text.trim();
  if (!clean) return;
  const previous = texts.get(clean);
  if (!previous || ORDER[kind] < ORDER[previous]) texts.set(clean, kind);
}

for (const vowel of data.vowels) {
  add(vowel.letter, "silaba");
  add(vowel.word, "palabra");
}
for (const family of data.families) {
  add(family.name, "frase");
  for (const syllable of family.syllables) add(syllable, "silaba");
}
for (const category of data.categories) {
  for (const word of category.words) {
    add(word.text, "palabra");
    for (const syllable of word.syllables) add(syllable, "silaba");
  }
}
for (const phrase of data.phrases) {
  add(phrase.text, "frase");
  for (const word of phrase.words) add(word, "palabra");
  if (phrase.question) {
    add(phrase.question.prompt, "frase");
    add(phrase.question.spoken, "frase");
    for (const option of phrase.question.options) add(option.label, "palabra");
  }
}
const speech = data.speech;
for (const group of [speech.titles, speech.instructions, speech.misc]) {
  for (const value of Object.values(group)) add(value, "frase");
}
for (const list of [speech.praise, speech.corrections]) {
  for (const value of list) add(value, "frase");
}

function rateOf(item) {
  return ENGINE === "say" ? SAY_RATES[item.kind] : EDGE_RATES[item.kind];
}

const items = [...texts.entries()]
  .map(([text, kind]) => ({ text, kind, id: audioId(text) }))
  .sort((a, b) => a.text.localeCompare(b.text, "es"));

function run(cmd, argsList) {
  return execFileAsync(cmd, argsList, { maxBuffer: 1024 * 1024 * 8 });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function synthesizeEdge(item, rawPath) {
  const rate = rateOf(item);
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await run("edge-tts", [
        "--voice", VOICE,
        `--rate=${rate}`,
        "--text", item.text,
        "--write-media", rawPath,
        "--no-progress",
      ]);
      const stat = await fs.stat(rawPath);
      if (stat.size > 0) return;
      lastError = new Error("archivo vacío");
    } catch (error) {
      lastError = error;
    }
    await fs.rm(rawPath, { force: true }).catch(() => {});
    if (attempt < RETRIES) await wait(900 * attempt);
  }
  throw lastError;
}

async function synthesizeSay(item, rawPath) {
  await run("say", [
    "-v", VOICE,
    "-r", String(rateOf(item)),
    "-o", rawPath,
    item.text,
  ]);
}

async function makeClip(item) {
  const mp3Path = path.join(OUT_DIR, `${item.id}.mp3`);
  if (!FORCE) {
    try {
      const stat = await fs.stat(mp3Path);
      if (stat.size > 0) return "skip";
    } catch {
      /* todavía no existe */
    }
  }

  const extension = ENGINE === "say" ? "aiff" : "mp3";
  const rawPath = path.join(TMP_DIR, `${item.id}.${extension}`);
  const wavPath = path.join(TMP_DIR, `${item.id}.wav`);
  const trimmedPath = path.join(TMP_DIR, `${item.id}.trim.mp3`);
  /* El archivo temporal vive en otro volumen, así que se copia junto al
     destino antes de renombrar (rename no cruza volúmenes). */
  const tempOut = path.join(OUT_DIR, `.${item.id}.tmp.mp3`);

  try {
    if (ENGINE === "say") {
      await synthesizeSay(item, rawPath);
    } else {
      await synthesizeEdge(item, rawPath);
    }

    /* Dos pasos: primero un WAV con el recorte, el desvanecido y las pausas;
       después el MP3 final. Así el codificador no recibe marcas de tiempo
       negativas por el silencio añadido. */
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", rawPath,
      "-af", filterFor(item.kind),
      "-ac", "1",
      "-ar", "24000",
      wavPath,
    ]);

    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", wavPath,
      "-b:a", "96k",
      trimmedPath,
    ]);

    await fs.copyFile(trimmedPath, tempOut);
    await fs.rename(tempOut, mp3Path);
    return "made";
  } finally {
    await fs.rm(rawPath, { force: true }).catch(() => {});
    await fs.rm(wavPath, { force: true }).catch(() => {});
    await fs.rm(trimmedPath, { force: true }).catch(() => {});
    await fs.rm(tempOut, { force: true }).catch(() => {});
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const counts = items.reduce((acc, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {});

  console.log(
    `🎙️  Motor: ${ENGINE} · Voz: ${VOICE} · ${items.length} audios ` +
      `(${counts.silaba || 0} sílabas, ${counts.palabra || 0} palabras, ` +
      `${counts.frase || 0} frases)`
  );
  console.log(
    `    Velocidad: sílabas ${rateOf({ kind: "silaba" })}, ` +
      `palabras ${rateOf({ kind: "palabra" })}, frases ${rateOf({ kind: "frase" })}`
  );

  if (DRY_RUN) {
    for (const item of items) {
      console.log(`   · [${item.kind}] ${item.text} → ${item.id}.mp3`);
    }
    console.log("\n🔎 Simulación: no se generó ningún archivo.");
    return;
  }

  let made = 0;
  let skipped = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      try {
        const result = await makeClip(item);
        if (result === "made") {
          made += 1;
          console.log(`   ✅ ${item.text}`);
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        console.error(`   ❌ ${item.text}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const manifest = {
    engine: ENGINE,
    voice: VOICE,
    rates: ENGINE === "say" ? SAY_RATES : EDGE_RATES,
    pauses: PAUSES,
    generatedAt: new Date().toISOString(),
    count: items.length,
    clips: items.map((item) => ({
      text: item.text,
      id: item.id,
      kind: item.kind,
      rate: rateOf(item),
    })),
  };
  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log(
    `\n✨ Listo: ${made} creados, ${skipped} ya existían, ${failed} fallaron.`
  );
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
