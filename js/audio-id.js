/* Identificador estable y seguro para los archivos de audio.
   Se usa tanto en el navegador como en el generador de audio. */
(function (root) {
  "use strict";

  function audioId(text) {
    const source = String(text);
    const plain = source
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42);

    let hash = 5381;
    for (let i = 0; i < source.length; i += 1) {
      hash = ((hash << 5) + hash) ^ source.charCodeAt(i);
    }

    const slug = plain || "clip";
    return `${slug}-${(hash >>> 0).toString(36)}`;
  }

  root.audioId = audioId;
  if (typeof module !== "undefined" && module.exports) module.exports = { audioId };
})(typeof window !== "undefined" ? window : globalThis);
