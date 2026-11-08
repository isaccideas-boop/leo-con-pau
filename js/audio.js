/* ============================================================
   Motor de audio de Leo con Pau
   - Reproduce los audios incluidos (voz clara, sin internet).
   - Si falta un audio, usa la voz del dispositivo.
   - Efectos de sonido sintetizados (sin archivos extra).
   ============================================================ */
(function (root) {
  "use strict";

  const CLIP_DIR = "assets/audio/";
  const SPEECH = root.speechSynthesis || null;

  const settings = {
    mode: "app", // "app" = audios incluidos · "device" = voz del dispositivo
    voiceURI: "",
    rate: 1,
    sfx: true,
  };

  const clipCache = new Map();
  let currentAudio = null;
  let currentUtterance = null;
  let currentResolve = null;
  let audioContext = null;
  let ttsVoices = [];
  let voicesReady = false;

  function safeAudioId(text) {
    if (typeof root.audioId === "function") return root.audioId(text);
    return encodeURIComponent(String(text)).replace(/%/g, "").slice(0, 50);
  }

  function ensureContext() {
    if (!settings.sfx) return null;
    const Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function tone({ from, to, duration = 0.12, type = "sine", volume = 0.04, delay = 0 }) {
    const ctx = ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to && to !== from) {
      osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  const sounds = {
    click() {
      tone({ from: 480, to: 620, duration: 0.08, type: "triangle", volume: 0.025 });
    },
    pop() {
      tone({ from: 340, to: 720, duration: 0.13, type: "sine", volume: 0.05 });
    },
    correct() {
      tone({ from: 660, duration: 0.1, type: "sine", volume: 0.05 });
      tone({ from: 880, duration: 0.12, type: "sine", volume: 0.05, delay: 0.1 });
      tone({ from: 1108, duration: 0.18, type: "sine", volume: 0.04, delay: 0.21 });
    },
    wrong() {
      tone({ from: 280, to: 190, duration: 0.18, type: "triangle", volume: 0.035 });
    },
    star() {
      [784, 988, 1175, 1568].forEach((freq, index) => {
        tone({ from: freq, duration: 0.16, type: "sine", volume: 0.04, delay: index * 0.09 });
      });
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, index) => {
        tone({ from: freq, duration: 0.2, type: "triangle", volume: 0.045, delay: index * 0.11 });
      });
    },
  };

  function loadVoices() {
    if (!SPEECH) return [];
    const voices = SPEECH.getVoices() || [];
    ttsVoices = voices.filter((voice) => /^es[-_]/i.test(voice.lang));
    if (!ttsVoices.length) ttsVoices = voices;
    voicesReady = voices.length > 0;
    return ttsVoices;
  }

  if (SPEECH) {
    loadVoices();
    SPEECH.addEventListener?.("voiceschanged", loadVoices);
    SPEECH.onvoiceschanged = loadVoices;
  }

  function pickVoice() {
    if (!SPEECH) return null;
    const voices = loadVoices();
    if (!voices.length) return null;
    if (settings.voiceURI) {
      const chosen = voices.find((voice) => voice.voiceURI === settings.voiceURI);
      if (chosen) return chosen;
    }
    return (
      voices.find((voice) => /^es[-_]MX/i.test(voice.lang)) ||
      voices.find((voice) => /^es[-_]US/i.test(voice.lang)) ||
      voices.find((voice) => /^es[-_]ES/i.test(voice.lang)) ||
      voices.find((voice) => /^es/i.test(voice.lang)) ||
      voices[0]
    );
  }

  function stop() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {
        /* noop */
      }
      currentAudio = null;
    }
    if (SPEECH) {
      try {
        SPEECH.cancel();
      } catch {
        /* noop */
      }
    }
    if (currentResolve) {
      currentResolve(false);
      currentResolve = null;
    }
    currentUtterance = null;
  }

  function playClip(text, rate) {
    return new Promise((resolve) => {
      let audio = clipCache.get(text);
      if (!audio) {
        audio = new Audio(`${CLIP_DIR}${safeAudioId(text)}.mp3`);
        audio.preload = "auto";
        clipCache.set(text, audio);
      }

      let finished = false;
      const finish = (ok) => {
        if (finished) return;
        finished = true;
        audio.removeEventListener("ended", onEnd);
        audio.removeEventListener("error", onError);
        resolve(ok);
      };
      const onEnd = () => finish(true);
      const onError = () => {
        clipCache.delete(text);
        finish(false);
      };

      audio.addEventListener("ended", onEnd);
      audio.addEventListener("error", onError);

      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* el audio aún no está listo */
      }
      audio.playbackRate = Math.min(1.25, Math.max(0.75, rate || 1));
      audio.volume = 1;
      currentAudio = audio;

      const promise = audio.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => finish(false));
      }
    });
  }

  function speakWithDevice(text, rate) {
    return new Promise((resolve) => {
      if (!SPEECH) return resolve(false);
      try {
        SPEECH.cancel();
      } catch {
        /* noop */
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "es-MX";
      }
      utterance.rate = Math.min(1.3, Math.max(0.6, 0.88 * (rate || 1)));
      utterance.pitch = 1.03;
      utterance.volume = 1;

      let finished = false;
      let timer = 0;
      const finish = (ok) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (currentResolve === finish) currentResolve = null;
        currentUtterance = null;
        resolve(ok);
      };

      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);

      currentUtterance = utterance;
      currentResolve = finish;
      timer = setTimeout(() => finish(false), 2500 + text.length * 120);

      try {
        SPEECH.speak(utterance);
      } catch {
        finish(false);
      }
    });
  }

  /* Reproduce un texto. Devuelve una promesa con true/false. */
  async function speak(text, options = {}) {
    if (!text) return false;
    const clean = String(text);
    stop();
    ensureContext();

    const rate = options.rate || settings.rate;
    if (settings.mode === "device") {
      const ok = await speakWithDevice(clean, rate);
      if (ok) return true;
    }

    const clipOk = await playClip(clean, rate);
    if (clipOk) return true;
    return speakWithDevice(clean, rate);
  }

  function prefetch(texts) {
    for (const text of texts || []) {
      if (!text || clipCache.has(text)) continue;
      const audio = new Audio(`${CLIP_DIR}${safeAudioId(text)}.mp3`);
      audio.preload = "auto";
      clipCache.set(text, audio);
    }
  }

  function configure(next = {}) {
    Object.assign(settings, next);
    if (next.sfx === false && audioContext) {
      /* los sonidos ya en curso terminan solos */
    }
  }

  function getVoices() {
    return loadVoices().filter((voice) => /^es/i.test(voice.lang));
  }

  function sfx(name) {
    const sound = sounds[name];
    if (sound && settings.sfx) sound();
  }

  root.AudioEngine = {
    speak,
    stop,
    configure,
    prefetch,
    getVoices,
    sfx,
    unlock() {
      ensureContext();
    },
    get settings() {
      return { ...settings };
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
