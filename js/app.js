/* ============================================================
   Leo con Pau · lógica de la aplicación
   ============================================================ */
(function () {
  "use strict";

  const D = window.APP_DATA;
  const AE = window.AudioEngine;
  const FX = window.FX;
  const APP = document.getElementById("app");
  const MODAL_ROOT = document.getElementById("modal-root");
  const LIVE = document.getElementById("sr-live");

  const STORAGE_KEY = "leo-con-pau-v1";
  const PARENT_KEY = "leo-con-pau-parent";
  const AUDIO_PACK_KEY = "leo-con-pau-audio-pack";
  const DAILY_GOAL = 5;
  const MAX_NAME = 12;
  const MASTERY_TARGET = 3;

  const ALL_WORDS = D.categories.flatMap((category) =>
    category.words.map((word) => ({
      ...word,
      categoryId: category.id,
      categoryName: category.name,
    }))
  );

  const ALL_SYLLABLES = [...new Set(D.families.flatMap((family) => family.syllables))];

  const SESSION_STEPS = [
    {
      id: "silabas",
      title: "Sílabas",
      emoji: "🧩",
      route: "/silabas",
      need: 3,
      desc: "Junta y escucha 3 sílabas",
    },
    {
      id: "palabras",
      title: "Palabras",
      emoji: "🏗️",
      route: "/palabras",
      need: 1,
      desc: "Arma 1 palabra con sílabas",
    },
    {
      id: "escucha",
      title: "Escucha",
      emoji: "👂",
      route: "/escucha",
      need: 1,
      desc: "Completa el juego de sonidos",
    },
    {
      id: "leer",
      title: "Leer",
      emoji: "📖",
      route: "/leer",
      need: 1,
      desc: "Lee 1 palabra o frase",
    },
    {
      id: "repaso",
      title: "Repaso",
      emoji: "🔁",
      route: "/repaso",
      need: 1,
      desc: "Practica lo que necesita repaso",
    },
  ];

  const DEFAULT_STATE = {
    version: 2,
    name: "Pau",
    stars: 0,
    daily: { date: "", count: 0 },
    practicedSyllables: [],
    vowelsExplored: [],
    learnedWords: [],
    readWords: [],
    readPhrases: [],
    seenStickers: [],
    mastery: {},
    session: { date: "", steps: [], activity: {}, bonus: false },
    comprehension: { answered: 0, correct: 0, byPhrase: {} },
    settings: {
      voice: "app",
      voiceURI: "",
      rate: 1,
      uppercase: false,
      sfx: true,
      comprehension: true,
    },
  };

  const ui = {
    silabasFamily: "m",
    palabrasCategory: "animales",
    leerMode: "words",
  };

  let state = loadState();
  let currentScreen = null;
  let screenGeneration = 0;
  let screenTimers = [];
  let stickerQueue = [];
  let modalOpen = false;
  let modalCloseHook = null;
  let modalKeyHandler = null;
  let parentUnlocked = readParentUnlock();
  let audioPackManifest = null;
  let audioPackRunning = false;

  /* Utilidades --------------------------------------------------- */
  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function randomOf(list) {
    return list && list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }

  function shuffled(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function cleanName(value) {
    const text = String(value || "").trim().slice(0, MAX_NAME);
    return text || "Pau";
  }

  function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  }

  function announce(text) {
    if (!LIVE) return;
    LIVE.textContent = "";
    window.setTimeout(() => {
      LIVE.textContent = text;
    }, 40);
  }

  function say(text, options = {}) {
    if (!text) return Promise.resolve(false);
    return AE.speak(String(text), options).catch(() => false);
  }

  function praise() {
    return say(randomOf(D.speech.praise));
  }

  function correction() {
    return say(randomOf(D.speech.corrections));
  }

  function later(fn, ms) {
    const id = window.setTimeout(fn, ms);
    screenTimers.push(id);
    return id;
  }

  function clearScreenTimers() {
    screenTimers.forEach((id) => window.clearTimeout(id));
    screenTimers = [];
  }

  function getLevelInfo(stars) {
    let index = 0;
    D.levels.forEach((level, i) => {
      if (stars >= level.min) index = i;
    });
    const current = D.levels[index];
    const next = D.levels[index + 1] || null;
    const span = next ? next.min - current.min : 1;
    const progress = next
      ? Math.min(100, Math.max(0, ((stars - current.min) / span) * 100))
      : 100;
    return {
      current,
      next,
      progress,
      remaining: next ? Math.max(0, next.min - stars) : 0,
    };
  }

  /* Estado ------------------------------------------------------- */
  function normalizeState(saved) {
    const merged = { ...clone(DEFAULT_STATE), ...(saved || {}) };
    merged.version = 2;
    merged.settings = { ...clone(DEFAULT_STATE.settings), ...(saved?.settings || {}) };
    merged.daily = { ...clone(DEFAULT_STATE.daily), ...(saved?.daily || {}) };
    merged.session = { ...clone(DEFAULT_STATE.session), ...(saved?.session || {}) };
    merged.comprehension = {
      ...clone(DEFAULT_STATE.comprehension),
      ...(saved?.comprehension || {}),
    };
    for (const key of [
      "practicedSyllables",
      "vowelsExplored",
      "learnedWords",
      "readWords",
      "readPhrases",
      "seenStickers",
    ]) {
      if (!Array.isArray(merged[key])) merged[key] = [];
    }

    if (!Array.isArray(merged.session.steps)) merged.session.steps = [];
    if (!merged.session.activity || typeof merged.session.activity !== "object") {
      merged.session.activity = {};
    } else {
      merged.session.activity = { ...merged.session.activity };
    }
    if (typeof merged.session.date !== "string") merged.session.date = "";
    merged.session.bonus = Boolean(merged.session.bonus);

    if (
      !merged.comprehension.byPhrase ||
      typeof merged.comprehension.byPhrase !== "object" ||
      Array.isArray(merged.comprehension.byPhrase)
    ) {
      merged.comprehension.byPhrase = {};
    } else {
      merged.comprehension.byPhrase = { ...merged.comprehension.byPhrase };
    }
    merged.comprehension.answered = Math.max(
      0,
      Number(merged.comprehension.answered) || 0
    );
    merged.comprehension.correct = Math.max(
      0,
      Number(merged.comprehension.correct) || 0
    );

    if (
      !merged.mastery ||
      typeof merged.mastery !== "object" ||
      Array.isArray(merged.mastery)
    ) {
      merged.mastery = {};
    }
    for (const [key, record] of Object.entries(merged.mastery)) {
      if (!record || typeof record !== "object") {
        delete merged.mastery[key];
        continue;
      }
      const cleanRecord = {
        attempts: Math.max(0, Number(record.attempts) || 0),
        correct: Math.max(0, Number(record.correct) || 0),
        wrong: Math.max(0, Number(record.wrong) || 0),
        streak: Math.max(0, Number(record.streak) || 0),
        mastered: Boolean(record.mastered),
        lastAt: Math.max(0, Number(record.lastAt) || 0),
      };
      merged.mastery[key] = cleanRecord;
    }

    merged.name = cleanName(merged.name);
    merged.stars = Math.max(0, Number(merged.stars) || 0);
    merged.daily.count = Math.max(0, Number(merged.daily.count) || 0);
    merged.settings.rate = Math.min(1.2, Math.max(0.8, Number(merged.settings.rate) || 1));
    merged.settings.voice = merged.settings.voice === "device" ? "device" : "app";
    merged.settings.uppercase = Boolean(merged.settings.uppercase);
    merged.settings.sfx = merged.settings.sfx !== false;
    merged.settings.comprehension = merged.settings.comprehension !== false;
    return merged;
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_STATE);
      return normalizeState(JSON.parse(raw));
    } catch {
      return clone(DEFAULT_STATE);
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Si el navegador bloquea el almacenamiento, la app sigue funcionando. */
    }
  }

  function ensureDaily() {
    const today = todayKey();
    if (state.daily.date !== today) {
      state.daily = { date: today, count: 0 };
      saveState();
    }
  }

  function applySettings() {
    document.body.classList.toggle("upper-mode", Boolean(state.settings.uppercase));
    AE.configure({
      mode: state.settings.voice === "device" ? "device" : "app",
      voiceURI: state.settings.voiceURI || "",
      rate: Number(state.settings.rate) || 1,
      sfx: state.settings.sfx !== false,
    });
  }

  function updateStarDisplays() {
    document.querySelectorAll("[data-stars]").forEach((node) => {
      node.textContent = String(state.stars);
    });
    document.querySelectorAll(".star-pill").forEach((node) => {
      node.setAttribute("aria-label", `Estrellas ganadas: ${state.stars}`);
      node.classList.remove("is-bump");
      void node.offsetWidth;
      node.classList.add("is-bump");
      window.setTimeout(() => node.classList.remove("is-bump"), 650);
    });
  }

  function addStars(message = D.speech.misc.newStar) {
    ensureDaily();
    state.stars += 1;
    state.daily.count += 1;
    saveState();
    updateStarDisplays();
    FX.confetti({ count: 95, y: 0.3 });
    FX.reward(message, "⭐");
    AE.sfx("star");
    announce(`${message} Ahora tienes ${state.stars} estrellas.`);
    window.setTimeout(checkStickerUnlocks, 550);
  }

  function markSyllable(syllable) {
    if (state.practicedSyllables.includes(syllable)) return false;
    state.practicedSyllables.push(syllable);
    saveState();
    if (state.practicedSyllables.length % 5 === 0) {
      addStars("¡5 sílabas nuevas!");
    }
    return true;
  }

  function markVowel(letter) {
    if (state.vowelsExplored.includes(letter)) return false;
    state.vowelsExplored.push(letter);
    saveState();
    if (state.vowelsExplored.length === D.vowels.length) {
      addStars("¡Conoces las 5 vocales!");
    }
    return true;
  }

  /* Premios y modales ------------------------------------------- */
  function checkStickerUnlocks() {
    const newly = D.stickers.filter(
      (sticker) =>
        state.stars >= sticker.stars && !state.seenStickers.includes(sticker.id)
    );
    if (!newly.length) return;
    for (const sticker of newly) {
      state.seenStickers.push(sticker.id);
      stickerQueue.push(sticker);
    }
    saveState();
    if (!modalOpen) showNextSticker();
  }

  function showNextSticker() {
    if (modalOpen || !stickerQueue.length) return;
    const sticker = stickerQueue.shift();
    openModal({
      emoji: sticker.emoji,
      title: "¡Nuevo premio!",
      text: `Has desbloqueado: ${sticker.name}`,
      actions: [{ label: "¡Qué lindo!", className: "btn btn--sun" }],
      onClose: () => {
        window.setTimeout(showNextSticker, 220);
      },
    });
    AE.sfx("star");
  }

  function openModal(options) {
    modalOpen = true;
    modalCloseHook = options.onClose || null;
    MODAL_ROOT.innerHTML = "";

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", options.title || "Aviso");
    modal.innerHTML = `
      <div class="modal-emoji" aria-hidden="true">${esc(options.emoji || "✨")}</div>
      <h2>${esc(options.title || "")}</h2>
      <p>${esc(options.text || "")}</p>
      <div class="modal-actions"></div>
    `;

    const actions = modal.querySelector(".modal-actions");
    const buttons = options.actions && options.actions.length
      ? options.actions
      : [{ label: "Continuar", className: "btn btn--sun" }];

    function close() {
      if (!modalOpen) return;
      modalOpen = false;
      MODAL_ROOT.innerHTML = "";
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", modalKeyHandler);
      const hook = modalCloseHook;
      modalCloseHook = null;
      if (hook) hook();
    }

    modalKeyHandler = (event) => {
      if (event.key === "Escape" && options.dismissible !== false) close();
    };
    document.addEventListener("keydown", modalKeyHandler);

    if (options.dismissible !== false) {
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) close();
      });
    }

    for (const action of buttons) {
      const button = document.createElement("button");
      button.className = action.className || "btn btn--sun";
      button.textContent = action.label;
      button.addEventListener("click", () => {
        AE.sfx("click");
        if (action.onClick) action.onClick();
        if (action.close !== false) close();
      });
      actions.appendChild(button);
    }

    backdrop.appendChild(modal);
    MODAL_ROOT.appendChild(backdrop);
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      const first = modal.querySelector("button");
      if (first) first.focus({ preventScroll: true });
    }, 60);
  }

  function readParentUnlock() {
    try {
      return window.sessionStorage.getItem(PARENT_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setParentUnlock(value) {
    parentUnlocked = value;
    try {
      if (value) window.sessionStorage.setItem(PARENT_KEY, "1");
      else window.sessionStorage.removeItem(PARENT_KEY);
    } catch {
      /* noop */
    }
  }

  function confirmReset() {
    openModal({
      emoji: "🧹",
      title: "¿Borrar todo el progreso?",
      text: "Se perderán las estrellas, las palabras leídas y los premios. Esta acción no se puede deshacer.",
      actions: [
        { label: "Cancelar", className: "btn btn--soft" },
        {
          label: "Sí, borrar",
          className: "btn btn--danger",
          onClick: () => resetProgress(),
        },
      ],
    });
  }

  function resetProgress() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    state = clone(DEFAULT_STATE);
    setParentUnlock(false);
    applySettings();
    saveState();
    stickerQueue = [];
    if (currentRoute() === "/") {
      renderScreen("/");
    } else {
      navigate("/");
    }
  }

  /* Dominio, sesión y repaso adaptativo -------------------------- */
  function masteryKey(kind, id) {
    return `${kind}:${id}`;
  }

  function getMasteryRecord(kind, id) {
    return state.mastery[masteryKey(kind, id)] || null;
  }

  function recordAttempt(kind, id, correct) {
    if (!kind || !id) return null;
    const key = masteryKey(kind, id);
    const record = state.mastery[key] || {
      attempts: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      mastered: false,
      lastAt: 0,
    };
    record.attempts += 1;
    if (correct) {
      record.correct += 1;
      record.streak += 1;
      if (record.streak >= MASTERY_TARGET) record.mastered = true;
    } else {
      record.wrong += 1;
      record.streak = 0;
    }
    record.lastAt = Date.now();
    state.mastery[key] = record;
    saveState();
    return record;
  }

  function weakMastery(kind) {
    const prefix = `${kind}:`;
    return Object.entries(state.mastery)
      .filter(
        ([key, record]) =>
          key.startsWith(prefix) && record.attempts > 0 && !record.mastered
      )
      .map(([key, record]) => ({
        id: key.slice(prefix.length),
        key,
        ...record,
      }))
      .sort(
        (a, b) =>
          b.wrong - a.wrong ||
          a.streak - b.streak ||
          a.lastAt - b.lastAt
      );
  }

  function pickWeakId(kind, excludeIds = []) {
    const pool = weakMastery(kind).filter((item) => !excludeIds.includes(item.id));
    if (!pool.length) return null;
    const top = pool.slice(0, Math.min(6, pool.length));
    const picked = randomOf(top);
    return picked ? picked.id : null;
  }

  function masteredCount(kind) {
    const prefix = `${kind}:`;
    return Object.entries(state.mastery).filter(
      ([key, record]) => key.startsWith(prefix) && record.mastered
    ).length;
  }

  function ensureSession() {
    const today = todayKey();
    if (!state.session || state.session.date !== today) {
      state.session = { date: today, steps: [], activity: {}, bonus: false };
      saveState();
    }
    if (!Array.isArray(state.session.steps)) state.session.steps = [];
    if (!state.session.activity || typeof state.session.activity !== "object") {
      state.session.activity = {};
    }
    return state.session;
  }

  function getSessionSummary() {
    const session = ensureSession();
    const steps = SESSION_STEPS.map((step) => {
      const done = session.steps.includes(step.id);
      const activity = Math.max(0, Number(session.activity[step.id]) || 0);
      const progress = done ? 100 : Math.min(100, (activity / step.need) * 100);
      return { ...step, done, activity, progress };
    });
    const done = steps.filter((step) => step.done).length;
    return {
      steps,
      done,
      total: SESSION_STEPS.length,
      next: steps.find((step) => !step.done) || null,
      complete: done >= SESSION_STEPS.length,
      bonus: Boolean(session.bonus),
    };
  }

  function completeSessionStep(id) {
    const session = ensureSession();
    if (session.steps.includes(id)) return false;
    const step = SESSION_STEPS.find((item) => item.id === id);
    if (!step) return false;

    session.steps.push(id);
    const allDone = session.steps.length >= SESSION_STEPS.length;
    const bonusNow = allDone && !session.bonus;
    if (bonusNow) session.bonus = true;
    saveState();

    if (bonusNow) {
      addStars("¡Sesión completa!");
    } else {
      FX.reward(`${step.title} listo`, step.emoji);
      AE.sfx("win");
    }
    return true;
  }

  function bumpSessionActivity(id) {
    const step = SESSION_STEPS.find((item) => item.id === id);
    if (!step) return false;
    const session = ensureSession();
    if (session.steps.includes(id)) return false;
    session.activity[id] = (Number(session.activity[id]) || 0) + 1;
    saveState();
    if (session.activity[id] >= step.need) {
      completeSessionStep(id);
      return true;
    }
    return false;
  }

  function familyMasteryInfo(family) {
    const mastered = family.syllables.filter(
      (syllable) => getMasteryRecord("syllable", syllable)?.mastered
    ).length;
    const practiced = family.syllables.filter((syllable) =>
      state.practicedSyllables.includes(syllable)
    ).length;
    return { mastered, practiced, total: family.syllables.length };
  }

  function recommendNextFamily() {
    const started = D.families.filter(
      (family) => familyMasteryInfo(family).practiced > 0
    );
    const pool = started.length ? started : D.families;
    return [...pool].sort((a, b) => {
      const infoA = familyMasteryInfo(a);
      const infoB = familyMasteryInfo(b);
      return (
        infoA.mastered / infoA.total - infoB.mastered / infoB.total ||
        infoA.practiced - infoB.practiced ||
        D.families.indexOf(a) - D.families.indexOf(b)
      );
    })[0];
  }

  function categoryMasteryInfo(category) {
    const mastered = category.words.filter(
      (word) => getMasteryRecord("word", word.id)?.mastered
    ).length;
    const learned = category.words.filter((word) =>
      state.learnedWords.includes(word.id)
    ).length;
    return { mastered, learned, total: category.words.length };
  }

  function recommendNextCategory() {
    const started = D.categories.filter(
      (category) => categoryMasteryInfo(category).learned > 0
    );
    const pool = started.length ? started : D.categories;
    return [...pool].sort((a, b) => {
      const infoA = categoryMasteryInfo(a);
      const infoB = categoryMasteryInfo(b);
      return (
        infoA.mastered / infoA.total - infoB.mastered / infoB.total ||
        infoA.learned - infoB.learned ||
        D.categories.indexOf(a) - D.categories.indexOf(b)
      );
    })[0];
  }

  function exportProgress() {
    const payload = {
      app: "leo-con-pau",
      version: state.version,
      exportedAt: new Date().toISOString(),
      state,
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leo-con-pau-${todayKey()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1200);
      AE.sfx("win");
      FX.reward("Copia descargada", "💾");
    } catch {
      openModal({
        emoji: "⚠️",
        title: "No pude crear la copia",
        text: "Prueba de nuevo desde un navegador actualizado.",
        actions: [{ label: "Entendido", className: "btn btn--soft" }],
      });
    }
  }

  async function importProgressFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = parsed && parsed.state ? parsed.state : parsed;
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        throw new Error("Formato inesperado");
      }
      if (
        !("stars" in incoming) &&
        !("settings" in incoming) &&
        !("name" in incoming)
      ) {
        throw new Error("No parece una copia de Leo con Pau");
      }
      state = normalizeState(incoming);
      saveState();
      applySettings();
      stickerQueue = [];
      if (currentScreen === "/ajustes") renderSettings();
      openModal({
        emoji: "✅",
        title: "Copia restaurada",
        text: `El progreso de ${state.name} ya está en este dispositivo.`,
        actions: [{ label: "¡Genial!", className: "btn btn--sun" }],
      });
      AE.sfx("win");
    } catch {
      openModal({
        emoji: "⚠️",
        title: "No pude leer la copia",
        text: "Elige un archivo de copia de seguridad de Leo con Pau.",
        actions: [{ label: "Entendido", className: "btn btn--soft" }],
      });
      AE.sfx("wrong");
    }
  }

  function recordComprehension(phraseId, correct) {
    const hadCorrect = Number(state.comprehension.byPhrase[phraseId]) > 0;
    state.comprehension.answered += 1;
    if (correct) {
      state.comprehension.correct += 1;
      state.comprehension.byPhrase[phraseId] =
        (Number(state.comprehension.byPhrase[phraseId]) || 0) + 1;
    }
    saveState();
    recordAttempt("comprehension", phraseId, correct);
    return { firstCorrect: correct && !hadCorrect };
  }

  /* Componentes -------------------------------------------------- */
  function owlSVG() {
    return `
      <svg class="owl" viewBox="0 0 220 230" role="img" aria-label="Búho Sabio">
        <defs>
          <linearGradient id="owlBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#9b7bff"/>
            <stop offset="1" stop-color="#6c4ce0"/>
          </linearGradient>
          <linearGradient id="owlBelly" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fff7de"/>
            <stop offset="1" stop-color="#ffe2a3"/>
          </linearGradient>
          <linearGradient id="owlWing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#8c6bff"/>
            <stop offset="1" stop-color="#5b3fc9"/>
          </linearGradient>
        </defs>
        <path d="M52 58 L58 20 L86 46 Z" fill="#7a5cf0"/>
        <path d="M168 58 L162 20 L134 46 Z" fill="#7a5cf0"/>
        <ellipse cx="110" cy="122" rx="76" ry="86" fill="url(#owlBody)"/>
        <ellipse cx="110" cy="146" rx="45" ry="54" fill="url(#owlBelly)"/>
        <ellipse cx="66" cy="126" rx="17" ry="37" fill="url(#owlWing)" transform="rotate(14 66 126)"/>
        <g class="owl-wing">
          <ellipse cx="154" cy="126" rx="17" ry="37" fill="url(#owlWing)"/>
        </g>
        <circle cx="79" cy="105" r="29" fill="#fff"/>
        <circle cx="141" cy="105" r="29" fill="#fff"/>
        <g class="owl-pupil">
          <circle cx="84" cy="108" r="13" fill="#31264a"/>
          <circle cx="88" cy="103" r="4.5" fill="#fff"/>
        </g>
        <g class="owl-pupil">
          <circle cx="136" cy="108" r="13" fill="#31264a"/>
          <circle cx="140" cy="103" r="4.5" fill="#fff"/>
        </g>
        <circle cx="61" cy="143" r="8" fill="#ff8fab" opacity=".55"/>
        <circle cx="159" cy="143" r="8" fill="#ff8fab" opacity=".55"/>
        <path d="M110 121 L97 136 Q110 150 123 136 Z" fill="#ffb020"/>
        <path d="M95 169 q15 10 30 0" stroke="#e0a800" stroke-width="4" fill="none" stroke-linecap="round" opacity=".45"/>
        <path d="M97 203 l-8 13 M123 203 l8 13" stroke="#ffb020" stroke-width="7" stroke-linecap="round"/>
      </svg>
    `;
  }

  function screenHeader({ title, subtitle = "", instruction = "", extra = "" }) {
    return `
      <header class="screen-head">
        <button class="round-btn" data-nav="/" aria-label="Volver al inicio">←</button>
        <div class="head-copy">
          <h1>${esc(title)}</h1>
          ${subtitle ? `<p class="head-sub">${esc(subtitle)}</p>` : ""}
        </div>
        <div class="head-actions">
          ${instruction ? `<button class="round-btn round-btn--ghost" data-speak="${esc(instruction)}" aria-label="Escuchar instrucción">🔊</button>` : ""}
          ${extra}
        </div>
      </header>
    `;
  }

  /* Router ------------------------------------------------------- */
  function currentRoute() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || hash === "/") return "/";
    return hash.startsWith("/") ? hash : `/${hash}`;
  }

  function navigate(path) {
    if (currentRoute() === path) {
      renderScreen(path);
      return;
    }
    window.location.hash = `#${path}`;
  }

  function renderScreen(route) {
    clearScreenTimers();
    screenGeneration += 1;
    AE.stop();
    currentScreen = route;
    APP.innerHTML = "";
    window.scrollTo(0, 0);

    switch (route) {
      case "/sesion":
        renderSesion();
        break;
      case "/ruta":
        renderRuta();
        break;
      case "/repaso":
        renderRepaso();
        break;
      case "/silabas":
        renderSilabas();
        break;
      case "/palabras":
        renderPalabras();
        break;
      case "/escucha":
        renderEscucha();
        break;
      case "/leer":
        renderLeer();
        break;
      case "/vocales":
        renderVocales();
        break;
      case "/album":
        renderAlbum();
        break;
      case "/ajustes":
        if (parentUnlocked) renderSettings();
        else renderGate();
        break;
      default:
        currentScreen = "/";
        renderHome();
        break;
    }
  }

  function render() {
    renderScreen(currentRoute());
  }

  /* Inicio ------------------------------------------------------- */
  function renderHome() {
    ensureDaily();
    const session = getSessionSummary();
    const name = esc(state.name);
    const level = getLevelInfo(state.stars);
    const dailyCount = state.daily.count;
    const filled = Math.min(dailyCount, DAILY_GOAL);
    const left = Math.max(0, DAILY_GOAL - dailyCount);
    const dailyMessage =
      dailyCount >= DAILY_GOAL
        ? "¡Meta de hoy cumplida! Puedes seguir jugando."
        : `Te ${left === 1 ? "falta" : "faltan"} ${left} ${
            left === 1 ? "estrella" : "estrellas"
          } para la meta de hoy.`;

    const menu = [
      {
        route: "/silabas",
        cls: "silabas",
        emoji: "🧩",
        title: D.speech.titles.silabas,
        desc: "Junta letras y escucha",
      },
      {
        route: "/palabras",
        cls: "palabras",
        emoji: "🏗️",
        title: D.speech.titles.palabras,
        desc: "Arma palabras con sílabas",
      },
      {
        route: "/escucha",
        cls: "escucha",
        emoji: "👂",
        title: D.speech.titles.escucha,
        desc: "Adivina lo que suena",
      },
      {
        route: "/leer",
        cls: "leer",
        emoji: "📖",
        title: D.speech.titles.leer,
        desc: "Lee palabras y frases",
      },
      {
        route: "/vocales",
        cls: "vocales",
        emoji: "🎵",
        title: D.speech.titles.vocales,
        desc: "A, e, i, o, u",
      },
      {
        route: "/album",
        cls: "album",
        emoji: "🏆",
        title: D.speech.titles.album,
        desc: "Estrellas y premios",
      },
    ];

    APP.innerHTML = `
      <section class="screen home">
        <div class="topbar">
          <div class="topbar-left">
            <span class="mini-brand"><span class="mini-owl">🦉</span> Leo con ${name}</span>
          </div>
          <button class="round-btn" data-nav="/ajustes" aria-label="Ajustes para papás y mamás" title="Para papás y mamás">⚙️</button>
        </div>

        <div class="hero">
          <div class="mascot-wrap">
            ${owlSVG()}
            <button class="mascot-bubble" data-speak="${esc(D.speech.misc.hello)}" aria-label="Escuchar saludo del Búho Sabio">
              ¡Hola, ${name}!
            </button>
          </div>
          <div class="hero-copy">
            <p class="eyebrow">Aprender a leer</p>
            <h1>Vamos a leer <span class="highlight">jugando</span></h1>
            <p class="hero-sub">Sílabas, palabras y premios. Toca un juego para empezar.</p>
          </div>
          <div class="hero-side">
            <div class="star-pill" role="status" aria-label="Estrellas ganadas: ${state.stars}">
              <span class="star-icon" aria-hidden="true">⭐</span>
              <span data-stars>${state.stars}</span>
            </div>
            <button class="level-mini" data-nav="/album" aria-label="Ver mi álbum y nivel">
              <span aria-hidden="true">${level.current.emoji}</span>
              <span>${esc(level.current.name)}</span>
            </button>
          </div>
        </div>

        <div class="session-banner ${session.complete ? "is-complete" : ""}">
          <div class="session-banner-icon" aria-hidden="true">${session.complete ? "🏅" : "🎯"}</div>
          <div class="session-banner-copy">
            <span class="session-kicker">Mi sesión de hoy</span>
            <strong>${session.done} de ${session.total} pasos</strong>
            <span>${
              session.complete
                ? "¡Todo listo por hoy! Puedes seguir practicando."
                : `Siguiente: ${esc(session.next.title)} ${session.next.emoji}`
            }</span>
            <div class="session-mini-dots" aria-hidden="true">
              ${session.steps
                .map(
                  (step) =>
                    `<span class="session-mini-dot ${step.done ? "is-on" : ""}"></span>`
                )
                .join("")}
            </div>
          </div>
          <button class="btn ${session.complete ? "btn--soft" : "btn--sun"} btn--small" data-nav="/sesion">
            ${session.complete ? "Ver sesión" : "Empezar"} →
          </button>
        </div>

        <div class="daily-card">
          <div class="daily-icon" aria-hidden="true">${dailyCount >= DAILY_GOAL ? "🏅" : "🌞"}</div>
          <div class="daily-copy">
            <strong>Estrellas de hoy</strong>
            <span>${esc(dailyMessage)}</span>
          </div>
          <div class="daily-dots" aria-hidden="true">
            ${Array.from({ length: DAILY_GOAL }, (_, index) =>
              `<span class="daily-dot ${index < filled ? "is-on" : ""}"></span>`
            ).join("")}
          </div>
        </div>

        <div class="quick-links" aria-label="Más opciones">
          <button class="quick-link" data-nav="/ruta">
            <span class="quick-emoji" aria-hidden="true">🗺️</span> Mi camino
          </button>
          <button class="quick-link" data-nav="/repaso">
            <span class="quick-emoji" aria-hidden="true">🔁</span> Repaso
          </button>
        </div>

        <div class="menu-grid">
          ${menu
            .map(
              (item) => `
              <button class="menu-card menu-card--${item.cls}" data-nav="${item.route}" aria-label="Abrir ${esc(item.title)}">
                <span class="card-speak" data-speak="${esc(item.title)}" aria-hidden="true">🔊</span>
                <span class="card-emoji" aria-hidden="true">${item.emoji}</span>
                <h2>${esc(item.title)}</h2>
                <p>${esc(item.desc)}</p>
                <span class="card-arrow">Empezar <span class="arrow" aria-hidden="true">→</span></span>
              </button>
            `
            )
            .join("")}
        </div>

        <p class="home-foot">Hecho con cariño para ${name} <span aria-hidden="true">💜</span></p>
      </section>
    `;
  }

  /* Mi sesión de hoy -------------------------------------------- */
  function renderSesion() {
    const summary = getSessionSummary();
    const percent = Math.round((summary.done / summary.total) * 100);

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.sesion,
          subtitle: "Cinco pasos cortitos para hoy",
          instruction: D.speech.instructions.sesion,
          extra: `<button class="round-btn round-btn--ghost" data-nav="/ruta" aria-label="Ver mi camino">🗺️</button>`,
        })}

        <div class="session-hero ${summary.complete ? "is-complete" : ""}">
          <div class="session-hero-top">
            <div>
              <p class="kicker">Progreso de hoy</p>
              <h2>${summary.done} de ${summary.total} pasos</h2>
              <p>${
                summary.complete
                  ? "¡Sesión completa! Ganaste una estrella extra."
                  : `Te ${summary.total - summary.done === 1 ? "queda" : "quedan"} ${
                      summary.total - summary.done
                    } ${summary.total - summary.done === 1 ? "paso" : "pasos"} para terminar.`
              }</p>
            </div>
            <div class="session-medal" aria-hidden="true">${summary.complete ? "🏅" : "🎯"}</div>
          </div>
          <div class="progress-track session-track" aria-hidden="true">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>
          <div class="session-hero-actions">
            ${
              summary.complete
                ? `<button class="btn btn--sun btn--small" data-nav="/repaso">🔁 Seguir practicando</button>
                   <button class="btn btn--soft btn--small" data-nav="/ruta">🗺️ Ver mi camino</button>`
                : `<button class="btn btn--sun btn--small" data-nav="${summary.next.route}">${
                    summary.next.emoji
                  } ${summary.done ? "Continuar" : "Empezar"}: ${esc(
                    summary.next.title
                  )} →</button>`
            }
          </div>
        </div>

        <div class="session-steps">
          ${summary.steps
            .map((step, index) => {
              const current = summary.next && summary.next.id === step.id;
              return `
                <button class="session-step ${step.done ? "is-done" : ""} ${
                  current ? "is-current" : ""
                }" data-nav="${step.route}" aria-label="${esc(step.title)}: ${
                  step.done ? "completado" : `pendiente, ${step.desc}`
                }">
                  <span class="session-step-index" aria-hidden="true">${
                    step.done ? "✓" : index + 1
                  }</span>
                  <span class="session-step-emoji" aria-hidden="true">${step.emoji}</span>
                  <span class="session-step-copy">
                    <strong>${esc(step.title)}</strong>
                    <span>${esc(step.desc)}</span>
                    <span class="session-step-progress">${
                      step.done
                        ? "Completado"
                        : `${Math.min(step.activity, step.need)} de ${step.need}`
                    }</span>
                  </span>
                  <span class="session-step-status">${
                    step.done ? "Listo" : current ? "Ahora" : "Luego"
                  }</span>
                </button>
              `;
            })
            .join("")}
        </div>

        <div class="session-tip">
          <span aria-hidden="true">💡</span>
          <p>Si algo se siente difícil, puedes repetir el paso las veces que quieras. Lo importante es escuchar y probar.</p>
        </div>

        <div class="quick-links">
          <button class="quick-link" data-nav="/"><span class="quick-emoji" aria-hidden="true">🏠</span> Inicio</button>
          <button class="quick-link" data-nav="/ruta"><span class="quick-emoji" aria-hidden="true">🗺️</span> Mi camino</button>
          <button class="quick-link" data-nav="/repaso"><span class="quick-emoji" aria-hidden="true">🔁</span> Repaso</button>
        </div>
      </section>
    `;
  }

  /* Mi camino ---------------------------------------------------- */
  function renderRuta() {
    const nextFamily = recommendNextFamily();
    const nextCategory = recommendNextCategory();
    const familyMastered = D.families.reduce(
      (total, family) => total + familyMasteryInfo(family).mastered,
      0
    );
    const wordMastered = D.categories.reduce(
      (total, category) => total + categoryMasteryInfo(category).mastered,
      0
    );
    const phraseMastered = D.phrases.filter(
      (phrase) => getMasteryRecord("phrase", phrase.id)?.mastered
    ).length;
    const compMastered = D.phrases.filter(
      (phrase) => getMasteryRecord("comprehension", phrase.id)?.mastered
    ).length;

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.ruta,
          subtitle: "Lo que ya sabes y lo que sigue",
          instruction: D.speech.instructions.ruta,
          extra: `<button class="round-btn round-btn--ghost" data-nav="/sesion" aria-label="Mi sesión de hoy">🎯</button>`,
        })}

        <div class="path-recommend">
          <div class="path-recommend-head">
            <span class="path-spark" aria-hidden="true">✨</span>
            <div>
              <p class="kicker">Siguiente recomendado</p>
              <h2>Familia de la <span class="learning">${esc(nextFamily.letter)}</span></h2>
              <p>${familyMasteryInfo(nextFamily).mastered} de ${
                familyMasteryInfo(nextFamily).total
              } sílabas dominadas. Practica esta familia un ratito.</p>
            </div>
          </div>
          <button class="btn btn--sun btn--small" data-family-jump="${esc(nextFamily.id)}">
            Practicar sílabas →
          </button>
        </div>

        <div class="path-recommend path-recommend--words">
          <div class="path-recommend-head">
            <span class="path-spark" aria-hidden="true">🧱</span>
            <div>
              <p class="kicker">Palabras</p>
              <h2>${nextCategory.emoji} ${esc(nextCategory.name)}</h2>
              <p>${categoryMasteryInfo(nextCategory).mastered} de ${
                categoryMasteryInfo(nextCategory).total
              } palabras dominadas en esta categoría.</p>
            </div>
          </div>
          <button class="btn btn--soft btn--small" data-category-jump="${esc(
            nextCategory.id
          )}">Construir palabras →</button>
        </div>

        <h2 class="section-title">Sílabas <span>${familyMastered} de ${
          ALL_SYLLABLES.length
        } dominadas</span></h2>
        <div class="path-grid">
          ${D.families
            .map((family) => {
              const info = familyMasteryInfo(family);
              const percent = Math.round((info.mastered / info.total) * 100);
              return `
                <button class="path-node ${info.mastered === info.total ? "is-done" : ""} ${
                  family.id === nextFamily.id ? "is-next" : ""
                }" data-family-jump="${esc(family.id)}" aria-label="Familia de la ${esc(
                  family.letter
                )}, ${info.mastered} de ${info.total} sílabas dominadas">
                  <span class="path-node-top">
                    <span class="path-letter learning" style="--c:${family.color}">${esc(
                      family.letter
                    )}</span>
                    <span class="path-count">${info.mastered}/${info.total}</span>
                  </span>
                  <span class="path-name">${esc(family.name)}</span>
                  <span class="path-track" aria-hidden="true"><span style="width:${percent}%"></span></span>
                </button>
              `;
            })
            .join("")}
        </div>

        <h2 class="section-title">Palabras <span>${wordMastered} de ${
          ALL_WORDS.length
        } dominadas</span></h2>
        <div class="path-grid path-grid--categories">
          ${D.categories
            .map((category) => {
              const info = categoryMasteryInfo(category);
              const percent = Math.round((info.mastered / info.total) * 100);
              return `
                <button class="path-node ${info.mastered === info.total ? "is-done" : ""} ${
                  category.id === nextCategory.id ? "is-next" : ""
                }" data-category-jump="${esc(category.id)}" aria-label="${esc(
                  category.name
                )}, ${info.mastered} de ${info.total} palabras dominadas">
                  <span class="path-node-top">
                    <span class="path-letter path-letter--emoji">${category.emoji}</span>
                    <span class="path-count">${info.mastered}/${info.total}</span>
                  </span>
                  <span class="path-name">${esc(category.name)}</span>
                  <span class="path-track" aria-hidden="true"><span style="width:${percent}%"></span></span>
                </button>
              `;
            })
            .join("")}
        </div>

        <h2 class="section-title">Lectura <span>${phraseMastered} de ${
          D.phrases.length
        } frases</span></h2>
        <div class="path-reading">
          <div class="path-reading-item">
            <span aria-hidden="true">📖</span>
            <div><strong>Frases leídas</strong><span>${phraseMastered} dominadas de ${D.phrases.length}</span></div>
            <button class="btn btn--soft btn--small" data-nav="/leer">Leer →</button>
          </div>
          <div class="path-reading-item">
            <span aria-hidden="true">🤔</span>
            <div><strong>Comprensión</strong><span>${compMastered} frases dominadas de ${D.phrases.length}</span></div>
            <button class="btn btn--soft btn--small" data-nav="/leer">Practicar →</button>
          </div>
        </div>

        <div class="quick-links">
          <button class="quick-link" data-nav="/sesion"><span class="quick-emoji" aria-hidden="true">🎯</span> Mi sesión</button>
          <button class="quick-link" data-nav="/repaso"><span class="quick-emoji" aria-hidden="true">🔁</span> Repaso</button>
          <button class="quick-link" data-nav="/"><span class="quick-emoji" aria-hidden="true">🏠</span> Inicio</button>
        </div>
      </section>
    `;

    APP.querySelectorAll("[data-family-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        ui.silabasFamily = button.dataset.familyJump;
        AE.sfx("click");
        navigate("/silabas");
      });
    });

    APP.querySelectorAll("[data-category-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        ui.palabrasCategory = button.dataset.categoryJump;
        AE.sfx("click");
        navigate("/palabras");
      });
    });
  }

  /* Repaso inteligente ------------------------------------------ */
  function renderRepaso() {
    const weakSyllables = weakMastery("syllable").slice(0, 8);
    const weakWords = weakMastery("word").slice(0, 8);
    const weakComp = weakMastery("comprehension").slice(0, 4);
    const hasWeak = Boolean(weakSyllables.length || weakWords.length);

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.repaso,
          subtitle: "Práctica a tu medida",
          instruction: D.speech.instructions.repaso,
          extra: `<button class="round-btn round-btn--ghost" data-nav="/sesion" aria-label="Mi sesión de hoy">🎯</button>`,
        })}

        <div class="repaso-hero">
          <div class="repaso-icon" aria-hidden="true">🔁</div>
          <div>
            <h2>Repasamos lo que necesita práctica</h2>
            <p>${
              hasWeak
                ? "Estos sonidos aparecieron en tus juegos. Un repaso cortito ayuda a que se queden."
                : "Todavía no hay sonidos para repasar. Empezaremos con sílabas y palabras nuevas."
            }</p>
          </div>
        </div>

        ${
          hasWeak
            ? `<div class="weak-groups">
                ${
                  weakSyllables.length
                    ? `<div class="weak-group">
                        <h3>Sílabas para escuchar</h3>
                        <div class="weak-chips">
                          ${weakSyllables
                            .map(
                              (item) =>
                                `<button class="weak-chip learning" data-speak="${esc(
                                  item.id
                                )}" aria-label="Escuchar ${esc(item.id)}">${esc(item.id)}</button>`
                            )
                            .join("")}
                        </div>
                      </div>`
                    : ""
                }
                ${
                  weakWords.length
                    ? `<div class="weak-group">
                        <h3>Palabras para practicar</h3>
                        <div class="weak-chips">
                          ${weakWords
                            .map((item) => {
                              const word = ALL_WORDS.find((entry) => entry.id === item.id);
                              if (!word) return "";
                              return `<button class="weak-chip weak-chip--word" data-speak="${esc(
                                word.text
                              )}" aria-label="Escuchar ${esc(word.text)}">
                                <span aria-hidden="true">${word.emoji}</span> ${esc(word.text)}
                              </button>`;
                            })
                            .join("")}
                        </div>
                      </div>`
                    : ""
                }
              </div>`
            : ""
        }

        ${
          weakComp.length
            ? `<div class="weak-group weak-group--comp">
                <h3>Frases para platicar</h3>
                <p>Lee estas frases otra vez y conversen sobre lo que pasa.</p>
                <div class="weak-chips">
                  ${weakComp
                    .map((item) => {
                      const phrase = D.phrases.find((entry) => entry.id === item.id);
                      if (!phrase) return "";
                      return `<button class="weak-chip weak-chip--phrase" data-phrase-jump="${esc(
                        phrase.id
                      )}" aria-label="Leer ${esc(phrase.text)}">${esc(phrase.emoji)} ${esc(
                        phrase.text
                      )}</button>`;
                    })
                    .join("")}
                </div>
              </div>`
            : ""
        }

        <div class="repaso-start" id="repasoStart">
          <button class="btn btn--sun" id="startRepasoBtn">🎧 Empezar repaso de 5</button>
          <p>Mezcla sílabas y palabras que necesitan práctica. Al terminar puedes repetirlo.</p>
        </div>

        <div id="repasoMount" hidden></div>

        <div class="quick-links">
          <button class="quick-link" data-nav="/sesion"><span class="quick-emoji" aria-hidden="true">🎯</span> Mi sesión</button>
          <button class="quick-link" data-nav="/ruta"><span class="quick-emoji" aria-hidden="true">🗺️</span> Mi camino</button>
          <button class="quick-link" data-nav="/"><span class="quick-emoji" aria-hidden="true">🏠</span> Inicio</button>
        </div>
      </section>
    `;

    APP.querySelectorAll("[data-phrase-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        ui.leerMode = "phrases";
        AE.sfx("click");
        navigate("/leer");
      });
    });

    document.getElementById("startRepasoBtn").addEventListener("click", () => {
      AE.sfx("click");
      const start = document.getElementById("repasoStart");
      const mount = document.getElementById("repasoMount");
      if (start) start.classList.add("hidden");
      mount.hidden = false;
      mount.scrollIntoView({ behavior: "smooth", block: "start" });
      createListenGame(mount, {
        mode: "review",
        total: 5,
        onComplete: () => {
          const wasDone = getSessionSummary().steps.find(
            (step) => step.id === "repaso"
          )?.done;
          bumpSessionActivity("repaso");
          if (!wasDone) {
            const summary = getSessionSummary();
            if (!summary.bonus) addStars("¡Repaso completado!");
            else {
              FX.confetti({ count: 90, y: 0.3 });
              FX.reward("¡Sesión completa!", "🏅");
              AE.sfx("win");
            }
          } else {
            FX.confetti({ count: 80, y: 0.3 });
            FX.reward("¡Otra vez!", "🔁");
            AE.sfx("win");
          }
        },
        exitLabel: "Ver mi sesión",
        onExit: () => navigate("/sesion"),
      });
    });
  }

  /* Sílabas ------------------------------------------------------ */
  function renderSilabas() {
    let familyId = D.families.some((family) => family.id === ui.silabasFamily)
      ? ui.silabasFamily
      : "m";
    let currentVowel = null;
    let lastSyllable = null;

    const getFamily = () =>
      D.families.find((family) => family.id === familyId) || D.families[0];

    const syllableFor = (vowel) => {
      const family = getFamily();
      return family.byVowel ? family.byVowel[vowel] || null : `${family.letter}${vowel}`;
    };

    function vowelButtonsHTML(family) {
      return ["a", "e", "i", "o", "u"]
        .map((vowel) => {
          const syllable = family.byVowel
            ? family.byVowel[vowel] || null
            : `${family.letter}${vowel}`;
          return `<button class="vowel-btn learning" data-vowel="${vowel}" ${
            syllable ? "" : "disabled"
          } aria-label="Vocal ${esc(vowel)}">${esc(vowel)}</button>`;
        })
        .join("");
    }

    function bubbleHTML(family) {
      return family.syllables
        .map(
          (syllable) => `
            <button class="syllable-bubble learning ${
              state.practicedSyllables.includes(syllable) ? "is-practiced" : ""
            }" data-syllable="${esc(syllable)}" style="--c-border:${family.color}">
              ${esc(syllable)}
            </button>
          `
        )
        .join("");
    }

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.silabas,
          subtitle: "Junta una consonante con una vocal",
          instruction: D.speech.instructions.silabas,
        })}

        <div class="family-scroll" id="familyScroll" aria-label="Elige una consonante">
          ${D.families
            .map(
              (family) => `
              <button class="family-chip learning ${family.id === familyId ? "is-active" : ""}"
                data-family="${esc(family.id)}" style="--c:${family.color}"
                aria-label="Familia de la ${esc(family.letter)}" aria-pressed="${family.id === familyId}">
                ${esc(family.letter)}
              </button>
            `
            )
            .join("")}
        </div>

        <div class="blend-card">
          <div class="blend-machine">
            <div class="blend-box blend-consonant" id="consonantBox"></div>
            <div class="blend-operator" aria-hidden="true">+</div>
            <div class="blend-box blend-vowel" id="vowelBox"><span class="result-placeholder">?</span></div>
            <div class="blend-operator" aria-hidden="true">=</div>
            <button class="blend-box blend-result" id="resultBox" style="--c:${getFamily().color}" aria-label="Escuchar sílaba">
              <span class="result-placeholder">?</span>
            </button>
          </div>
          <p class="blend-hint" id="blendHint"></p>
          <div class="vowel-row" id="vowelRow"></div>
        </div>

        <div class="family-practice">
          <h2 class="family-title" id="familyTitle"></h2>
          <div class="syllable-bubbles" id="bubbleRow"></div>
          <p class="explore-count">Has descubierto <strong data-syllable-count>${state.practicedSyllables.length}</strong> sílabas.</p>
        </div>
      </section>
    `;

    function paintFamily() {
      const family = getFamily();
      currentVowel = null;
      lastSyllable = null;

      document.querySelectorAll(".family-chip").forEach((chip) => {
        const active = chip.dataset.family === family.id;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
      });

      const consonantBox = document.getElementById("consonantBox");
      consonantBox.innerHTML = `<span class="learning">${esc(family.letter)}</span><small>${esc(
        family.name
      )}</small>`;
      consonantBox.style.color = family.color;

      const vowelBox = document.getElementById("vowelBox");
      vowelBox.classList.remove("is-filled");
      vowelBox.innerHTML = '<span class="result-placeholder">?</span>';

      const result = document.getElementById("resultBox");
      result.style.setProperty("--c", family.color);
      result.classList.remove("is-pop");
      result.innerHTML = '<span class="result-placeholder">?</span>';
      result.setAttribute("aria-label", "Escuchar sílaba");

      document.getElementById("blendHint").textContent =
        family.vowelHint || "Toca una vocal y escucha la sílaba.";
      document.getElementById("vowelRow").innerHTML = vowelButtonsHTML(family);
      document.getElementById("familyTitle").innerHTML =
        `La familia de la <strong class="learning">${esc(family.letter)}</strong>`;
      document.getElementById("bubbleRow").innerHTML = bubbleHTML(family);
      AE.prefetch(family.syllables);
    }

    function updateBubbleMarks() {
      document.querySelectorAll("[data-syllable]").forEach((button) => {
        button.classList.toggle(
          "is-practiced",
          state.practicedSyllables.includes(button.dataset.syllable)
        );
      });
      const count = document.querySelector("[data-syllable-count]");
      if (count) count.textContent = String(state.practicedSyllables.length);
    }

    function chooseVowel(vowel) {
      const family = getFamily();
      const syllable = syllableFor(vowel);
      if (!syllable) return;

      currentVowel = vowel;
      const vowelBox = document.getElementById("vowelBox");
      vowelBox.textContent = vowel;
      vowelBox.classList.add("is-filled");

      const result = document.getElementById("resultBox");
      result.innerHTML = `<span class="learning">${esc(syllable)}</span>`;
      result.classList.remove("is-pop");
      void result.offsetWidth;
      result.classList.add("is-pop");
      result.style.setProperty("--c", family.color);
      result.setAttribute("aria-label", `Escuchar ${syllable}`);
      lastSyllable = syllable;

      AE.sfx("pop");
      say(syllable);
      const isNew = markSyllable(syllable);
      updateBubbleMarks();
      bumpSessionActivity("silabas");
      if (isNew) FX.sparkleAt(result, "✨");
    }

    const familyScroll = document.getElementById("familyScroll");
    familyScroll.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-family]");
      if (!chip) return;
      familyId = chip.dataset.family;
      ui.silabasFamily = familyId;
      AE.sfx("click");
      paintFamily();
    });

    document.getElementById("vowelRow").addEventListener("click", (event) => {
      const button = event.target.closest("[data-vowel]");
      if (!button || button.disabled) return;
      chooseVowel(button.dataset.vowel);
    });

    document.getElementById("bubbleRow").addEventListener("click", (event) => {
      const button = event.target.closest("[data-syllable]");
      if (!button) return;
      const syllable = button.dataset.syllable;
      AE.sfx("pop");
      say(syllable);
      markSyllable(syllable);
      button.classList.add("is-practiced");
      updateBubbleMarks();
      bumpSessionActivity("silabas");
      FX.sparkleAt(button, "✨");
    });

    document.getElementById("resultBox").addEventListener("click", () => {
      if (!lastSyllable) return;
      AE.sfx("click");
      say(lastSyllable);
    });

    paintFamily();
  }

  /* Construye palabras ------------------------------------------ */
  function renderPalabras() {
    let categoryId = D.categories.some((category) => category.id === ui.palabrasCategory)
      ? ui.palabrasCategory
      : D.categories[0].id;
    let currentWord = null;
    let tiles = [];
    let filled = 0;
    let wrong = 0;
    let recordedMistake = false;
    let solved = false;

    const getCategory = () =>
      D.categories.find((category) => category.id === categoryId) || D.categories[0];

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.palabras,
          subtitle: "Toca las sílabas en orden",
          instruction: D.speech.instructions.palabras,
        })}
        <div class="category-strip" id="categoryStrip" aria-label="Elige una categoría">
          ${D.categories
            .map(
              (category) => `
              <button class="category-chip ${category.id === categoryId ? "is-active" : ""}"
                data-category="${esc(category.id)}">
                <span aria-hidden="true">${category.emoji}</span> ${esc(category.name)}
              </button>
            `
            )
            .join("")}
        </div>
        <div id="wordStage"></div>
      </section>
    `;

    function pickWord(previous) {
      const category = getCategory();
      const unlearned = category.words.filter(
        (word) => !state.learnedWords.includes(word.id)
      );
      const weakId = pickWeakId("word", previous ? [previous.id] : []);
      const weakWord = weakId
        ? ALL_WORDS.find(
            (word) => word.id === weakId && word.categoryId === category.id
          )
        : null;

      if (weakWord && (!unlearned.length || Math.random() < 0.4)) {
        return weakWord;
      }

      let pool = unlearned.length ? unlearned : [...category.words];

      if (previous) {
        const withoutRepeat = pool.filter((word) => word.id !== previous.id);
        if (withoutRepeat.length) pool = withoutRepeat;
      }

      if (unlearned.length) {
        const minLevel = Math.min(...pool.map((word) => word.level));
        pool = pool.filter((word) => word.level === minLevel);
      }

      return randomOf(pool) || category.words[0];
    }

    function pickDistractors(word) {
      const pool = [...new Set(ALL_WORDS.flatMap((item) => item.syllables))].filter(
        (syllable) => !word.syllables.includes(syllable)
      );
      return shuffled(pool).slice(0, 2);
    }

    function nextSlot() {
      document.querySelectorAll(".slot").forEach((slot, index) => {
        slot.classList.toggle("is-next", index === filled);
      });
    }

    function renderWordStage() {
      const slots = currentWord.syllables
        .map(
          (_, index) =>
            `<span class="slot learning ${index === 0 ? "is-next" : ""}" data-slot="${index}"></span>`
        )
        .join("");

      const tileMarkup = tiles
        .map(
          (tile) => `
            <button class="tile learning" data-tile="${esc(tile.key)}" data-text="${esc(
              tile.text
            )}">${esc(tile.text)}</button>
          `
        )
        .join("");

      document.getElementById("wordStage").innerHTML = `
        <div class="word-card">
          <div class="word-top">
            <div class="word-emoji" aria-hidden="true">${currentWord.emoji}</div>
            <button class="audio-bubble" data-action="word-audio" aria-label="Escuchar ${esc(
              currentWord.text
            )}">🔊</button>
          </div>
          <p class="word-tip">Arma la palabra con las sílabas</p>
          <div class="word-slots" id="wordSlots">${slots}</div>
          <div class="tile-pool" id="tilePool">${tileMarkup}</div>
          <div class="word-actions" id="wordMainActions">
            <button class="btn btn--ghost btn--small" data-action="skip">Otra palabra</button>
          </div>
          <div id="wordFoot"></div>
        </div>
      `;
    }

    function newRound() {
      const previous = currentWord;
      currentWord = pickWord(previous);
      filled = 0;
      wrong = 0;
      recordedMistake = false;
      solved = false;
      const distractors = pickDistractors(currentWord);
      tiles = shuffled([
        ...currentWord.syllables.map((text, index) => ({ text, key: `s${index}` })),
        ...distractors.map((text, index) => ({ text, key: `d${index}` })),
      ]);
      renderWordStage();
      AE.prefetch(currentWord.syllables.concat([currentWord.text]));
    }

    function finishWord() {
      solved = true;
      recordAttempt("word", currentWord.id, true);
      bumpSessionActivity("palabras");
      const isNew = !state.learnedWords.includes(currentWord.id);
      if (isNew) {
        state.learnedWords.push(currentWord.id);
        saveState();
        addStars("¡Palabra nueva!");
      } else {
        FX.confetti({ count: 80, y: 0.3 });
        FX.reward("¡Muy bien!", "🎉");
        AE.sfx("win");
      }

      document.querySelectorAll("#tilePool .tile").forEach((tile) => {
        tile.disabled = true;
        tile.classList.add("is-used");
        tile.classList.remove("is-hint");
      });
      const mainActions = document.getElementById("wordMainActions");
      if (mainActions) mainActions.innerHTML = "";

      const foot = document.getElementById("wordFoot");
      if (foot) {
        foot.innerHTML = `
          <div class="completion">
            <span class="big" aria-hidden="true">🎉</span>
            <span>¡Muy bien! <span class="learning">${esc(currentWord.text)}</span></span>
          </div>
          <div class="word-actions">
            <button class="btn btn--sun" data-action="next">Siguiente palabra →</button>
            <button class="btn btn--soft" data-action="again">🔊 Escuchar</button>
          </div>
        `;
      }
    }

    function chooseTile(button) {
      if (solved) return;
      const expected = currentWord.syllables[filled];
      const text = button.dataset.text;

      if (text !== expected) {
        wrong += 1;
        if (!recordedMistake) {
          recordedMistake = true;
          recordAttempt("word", currentWord.id, false);
        }
        AE.sfx("wrong");
        button.classList.remove("is-wrong");
        void button.offsetWidth;
        button.classList.add("is-wrong");
        window.setTimeout(() => button.classList.remove("is-wrong"), 450);
        correction();
        if (wrong >= 2) {
          const hint = [...document.querySelectorAll("#tilePool .tile:not(:disabled)")].find(
            (tile) => tile.dataset.text === expected
          );
          if (hint) hint.classList.add("is-hint");
        }
        return;
      }

      const isFinal = filled === currentWord.syllables.length - 1;
      const slot = document.querySelector(`[data-slot="${filled}"]`);
      if (slot) {
        slot.textContent = text;
        slot.classList.add("is-filled");
        slot.classList.remove("is-next");
      }
      button.classList.add("is-used");
      button.disabled = true;
      filled += 1;
      document.querySelectorAll(".tile.is-hint").forEach((tile) => {
        tile.classList.remove("is-hint");
      });

      if (isFinal) {
        AE.sfx("win");
        say(currentWord.text);
        finishWord();
      } else {
        AE.sfx("correct");
        say(text);
        nextSlot();
      }
    }

    document.getElementById("categoryStrip").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-category]");
      if (!chip) return;
      categoryId = chip.dataset.category;
      ui.palabrasCategory = categoryId;
      AE.sfx("click");
      document.querySelectorAll("[data-category]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.category === categoryId);
      });
      currentWord = null;
      newRound();
    });

    document.getElementById("wordStage").addEventListener("click", (event) => {
      const tile = event.target.closest(".tile");
      if (tile) {
        chooseTile(tile);
        return;
      }
      const action = event.target.closest("[data-action]");
      if (!action) return;
      const name = action.dataset.action;
      if (name === "word-audio") {
        AE.sfx("click");
        say(currentWord.text);
      } else if (name === "skip") {
        AE.sfx("click");
        newRound();
      } else if (name === "next") {
        AE.sfx("click");
        newRound();
      } else if (name === "again") {
        AE.sfx("click");
        say(currentWord.text);
      }
    });

    newRound();
  }

  /* Juego de escucha reutilizable -------------------------------- */
  function createListenGame(mount, options = {}) {
    const mode = options.mode || "syllables";
    const total = options.total || 5;
    const gameOptions = options;
    let generation = 0;
    let round = 0;
    let target = null;
    let busy = false;
    let finished = false;
    let mistakes = 0;
    let wrongThisRound = 0;
    let recentKeys = [];

    const questions = {
      syllables: "¿Qué sílaba escuchaste?",
      words: "¿Qué palabra escuchaste?",
      vowels: "¿Qué vocal escuchaste?",
      review: "¿Qué escuchaste?",
    };

    const listenFamilies = D.families.filter((family) => family.id !== "h");
    const syllableFamilyMap = new Map();
    for (const family of D.families) {
      for (const syllable of family.syllables) {
        if (!syllableFamilyMap.has(syllable)) syllableFamilyMap.set(syllable, family);
      }
    }

    function localLater(fn, ms) {
      const myGeneration = generation;
      const id = window.setTimeout(() => {
        if (myGeneration !== generation) return;
        fn();
      }, ms);
      screenTimers.push(id);
      return id;
    }

    function recentIdsFor(kind) {
      return recentKeys
        .filter((key) => key.startsWith(`${kind}:`))
        .map((key) => key.slice(kind.length + 1));
    }

    function vowelTarget() {
      const vowel = randomOf(D.vowels);
      return {
        id: vowel.letter,
        label: vowel.letter,
        audio: vowel.letter,
        type: "vowel",
        options: D.vowels.map((item) => ({
          id: item.letter,
          label: item.letter,
          audio: item.letter,
        })),
      };
    }

    function syllableTarget(preferred) {
      const weakId = pickWeakId("syllable", recentIdsFor("syllable"));
      const syllable = preferred || weakId || randomOf(randomOf(listenFamilies).syllables);
      const family = syllableFamilyMap.get(syllable) || randomOf(listenFamilies);
      const syllables = family.syllables.includes(syllable)
        ? family.syllables
        : [syllable, ...family.syllables];
      const optionSet = new Set([syllable]);
      for (const item of shuffled(syllables)) {
        if (optionSet.size >= 3) break;
        optionSet.add(item);
      }
      let guard = 0;
      while (optionSet.size < 3 && guard < 40) {
        guard += 1;
        const otherFamily = randomOf(listenFamilies);
        const other = randomOf(otherFamily.syllables);
        if (other !== syllable) optionSet.add(other);
      }
      return {
        id: syllable,
        label: syllable,
        audio: syllable,
        type: "syllable",
        options: [...optionSet].map((item) => ({
          id: item,
          label: item,
          audio: item,
        })),
      };
    }

    function wordTarget(preferred) {
      const weakId = pickWeakId("word", recentIdsFor("word"));
      let word = preferred || (weakId ? ALL_WORDS.find((item) => item.id === weakId) : null);
      if (!word) word = randomOf(ALL_WORDS);
      const category =
        D.categories.find((item) => item.id === word.categoryId) || randomOf(D.categories);
      const choices = [word];
      const pool = shuffled(
        category.words.filter(
          (item) => item.id !== word.id && item.emoji !== word.emoji
        )
      );
      for (const item of pool) {
        if (choices.length >= 3) break;
        if (!choices.some((choice) => choice.emoji === item.emoji)) choices.push(item);
      }
      if (choices.length < 3) {
        for (const item of shuffled(ALL_WORDS)) {
          if (choices.length >= 3) break;
          if (
            item.id !== word.id &&
            !choices.some((choice) => choice.emoji === item.emoji)
          ) {
            choices.push(item);
          }
        }
      }
      return {
        id: word.id,
        label: word.text,
        audio: word.text,
        emoji: word.emoji,
        type: "word",
        options: choices.map((item) => ({
          id: item.id,
          label: item.text,
          audio: item.text,
          emoji: item.emoji,
        })),
      };
    }

    function makeTarget() {
      if (mode === "vowels") return vowelTarget();

      if (mode === "review") {
        const kinds = [];
        if (weakMastery("syllable").length) kinds.push("syllable");
        if (weakMastery("word").length) kinds.push("word");
        if (!kinds.length) kinds.push(Math.random() < 0.5 ? "syllable" : "word");
        const kind = randomOf(kinds);
        return kind === "word" ? wordTarget() : syllableTarget();
      }

      if (mode === "syllables") {
        if (weakMastery("syllable").length && Math.random() < 0.5) {
          return syllableTarget();
        }
        const family = randomOf(listenFamilies);
        return syllableTarget(randomOf(family.syllables));
      }

      if (weakMastery("word").length && Math.random() < 0.45) {
        return wordTarget();
      }
      return wordTarget(randomOf(randomOf(D.categories).words));
    }

    function nextTarget() {
      let candidate = makeTarget();
      for (let attempt = 0; attempt < 14; attempt += 1) {
        const key = `${candidate.type}:${candidate.id}`;
        if (!recentKeys.includes(key)) break;
        candidate = makeTarget();
      }
      const key = `${candidate.type}:${candidate.id}`;
      recentKeys.push(key);
      if (recentKeys.length > 4) recentKeys = recentKeys.slice(-4);
      return candidate;
    }

    function questionForTarget() {
      if (mode === "review") {
        return target.type === "word" ? questions.words : questions.syllables;
      }
      return questions[mode];
    }

    function updateHud() {
      const dots = mount.querySelectorAll(".round-dot");
      dots.forEach((dot, index) => {
        dot.classList.toggle("is-on", index < round);
      });
      const score = mount.querySelector(".listen-score");
      if (score) score.textContent = `${round} de ${total}`;
    }

    function playTarget(withClick = true) {
      const speaker = mount.querySelector(".big-speaker");
      if (!speaker || !target) return;
      if (withClick) AE.sfx("click");
      speaker.classList.add("is-playing");
      say(target.audio).then(() => speaker.classList.remove("is-playing"));
    }

    function renderRound() {
      busy = false;
      wrongThisRound = 0;
      target = nextTarget();
      const choices = shuffled(target.options);

      mount.innerHTML = `
        <div class="listen-card">
          <button class="big-speaker" type="button" aria-label="Escuchar otra vez">🔊</button>
          <p class="listen-question">${questionForTarget()}</p>
          <p class="listen-score" aria-hidden="true">${round} de ${total}</p>
          <div class="listen-choices ${
            mode === "vowels" ? "listen-choices--vowels" : ""
          }">
            ${choices
              .map(
                (choice) => `
                <button class="choice" type="button" data-choice="${esc(choice.id)}"
                  aria-label="${esc(choice.label)}">
                  ${
                    choice.emoji
                      ? `<span class="choice-emoji" aria-hidden="true">${choice.emoji}</span>`
                      : `<span class="learning">${esc(choice.label)}</span>`
                  }
                </button>
              `
              )
              .join("")}
          </div>
          <div class="round-dots" aria-hidden="true">
            ${Array.from({ length: total }, (_, index) =>
              `<span class="round-dot ${index < round ? "is-on" : ""}"></span>`
            ).join("")}
          </div>
        </div>
      `;

      mount.querySelector(".big-speaker").addEventListener("click", () => playTarget(true));

      mount.querySelectorAll("[data-choice]").forEach((button) => {
        button.addEventListener("click", () => chooseAnswer(button));
      });

      if (gameOptions.autoplay !== false) {
        localLater(() => playTarget(false), 420);
      }
    }

    function chooseAnswer(button) {
      if (busy || finished) return;
      const id = button.dataset.choice;

      if (id === target.id) {
        busy = true;
        button.classList.add("is-correct");
        if (target.type === "word") {
          const label = document.createElement("span");
          label.className = "choice-word learning";
          label.textContent = target.label;
          button.appendChild(label);
        }
        if (target.type !== "vowel") {
          recordAttempt(target.type, target.id, true);
        }
        if (gameOptions.onAnswer) {
          gameOptions.onAnswer({
            type: target.type,
            id: target.id,
            label: target.label,
            correct: true,
          });
        }
        AE.sfx("correct");
        praise();
        round += 1;
        updateHud();
        localLater(() => {
          if (round >= total) finish();
          else renderRound();
        }, 1350);
        return;
      }

      wrongThisRound += 1;
      mistakes += 1;
      if (target.type !== "vowel") {
        recordAttempt(target.type, target.id, false);
      }
      if (gameOptions.onAnswer) {
        gameOptions.onAnswer({
          type: target.type,
          id: target.id,
          label: target.label,
          correct: false,
        });
      }
      button.classList.add("is-wrong", "is-disabled");
      AE.sfx("wrong");
      correction();
      localLater(() => button.classList.remove("is-wrong"), 500);

      if (wrongThisRound >= 2) {
        const correct = mount.querySelector(`[data-choice="${CSS.escape(target.id)}"]`);
        if (correct) correct.classList.add("is-hint");
      }
    }

    function finish() {
      finished = true;
      generation += 1;
      if (gameOptions.onComplete) {
        gameOptions.onComplete({ mistakes, total, mode });
      }
      const summaryText =
        mode === "vowels"
          ? "Encontraste las 5 vocales."
          : mode === "words"
            ? `Escuchaste ${total} palabras.`
            : mode === "review"
              ? `Repasaste ${total} sonidos.`
              : `Escuchaste ${total} sílabas.`;
      mount.innerHTML = `
        <div class="listen-card game-summary">
          <div class="summary-emoji" aria-hidden="true">🎉</div>
          <h2>¡Muy bien!</h2>
          <p>${summaryText}</p>
          <div class="modal-actions">
            <button class="btn btn--sun" type="button" data-summary="again">Jugar otra vez</button>
            <button class="btn btn--soft" type="button" data-summary="exit">${esc(
              gameOptions.exitLabel || "Volver"
            )}</button>
          </div>
        </div>
      `;
      mount.querySelector('[data-summary="again"]').addEventListener("click", () => {
        AE.sfx("click");
        start();
      });
      mount.querySelector('[data-summary="exit"]').addEventListener("click", () => {
        AE.sfx("click");
        if (gameOptions.onExit) gameOptions.onExit();
        else navigate("/");
      });
    }

    function start() {
      generation += 1;
      round = 0;
      target = null;
      busy = false;
      finished = false;
      mistakes = 0;
      wrongThisRound = 0;
      recentKeys = [];
      renderRound();
    }

    start();
    return {
      destroy() {
        generation += 1;
      },
    };
  }

  /* Escucha y elige --------------------------------------------- */
  function renderEscucha() {
    let mode = "syllables";
    let game = null;
    const awarded = { syllables: false, words: false };

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.escucha,
          subtitle: "Escucha con atención y elige",
          instruction: D.speech.instructions.escucha,
        })}
        <div class="game-top">
          <div class="segmented" id="listenMode" aria-label="Tipo de juego">
            <button type="button" data-mode="syllables" class="is-active">Sílabas</button>
            <button type="button" data-mode="words">Palabras</button>
          </div>
          <span class="mini-toggle">🎧 5 rondas · se adapta a ti</span>
        </div>
        <div id="listenMount"></div>
      </section>
    `;

    function startGame() {
      if (game) game.destroy();
      game = createListenGame(document.getElementById("listenMount"), {
        mode,
        onComplete: () => {
          bumpSessionActivity("escucha");
          if (!awarded[mode]) {
            awarded[mode] = true;
            addStars(
              mode === "words" ? "¡Escuchaste 5 palabras!" : "¡Escuchaste 5 sílabas!"
            );
          } else {
            FX.confetti({ count: 80, y: 0.3 });
            FX.reward("¡Otra vez!", "🎧");
            AE.sfx("win");
          }
        },
        exitLabel: "Volver al inicio",
        onExit: () => navigate("/"),
      });
    }

    document.getElementById("listenMode").addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode]");
      if (!button) return;
      mode = button.dataset.mode;
      AE.sfx("click");
      document.querySelectorAll("[data-mode]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.mode === mode);
      });
      startGame();
    });

    startGame();
  }

  /* Leo solito --------------------------------------------------- */
  function renderLeer() {
    let currentWord = null;
    let currentPhrase = null;
    let solved = false;
    let readAlongId = 0;
    let alongPlaying = false;
    let compAnswered = false;
    let compWrong = 0;
    let compBusy = false;
    const myScreen = screenGeneration;

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.leer,
          subtitle: "Lee en voz alta, a tu ritmo",
          instruction: D.speech.instructions.leer,
        })}
        <div class="tabs" id="readTabs" aria-label="Elige qué leer">
          <button class="tab ${ui.leerMode === "words" ? "is-active" : ""}" data-tab="words">📖 Palabras</button>
          <button class="tab ${ui.leerMode === "phrases" ? "is-active" : ""}" data-tab="phrases">💬 Frases</button>
        </div>
        <div id="readerMount"></div>
      </section>
    `;

    const readerMount = document.getElementById("readerMount");

    function setAlongButtons(playing) {
      alongPlaying = playing;
      readerMount
        .querySelectorAll('[data-action="along-word"],[data-action="along-phrase"]')
        .forEach((button) => {
          button.innerHTML = playing ? "⏹️ Detener" : "🎧 Leer conmigo";
          button.setAttribute(
            "aria-label",
            playing ? "Detener la lectura" : "Leer conmigo"
          );
        });
    }

    function cancelReadAlong() {
      readAlongId += 1;
      readerMount.querySelectorAll(".is-reading").forEach((node) => {
        node.classList.remove("is-reading");
      });
      setAlongButtons(false);
    }

    function resetComprehension() {
      compAnswered = false;
      compWrong = 0;
      compBusy = false;
    }

    function pickReadingWord(previousId) {
      const unread = ALL_WORDS.filter((word) => !state.readWords.includes(word.id));
      const weakId = pickWeakId("word", previousId ? [previousId] : []);
      const weakWord = weakId ? ALL_WORDS.find((word) => word.id === weakId) : null;
      if (weakWord && (!unread.length || Math.random() < 0.4)) return weakWord;

      let pool = unread.length ? unread : [...ALL_WORDS];
      if (previousId) {
        const withoutRepeat = pool.filter((word) => word.id !== previousId);
        if (withoutRepeat.length) pool = withoutRepeat;
      }
      if (unread.length) {
        const minLevel = Math.min(...pool.map((word) => word.level));
        pool = pool.filter((word) => word.level === minLevel);
      }
      return randomOf(pool) || ALL_WORDS[0];
    }

    function pickPhrase(previousId) {
      const unread = D.phrases.filter((phrase) => !state.readPhrases.includes(phrase.id));
      const weakCompId = pickWeakId("comprehension", previousId ? [previousId] : []);
      const weakCompPhrase = weakCompId
        ? D.phrases.find((phrase) => phrase.id === weakCompId)
        : null;
      if (weakCompPhrase && Math.random() < 0.4) return weakCompPhrase;

      let pool = unread.length ? unread : [...D.phrases];
      if (previousId) {
        const withoutRepeat = pool.filter((phrase) => phrase.id !== previousId);
        if (withoutRepeat.length) pool = withoutRepeat;
      }
      return randomOf(pool) || D.phrases[0];
    }

    function mountWord() {
      cancelReadAlong();
      resetComprehension();
      const previous = currentWord?.id;
      currentPhrase = null;
      solved = false;
      currentWord = pickReadingWord(previous);
      const syllables = currentWord.syllables
        .map(
          (syllable) =>
            `<button class="read-syllable learning" data-read-syllable="${esc(
              syllable
            )}" aria-label="Escuchar sílaba ${esc(syllable)}">${esc(syllable)}</button>`
        )
        .join("");

      readerMount.innerHTML = `
        <div class="read-card">
          <div class="read-emoji" aria-hidden="true">${currentWord.emoji}</div>
          <div class="read-word">${syllables}</div>
          <p class="read-hint">Toca cada sílaba. Después lee la palabra completa.</p>
          <div class="read-actions">
            <button class="btn btn--soft" data-action="listen-word">🔊 Escuchar palabra</button>
            <button class="btn btn--soft" data-action="along-word">🎧 Leer conmigo</button>
            <button class="btn btn--sun" data-action="done-word">✅ Ya lo leí</button>
            <button class="btn btn--ghost btn--small" data-action="skip-word">Otra palabra</button>
          </div>
          <div id="readFoot"></div>
        </div>
      `;
      AE.prefetch([currentWord.text, ...currentWord.syllables]);
    }

    function mountPhrase() {
      cancelReadAlong();
      resetComprehension();
      const previous = currentPhrase?.id;
      currentWord = null;
      solved = false;
      currentPhrase = pickPhrase(previous);
      const words = currentPhrase.words
        .map(
          (word) =>
            `<button class="phrase-word learning" data-read-word="${esc(
              word
            )}" aria-label="Escuchar ${esc(word)}">${esc(word)}</button>`
        )
        .join("");

      readerMount.innerHTML = `
        <div class="read-card">
          <div class="sentence-emoji" aria-hidden="true">${currentPhrase.emoji}</div>
          <div class="phrase-wrap">
            <div class="phrase">${words}</div>
          </div>
          <p class="read-hint">Toca las palabras para escucharlas. Luego lee toda la frase.</p>
          <div class="read-actions">
            <button class="btn btn--soft" data-action="listen-phrase">🔊 Escuchar frase</button>
            <button class="btn btn--soft" data-action="along-phrase">🎧 Leer conmigo</button>
            <button class="btn btn--sun" data-action="done-phrase">✅ Ya la leí</button>
            <button class="btn btn--ghost btn--small" data-action="skip-phrase">Otra frase</button>
          </div>
          <div id="readFoot"></div>
          <div id="compMount"></div>
        </div>
      `;
      AE.prefetch([currentPhrase.text, ...currentPhrase.words]);
    }

    function mountReader() {
      if (ui.leerMode === "phrases") mountPhrase();
      else mountWord();
    }

    async function readAlongWord() {
      if (!currentWord) return;
      const myId = ++readAlongId;
      setAlongButtons(true);
      const buttons = [...readerMount.querySelectorAll("[data-read-syllable]")];
      for (const button of buttons) {
        if (myId !== readAlongId || screenGeneration !== myScreen) return;
        button.classList.add("is-reading");
        await say(button.dataset.readSyllable);
        button.classList.remove("is-reading");
      }
      if (myId !== readAlongId || screenGeneration !== myScreen) return;
      await say(currentWord.text);
      if (myId === readAlongId) setAlongButtons(false);
    }

    async function readAlongPhrase() {
      if (!currentPhrase) return;
      const myId = ++readAlongId;
      setAlongButtons(true);
      const buttons = [...readerMount.querySelectorAll("[data-read-word]")];
      for (const button of buttons) {
        if (myId !== readAlongId || screenGeneration !== myScreen) return;
        button.classList.add("is-reading");
        await say(button.dataset.readWord);
        button.classList.remove("is-reading");
      }
      if (myId !== readAlongId || screenGeneration !== myScreen) return;
      await say(currentPhrase.text);
      if (myId === readAlongId) setAlongButtons(false);
    }

    function completeWord() {
      if (solved || !currentWord) return;
      solved = true;
      recordAttempt("word", currentWord.id, true);
      bumpSessionActivity("leer");
      const isNew = !state.readWords.includes(currentWord.id);
      if (isNew) {
        state.readWords.push(currentWord.id);
        saveState();
        addStars("¡Leíste una palabra nueva!");
      } else {
        FX.confetti({ count: 80, y: 0.3 });
        FX.reward("¡Muy bien!", "📖");
        AE.sfx("win");
      }
      praise();
      const foot = document.getElementById("readFoot");
      if (foot) {
        foot.innerHTML = `
          <div class="completion">
            <span class="big" aria-hidden="true">📖</span>
            <span>¡Muy bien! <span class="learning">${esc(currentWord.text)}</span></span>
          </div>
          <div class="read-actions">
            <button class="btn btn--sun" data-action="next-word">Siguiente palabra →</button>
            <button class="btn btn--soft" data-action="listen-word">🔊 Escuchar</button>
          </div>
        `;
      }
      const done = readerMount.querySelector('[data-action="done-word"]');
      if (done) {
        done.disabled = true;
        done.textContent = "✅ Leído";
      }
    }

    function completePhrase() {
      if (solved || !currentPhrase) return;
      solved = true;
      recordAttempt("phrase", currentPhrase.id, true);
      bumpSessionActivity("leer");
      const isNew = !state.readPhrases.includes(currentPhrase.id);
      if (isNew) {
        state.readPhrases.push(currentPhrase.id);
        saveState();
        addStars("¡Leíste una frase nueva!");
      } else {
        FX.confetti({ count: 80, y: 0.3 });
        FX.reward("¡Muy bien!", "💬");
        AE.sfx("win");
      }
      praise();
      const foot = document.getElementById("readFoot");
      if (foot) {
        foot.innerHTML = `
          <div class="completion">
            <span class="big" aria-hidden="true">💬</span>
            <span>¡Muy bien! Leíste la frase.</span>
          </div>
          <div class="read-actions">
            <button class="btn btn--sun" data-action="next-phrase">Siguiente frase →</button>
            <button class="btn btn--soft" data-action="listen-phrase">🔊 Escuchar</button>
          </div>
        `;
      }
      const done = readerMount.querySelector('[data-action="done-phrase"]');
      if (done) {
        done.disabled = true;
        done.textContent = "✅ Leída";
      }
      if (state.settings.comprehension) {
        showComprehension(currentPhrase);
      }
    }

    function showComprehension(phrase) {
      const question = phrase.question;
      const mount = document.getElementById("compMount");
      if (!question || !mount) return;
      const options = shuffled(question.options);

      mount.innerHTML = `
        <div class="comp-card">
          <div class="comp-head">
            <span class="comp-badge">🤔 ¿Entendiste?</span>
            <button class="round-btn round-btn--ghost comp-audio" type="button"
              data-action="comp-audio" aria-label="Escuchar la pregunta">🔊</button>
          </div>
          <p class="comp-prompt">${esc(question.prompt)}</p>
          <div class="comp-options">
            ${options
              .map(
                (option) => `
                <button class="comp-option" type="button" data-comp-option="${esc(
                  option.id
                )}" aria-label="${esc(option.label)}">
                  <span class="comp-emoji" aria-hidden="true">${option.emoji}</span>
                  <span class="learning">${esc(option.label)}</span>
                </button>
              `
              )
              .join("")}
          </div>
          <p class="comp-feedback" role="status">Escucha la pregunta y elige.</p>
          <button class="btn btn--sun btn--small comp-next" type="button"
            data-action="next-phrase" hidden>Siguiente frase →</button>
        </div>
      `;

      AE.prefetch([
        question.spoken,
        question.prompt,
        ...question.options.map((option) => option.label),
      ]);
      later(() => {
        if (currentPhrase && currentPhrase.id === phrase.id) say(question.spoken);
      }, 500);
    }

    function chooseCompOption(button) {
      if (!currentPhrase?.question || compAnswered || compBusy) return;
      const question = currentPhrase.question;
      const correct = button.dataset.compOption === question.answer;
      const result = recordComprehension(currentPhrase.id, correct);
      const feedback = readerMount.querySelector(".comp-feedback");

      if (correct) {
        compAnswered = true;
        button.classList.add("is-correct");
        readerMount.querySelectorAll(".comp-option").forEach((option) => {
          option.disabled = true;
          if (option !== button) option.classList.add("is-disabled");
        });
        if (feedback) feedback.textContent = "¡Muy bien! Entendiste la frase.";
        AE.sfx("correct");
        praise();
        const next = readerMount.querySelector(".comp-next");
        if (next) next.hidden = false;
        if (result.firstCorrect) {
          addStars("¡Entendiste la frase!");
        } else {
          FX.confetti({ count: 70, y: 0.35 });
          FX.reward("¡Otra vez!", "🤔");
          AE.sfx("win");
        }
        return;
      }

      compWrong += 1;
      compBusy = true;
      button.classList.add("is-wrong");
      if (feedback) feedback.textContent = "Casi. Escucha otra vez y prueba de nuevo.";
      AE.sfx("wrong");
      correction();
      later(() => {
        compBusy = false;
        button.classList.remove("is-wrong");
      }, 650);
      if (compWrong >= 2) {
        const correctButton = readerMount.querySelector(
          `[data-comp-option="${CSS.escape(question.answer)}"]`
        );
        if (correctButton) correctButton.classList.add("is-hint");
      }
    }

    readerMount.addEventListener("click", (event) => {
      const compOption = event.target.closest("[data-comp-option]");
      if (compOption) {
        chooseCompOption(compOption);
        return;
      }

      const syllable = event.target.closest("[data-read-syllable]");
      if (syllable) {
        cancelReadAlong();
        AE.sfx("click");
        say(syllable.dataset.readSyllable);
        FX.sparkleAt(syllable, "✨");
        return;
      }

      const wordButton = event.target.closest("[data-read-word]");
      if (wordButton) {
        cancelReadAlong();
        AE.sfx("click");
        say(wordButton.dataset.readWord);
        wordButton.classList.add("is-active");
        window.setTimeout(() => wordButton.classList.remove("is-active"), 650);
        return;
      }

      const action = event.target.closest("[data-action]");
      if (!action) return;
      const name = action.dataset.action;

      if (name === "along-word") {
        if (alongPlaying) {
          cancelReadAlong();
          AE.stop();
        } else {
          readAlongWord();
        }
      } else if (name === "along-phrase") {
        if (alongPlaying) {
          cancelReadAlong();
          AE.stop();
        } else {
          readAlongPhrase();
        }
      } else if (name === "comp-audio" && currentPhrase?.question) {
        AE.sfx("click");
        say(currentPhrase.question.spoken);
      } else if (name === "listen-word" && currentWord) {
        cancelReadAlong();
        AE.sfx("click");
        say(currentWord.text);
      } else if (name === "done-word") {
        completeWord();
      } else if (name === "skip-word") {
        AE.sfx("click");
        mountWord();
      } else if (name === "next-word") {
        AE.sfx("click");
        mountWord();
      } else if (name === "listen-phrase" && currentPhrase) {
        cancelReadAlong();
        AE.sfx("click");
        say(currentPhrase.text);
      } else if (name === "done-phrase") {
        completePhrase();
      } else if (name === "skip-phrase") {
        AE.sfx("click");
        mountPhrase();
      } else if (name === "next-phrase") {
        AE.sfx("click");
        mountPhrase();
      }
    });

    document.getElementById("readTabs").addEventListener("click", (event) => {
      const tab = event.target.closest("[data-tab]");
      if (!tab) return;
      ui.leerMode = tab.dataset.tab;
      AE.sfx("click");
      document.querySelectorAll("[data-tab]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.tab === ui.leerMode);
      });
      mountReader();
    });

    mountReader();
  }

  /* Vocales ------------------------------------------------------ */
  function renderVocales() {
    const explored = state.vowelsExplored.length;
    const gameMountId = "vowelGameMount";
    let vowelGameAwarded = false;

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.vocales,
          subtitle: "Escucha y descubre las vocales",
          instruction: D.speech.instructions.vocales,
        })}
        <div class="vowel-grid" id="vowelGrid">
          ${D.vowels
            .map(
              (vowel) => `
              <div class="vowel-card ${state.vowelsExplored.includes(vowel.letter) ? "is-explored" : ""}"
                style="--c:${vowel.color}">
                <button class="vowel-letter learning" data-vowel-letter="${vowel.letter}"
                  aria-label="Escuchar vocal ${esc(vowel.letter)}">${vowel.letter}</button>
                <button class="vowel-example" data-vowel-word="${esc(vowel.word)}"
                  aria-label="Escuchar ${esc(vowel.word)}">
                  <span class="v-emoji" aria-hidden="true">${vowel.emoji}</span>
                  <span class="learning">${esc(vowel.word)}</span>
                </button>
              </div>
            `
            )
            .join("")}
        </div>
        <p class="explore-count" id="vowelProgress">Vocales descubiertas: <strong data-vowel-count>${explored}</strong> de ${D.vowels.length}</p>
        <div class="vowel-game-cta" id="vowelCta">
          <button class="btn btn--sun" id="playVowelsBtn">🎮 Jugar: ¿cuál suena?</button>
        </div>
        <div id="${gameMountId}" hidden></div>
      </section>
    `;

    document.getElementById("vowelGrid").addEventListener("click", (event) => {
      const letterButton = event.target.closest("[data-vowel-letter]");
      if (letterButton) {
        const letter = letterButton.dataset.vowelLetter;
        AE.sfx("pop");
        say(letter);
        if (markVowel(letter)) {
          FX.sparkleAt(letterButton, "✨");
          letterButton.closest(".vowel-card")?.classList.add("is-explored");
          const count = document.querySelector("[data-vowel-count]");
          if (count) count.textContent = String(state.vowelsExplored.length);
        }
        return;
      }

      const wordButton = event.target.closest("[data-vowel-word]");
      if (wordButton) {
        const word = wordButton.dataset.vowelWord;
        const vowel = D.vowels.find((item) => item.word === word);
        AE.sfx("click");
        say(word);
        if (vowel && markVowel(vowel.letter)) {
          FX.sparkleAt(wordButton, "✨");
          wordButton.closest(".vowel-card")?.classList.add("is-explored");
          const count = document.querySelector("[data-vowel-count]");
          if (count) count.textContent = String(state.vowelsExplored.length);
        }
      }
    });

    document.getElementById("playVowelsBtn").addEventListener("click", () => {
      AE.sfx("click");
      document.getElementById("vowelGrid").classList.add("hidden");
      document.getElementById("vowelProgress").classList.add("hidden");
      document.getElementById("vowelCta").classList.add("hidden");
      const mount = document.getElementById(gameMountId);
      mount.hidden = false;
      createListenGame(mount, {
        mode: "vowels",
        onComplete: () => {
          if (!vowelGameAwarded) {
            vowelGameAwarded = true;
            addStars("¡Encontraste las 5 vocales!");
          } else {
            FX.confetti({ count: 80, y: 0.3 });
            FX.reward("¡Otra vez!", "🎵");
            AE.sfx("win");
          }
        },
        exitLabel: "Ver las vocales",
        onExit: () => renderVocales(),
      });
    });
  }

  /* Álbum -------------------------------------------------------- */
  function renderAlbum() {
    const level = getLevelInfo(state.stars);
    const stickerCount = D.stickers.filter((sticker) => state.stars >= sticker.stars).length;
    const masteredSyllables = masteredCount("syllable");
    const masteredWords = masteredCount("word");
    const masteredPhrases = masteredCount("phrase");

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: D.speech.titles.album,
          subtitle: "Tus estrellas y premios",
          instruction: D.speech.instructions.album,
        })}

        <div class="album-hero">
          <div class="level-badge" aria-hidden="true">${level.current.emoji}</div>
          <div class="album-info">
            <p class="kicker">Tu nivel</p>
            <h2>${esc(level.current.name)}</h2>
            <p class="stars-line">
              <span aria-hidden="true">⭐</span> ${state.stars} ${
                state.stars === 1 ? "estrella" : "estrellas"
              }
            </p>
            <div class="progress-track" aria-hidden="true">
              <div class="progress-fill" style="width:${level.progress}%"></div>
            </div>
            <p class="next-line">${
              level.next
                ? `Te faltan ${level.remaining} ${
                    level.remaining === 1 ? "estrella" : "estrellas"
                  } para ${esc(level.next.name)} ${level.next.emoji}`
                : "¡Llegaste al nivel más alto!"
            }</p>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-card"><strong>${state.practicedSyllables.length}</strong><span>Sílabas</span></div>
          <div class="stat-card"><strong>${state.learnedWords.length}</strong><span>Palabras</span></div>
          <div class="stat-card"><strong>${state.readWords.length}</strong><span>Leídas</span></div>
          <div class="stat-card"><strong>${state.readPhrases.length}</strong><span>Frases</span></div>
        </div>

        <p class="explore-count">
          Dominadas: <strong>${masteredSyllables}</strong> sílabas ·
          <strong>${masteredWords}</strong> palabras ·
          <strong>${masteredPhrases}</strong> frases.
        </p>

        <h2 class="section-title">Mis premios <span>${stickerCount} de ${D.stickers.length}</span></h2>
        <div class="sticker-grid">
          ${D.stickers
            .map((sticker) => {
              const unlocked = state.stars >= sticker.stars;
              return `
                <div class="sticker ${unlocked ? "" : "is-locked"}" aria-label="${
                  unlocked ? sticker.name : `Premio bloqueado, faltan ${sticker.stars} estrellas`
                }">
                  <span class="s-emoji" aria-hidden="true">${unlocked ? sticker.emoji : "🔒"}</span>
                  <span class="s-name">${unlocked ? esc(sticker.name) : "Por descubrir"}</span>
                  <span class="s-req">${unlocked ? "¡Conseguido!" : `${sticker.stars} ⭐`}</span>
                </div>
              `;
            })
            .join("")}
        </div>

        <p class="explore-count">${
          state.stars === 0
            ? "Tu primer premio está a 5 estrellas. ¡A jugar!"
            : "Cada juego nuevo te da estrellas para descubrir más premios."
        }</p>

        <div class="vowel-game-cta">
          <button class="btn btn--sun" data-nav="/">🏠 Seguir jugando</button>
        </div>
      </section>
    `;
  }

  /* Ajustes y zona de adultos ------------------------------------ */
  function renderGate() {
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    const answer = a * b;

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({ title: "Para papás y mamás", subtitle: "Zona de adultos" })}
        <div class="gate-wrap">
          <form class="gate" id="gateForm" autocomplete="off">
            <div class="gate-emoji" aria-hidden="true">🔐</div>
            <h2>Solo para adultos</h2>
            <p>Resuelve esta multiplicación para entrar a los ajustes.</p>
            <div class="equation" id="equation">${a} × ${b} = ?</div>
            <div class="gate-form">
              <input id="gateInput" name="gate" inputmode="numeric" pattern="[0-9]*"
                aria-label="Respuesta" placeholder="?" maxlength="3" />
              <button class="btn" type="submit">Entrar</button>
            </div>
            <p class="gate-error" id="gateError" role="alert"></p>
            <button class="btn btn--ghost btn--small" type="button" data-nav="/">Volver al inicio</button>
          </form>
        </div>
      </section>
    `;

    const form = document.getElementById("gateForm");
    const input = document.getElementById("gateInput");
    const error = document.getElementById("gateError");
    window.setTimeout(() => input.focus(), 100);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (Number(input.value) === answer) {
        AE.sfx("win");
        setParentUnlock(true);
        renderSettings();
      } else {
        error.textContent = "Ese no es el resultado. Inténtalo otra vez.";
        input.value = "";
        input.focus();
        form.classList.remove("is-wrong");
        void form.offsetWidth;
        form.classList.add("is-wrong");
        AE.sfx("wrong");
      }
    });
  }

  /* Paquete completo de audio para jugar sin internet ------------ */
  async function loadAudioManifest() {
    if (audioPackManifest) return audioPackManifest;
    const response = await fetch("assets/audio/manifest.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("No se pudo leer el manifiesto de audio");
    audioPackManifest = await response.json();
    return audioPackManifest;
  }

  async function countCachedAudio() {
    if (!("caches" in window)) return 0;
    const names = (await caches.keys()).filter((name) =>
      name.startsWith("leo-con-pau-")
    );
    const urls = new Set();
    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const clean = request.url.split("?")[0];
        if (clean.endsWith(".mp3")) urls.add(clean);
      }
    }
    return urls.size;
  }

  function audioPackLabel(count, total) {
    if (count >= total) {
      return `Listo: los ${total} sonidos están guardados en este dispositivo.`;
    }
    if (count === 0) {
      return `Todavía no hay sonidos guardados. Son ${total} y ocupan unos 6 MB.`;
    }
    return `${count} de ${total} sonidos guardados. Descarga el resto para jugar sin internet.`;
  }

  async function refreshAudioPackNote() {
    const note = document.getElementById("audioPackNote");
    if (!note) return;
    try {
      const manifest = await loadAudioManifest();
      const count = await countCachedAudio();
      note.textContent = audioPackLabel(count, manifest.clips.length);
    } catch {
      note.textContent = "No se pudo comprobar el paquete de sonidos.";
    }
  }

  async function downloadAudioPack() {
    if (audioPackRunning) return;
    const button = document.getElementById("downloadAudio");
    const note = document.getElementById("audioPackNote");
    if (!button || !note) return;

    audioPackRunning = true;
    button.disabled = true;
    button.textContent = "⏳ Descargando…";

    try {
      if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
        note.textContent =
          "Abre la app una vez más y vuelve a intentarlo para activar el modo sin conexión.";
        return;
      }

      const manifest = await loadAudioManifest();
      const queue = manifest.clips.map((clip) => `assets/audio/${clip.id}.mp3`);
      const total = queue.length;
      let done = 0;
      let failed = 0;

      async function worker() {
        while (queue.length) {
          const url = queue.shift();
          try {
            const response = await fetch(url, { cache: "reload" });
            if (!response.ok) throw new Error(String(response.status));
            await response.arrayBuffer();
          } catch {
            failed += 1;
          }
          done += 1;
          if (done % 4 === 0 || done === total) {
            note.textContent = `Descargando sonidos… ${done} de ${total}`;
          }
        }
      }

      await Promise.all([worker(), worker(), worker(), worker()]);
      const count = await countCachedAudio();

      if (failed) {
        note.textContent = `Se guardaron ${count} de ${total}. No se pudieron descargar ${failed}; revisa la conexión y vuelve a intentarlo.`;
      } else {
        localStorage.setItem(
          AUDIO_PACK_KEY,
          JSON.stringify({ count, date: new Date().toISOString() })
        );
        note.textContent = audioPackLabel(count, total);
      }
    } catch {
      note.textContent =
        "No se pudo completar la descarga. Revisa la conexión e inténtalo de nuevo.";
    } finally {
      audioPackRunning = false;
      button.disabled = false;
      button.textContent = "⬇️ Descargar todos los sonidos";
    }
  }

  function renderSettings() {
    const voices = AE.getVoices();
    const voiceMode = state.settings.voice === "device" ? "device" : "app";
    const stickerCount = D.stickers.filter((sticker) => state.stars >= sticker.stars).length;
    const masteredSyllables = masteredCount("syllable");
    const masteredWords = masteredCount("word");
    const masteredPhrases = masteredCount("phrase");
    const masteredComp = masteredCount("comprehension");

    APP.innerHTML = `
      <section class="screen">
        ${screenHeader({
          title: "Para papás y mamás",
          subtitle: "Ajustes, progreso y consejos",
          extra: `<span class="mini-toggle">🔒 Zona de adultos</span>`,
        })}

        <div class="settings-card">
          <h2>Personaliza la app</h2>
          <p>Los cambios se guardan automáticamente en este dispositivo.</p>

          <div class="setting-row">
            <label class="setting-label" for="nameInput">
              <strong>Nombre de la lectora</strong>
              <span>Aparece en el saludo de inicio</span>
            </label>
            <input class="text-input" id="nameInput" type="text" maxlength="${MAX_NAME}"
              value="${esc(state.name)}" autocomplete="off" />
          </div>

          <div class="setting-row">
            <div class="setting-label">
              <strong>Voz</strong>
              <span>La voz incluida funciona sin internet</span>
            </div>
            <div class="segmented" id="voiceMode">
              <button type="button" data-voice-mode="app" class="${
                voiceMode === "app" ? "is-active" : ""
              }">Voz de la app</button>
              <button type="button" data-voice-mode="device" class="${
                voiceMode === "device" ? "is-active" : ""
              }">Voz del dispositivo</button>
            </div>
          </div>

          <div class="setting-row">
            <label class="setting-label" for="voiceSelect">
              <strong>Elegir voz del dispositivo</strong>
              <span>${
                voices.length
                  ? `${voices.length} voces en español encontradas`
                  : "No se encontraron voces en español en este navegador"
              }</span>
            </label>
            <select class="select-input" id="voiceSelect" ${
              voiceMode === "device" ? "" : "disabled"
            }>
              <option value="">Automática (español)</option>
              ${voices
                .map(
                  (voice) =>
                    `<option value="${esc(voice.voiceURI)}" ${
                      voice.voiceURI === state.settings.voiceURI ? "selected" : ""
                    }>${esc(voice.name)} · ${esc(voice.lang)}</option>`
                )
                .join("")}
            </select>
          </div>

          <div class="setting-row">
            <label class="setting-label" for="rateRange">
              <strong>Velocidad de la voz</strong>
              <span>Más lenta puede ayudar al principio</span>
            </label>
            <div class="range-wrap">
              <input id="rateRange" type="range" min="0.8" max="1.2" step="0.05"
                value="${Number(state.settings.rate).toFixed(2)}" aria-label="Velocidad de la voz" />
              <span class="range-value" id="rateLabel">${Number(state.settings.rate).toFixed(2)}×</span>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-label">
              <strong>Tipo de letra</strong>
              <span>Puedes empezar con mayúsculas</span>
            </div>
            <div class="segmented" id="caseMode">
              <button type="button" data-case="lower" class="${
                state.settings.uppercase ? "" : "is-active"
              }">minúscula</button>
              <button type="button" data-case="upper" class="${
                state.settings.uppercase ? "is-active" : ""
              }">MAYÚSCULA</button>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-label">
              <strong>Sonidos de los juegos</strong>
              <span>Campanitas y efectos de acierto</span>
            </div>
            <button class="switch" id="sfxToggle" type="button" role="switch"
              aria-pressed="${state.settings.sfx ? "true" : "false"}"
              aria-label="Activar o desactivar sonidos de los juegos"></button>
          </div>

          <div class="setting-row">
            <div class="setting-label">
              <strong>Preguntas de comprensión</strong>
              <span>Después de leer una frase, preguntar qué entendió</span>
            </div>
            <button class="switch" id="compToggle" type="button" role="switch"
              aria-pressed="${state.settings.comprehension ? "true" : "false"}"
              aria-label="Activar o desactivar preguntas de comprensión"></button>
          </div>

          <div class="setting-actions">
            <button class="btn btn--soft" id="testVoice">🔊 Probar voz</button>
          </div>
        </div>

        <div class="settings-card">
          <h2>Jugar sin internet</h2>
          <p>Guarda los 355 sonidos en este dispositivo. Así la app funciona completa sin conexión, por ejemplo en el coche.</p>
          <div class="setting-actions">
            <button class="btn btn--soft" id="downloadAudio">⬇️ Descargar todos los sonidos</button>
          </div>
          <p class="backup-note" id="audioPackNote" role="status">Comprobando sonidos…</p>
        </div>

        <div class="settings-card">
          <h2 id="progressTitle">Progreso de ${esc(state.name)}</h2>
          <div class="stats-row stats-row--five">
            <div class="stat-card"><strong>${state.stars}</strong><span>Estrellas</span></div>
            <div class="stat-card"><strong>${state.practicedSyllables.length}</strong><span>Sílabas</span></div>
            <div class="stat-card"><strong>${state.learnedWords.length}</strong><span>Palabras</span></div>
            <div class="stat-card"><strong>${state.readPhrases.length}</strong><span>Frases</span></div>
            <div class="stat-card"><strong>${masteredComp}</strong><span>Comprensión</span></div>
          </div>
          <p class="explore-count">
            Dominadas: <strong>${masteredSyllables}</strong> sílabas ·
            <strong>${masteredWords}</strong> palabras ·
            <strong>${masteredPhrases}</strong> frases.
          </p>
          <p class="explore-count">Premios conseguidos: <strong>${stickerCount}</strong> de ${D.stickers.length}.</p>
        </div>

        <div class="settings-card">
          <h2>Consejos para acompañar</h2>
          <ul class="tips-list">
            <li>Jueguen 10 minutos al día. Es mejor poco y seguido que mucho de una vez.</li>
            <li>Celebren el esfuerzo y las ganas, no solo los aciertos.</li>
            <li>Dejen que repita la sílaba o la palabra las veces que quiera.</li>
            <li>Señalen las letras con el dedo mientras escuchan el sonido.</li>
            <li>Si se frustra, cambien de juego o hagan una pausa. Aprender debe sentirse bien.</li>
          </ul>
        </div>

        <div class="settings-card">
          <h2>Guardar una copia</h2>
          <p>Descarga el progreso en un archivo para guardarlo o pasarlo a otro navegador. La copia no sale de tu dispositivo.</p>
          <div class="setting-actions">
            <button class="btn btn--soft" id="exportBtn">⬇️ Descargar copia</button>
            <button class="btn btn--ghost" id="importBtn">⬆️ Restaurar copia</button>
          </div>
          <input type="file" id="importInput" accept="application/json,.json" hidden />
          <p class="backup-note" id="backupNote" role="status">Copia de seguridad local, sin internet.</p>
        </div>

        <div class="settings-card danger-zone">
          <h2>Borrar progreso</h2>
          <p>Empieza de cero con las estrellas, las palabras y los premios.</p>
          <button class="btn btn--danger" id="resetBtn">🧹 Borrar todo el progreso</button>
        </div>

        <div class="vowel-game-cta">
          <button class="btn btn--sun" data-nav="/">🏠 Volver a jugar</button>
        </div>
      </section>
    `;

    const nameInput = document.getElementById("nameInput");
    function syncProgressTitle() {
      const title = document.getElementById("progressTitle");
      if (title) title.textContent = `Progreso de ${cleanName(state.name)}`;
    }

    nameInput.addEventListener("input", () => {
      state.name = nameInput.value.slice(0, MAX_NAME);
      saveState();
      syncProgressTitle();
    });
    nameInput.addEventListener("blur", () => {
      state.name = cleanName(nameInput.value);
      nameInput.value = state.name;
      saveState();
      syncProgressTitle();
    });

    document.getElementById("voiceMode").addEventListener("click", (event) => {
      const button = event.target.closest("[data-voice-mode]");
      if (!button) return;
      state.settings.voice = button.dataset.voiceMode;
      saveState();
      applySettings();
      AE.sfx("click");
      renderSettings();
    });

    const voiceSelect = document.getElementById("voiceSelect");
    voiceSelect.addEventListener("change", () => {
      state.settings.voiceURI = voiceSelect.value;
      state.settings.voice = "device";
      saveState();
      applySettings();
      AE.sfx("click");
    });

    document.getElementById("testVoice").addEventListener("click", () => {
      AE.sfx("click");
      say(D.speech.misc.testVoice);
    });

    const rateRange = document.getElementById("rateRange");
    rateRange.addEventListener("input", () => {
      state.settings.rate = Number(rateRange.value);
      document.getElementById("rateLabel").textContent = `${Number(rateRange.value).toFixed(2)}×`;
      saveState();
      applySettings();
    });

    document.getElementById("caseMode").addEventListener("click", (event) => {
      const button = event.target.closest("[data-case]");
      if (!button) return;
      state.settings.uppercase = button.dataset.case === "upper";
      saveState();
      applySettings();
      AE.sfx("click");
      document.querySelectorAll("[data-case]").forEach((item) => {
        item.classList.toggle(
          "is-active",
          (item.dataset.case === "upper") === state.settings.uppercase
        );
      });
    });

    const sfxToggle = document.getElementById("sfxToggle");
    sfxToggle.addEventListener("click", () => {
      state.settings.sfx = !state.settings.sfx;
      sfxToggle.setAttribute("aria-pressed", String(state.settings.sfx));
      saveState();
      applySettings();
      if (state.settings.sfx) AE.sfx("correct");
    });

    const compToggle = document.getElementById("compToggle");
    compToggle.addEventListener("click", () => {
      state.settings.comprehension = !state.settings.comprehension;
      compToggle.setAttribute(
        "aria-pressed",
        String(state.settings.comprehension)
      );
      saveState();
      AE.sfx("click");
    });

    document.getElementById("exportBtn").addEventListener("click", () => {
      exportProgress();
    });

    const importInput = document.getElementById("importInput");
    document.getElementById("importBtn").addEventListener("click", () => {
      AE.sfx("click");
      importInput.click();
    });
    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      importInput.value = "";
      if (file) await importProgressFile(file);
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      AE.sfx("click");
      confirmReset();
    });

    document.getElementById("downloadAudio").addEventListener("click", () => {
      AE.sfx("click");
      downloadAudioPack();
    });

    refreshAudioPackNote();

    if (!voices.length) {
      window.setTimeout(() => {
        if (!document.getElementById("voiceSelect")) return;
        const available = AE.getVoices();
        if (!available.length) return;
        renderSettings();
      }, 900);
    }
  }

  /* Eventos globales --------------------------------------------- */
  document.addEventListener("pointerdown", () => AE.unlock(), { once: true, capture: true });

  document.addEventListener("click", (event) => {
    const speakTarget = event.target.closest("[data-speak]");
    if (speakTarget) {
      event.preventDefault();
      AE.sfx("click");
      say(speakTarget.dataset.speak);
      return;
    }
    const navTarget = event.target.closest("[data-nav]");
    if (navTarget) {
      event.preventDefault();
      AE.sfx("click");
      navigate(navTarget.dataset.nav || "/");
    }
  });

  window.addEventListener("hashchange", render);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) AE.stop();
  });

  applySettings();
  render();
})();
