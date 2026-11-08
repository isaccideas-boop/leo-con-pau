/* ============================================================
   Pequeños efectos visuales: confeti, premios y destellos.
   ============================================================ */
(function (root) {
  "use strict";

  const canvas = document.getElementById("confetti");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const layer = document.getElementById("fx-layer");
  const reduceMotion = root.matchMedia
    ? root.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  const COLORS = ["#FF6B6B", "#FFB020", "#20C997", "#4D96FF", "#845EF7", "#F06595", "#FFD43B"];
  const EMOJIS = ["⭐", "✨", "💜", "💛", "💚", "🩵"];

  let particles = [];
  let frame = null;
  let dpr = 1;

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, root.devicePixelRatio || 1);
    canvas.width = Math.floor(root.innerWidth * dpr);
    canvas.height = Math.floor(root.innerHeight * dpr);
    canvas.style.width = `${root.innerWidth}px`;
    canvas.style.height = `${root.innerHeight}px`;
  }

  function draw() {
    if (!ctx || !canvas) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, root.innerWidth, root.innerHeight);

    particles = particles.filter((p) => p.life > 0 && p.y < root.innerHeight + 60);
    for (const p of particles) {
      p.life -= 1;
      p.vy += p.gravity;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 24));
      if (p.emoji) {
        ctx.font = `${p.size * 2.2}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
      }
      ctx.restore();
    }

    if (particles.length) {
      frame = requestAnimationFrame(draw);
    } else {
      frame = null;
      ctx.clearRect(0, 0, root.innerWidth, root.innerHeight);
    }
  }

  function confetti(options = {}) {
    if (!ctx || reduceMotion.matches) return;
    if (!frame) resize();
    const count = options.count || 80;
    const originX = (options.x ?? 0.5) * root.innerWidth;
    const originY = (options.y ?? 0.35) * root.innerHeight;
    const power = options.power || 11;

    for (let i = 0; i < count; i += 1) {
      const angle = (Math.random() * Math.PI) - Math.PI / 2;
      const speed = power * (0.45 + Math.random());
      const useEmoji = Math.random() < 0.16;
      particles.push({
        x: originX + (Math.random() - 0.5) * 90,
        y: originY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed - Math.random() * 5,
        gravity: 0.24 + Math.random() * 0.12,
        size: 6 + Math.random() * 9,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        emoji: useEmoji ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : "",
        round: Math.random() < 0.35,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25,
        life: 80 + Math.random() * 50,
      });
    }
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function reward(text, emoji = "⭐") {
    if (!layer) return;
    const node = document.createElement("div");
    node.className = "reward-toast";
    node.innerHTML = `<span class="reward-toast__emoji" aria-hidden="true">${emoji}</span><span></span>`;
    node.lastElementChild.textContent = text;
    layer.appendChild(node);
    requestAnimationFrame(() => node.classList.add("is-visible"));
    setTimeout(() => {
      node.classList.remove("is-visible");
      setTimeout(() => node.remove(), 380);
    }, 2600);
  }

  function sparkleAt(target, emoji = "✨") {
    if (!layer || !target || reduceMotion.matches) return;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < 5; i += 1) {
      const bit = document.createElement("span");
      bit.className = "sparkle-bit";
      bit.textContent = emoji;
      bit.style.left = `${cx}px`;
      bit.style.top = `${cy}px`;
      bit.style.setProperty("--dx", `${(Math.random() - 0.5) * 150}px`);
      bit.style.setProperty("--dy", `${-30 - Math.random() * 90}px`);
      bit.style.animationDelay = `${i * 30}ms`;
      layer.appendChild(bit);
      setTimeout(() => bit.remove(), 950);
    }
  }

  function celebrate(text, options = {}) {
    confetti({ count: options.count || 100, y: options.y ?? 0.32 });
    if (text) reward(text, options.emoji || "⭐");
  }

  root.FX = { confetti, reward, sparkleAt, celebrate };

  if (root.addEventListener) {
    root.addEventListener("resize", () => {
      if (canvas) {
        resize();
        ctx?.clearRect(0, 0, root.innerWidth, root.innerHeight);
      }
    });
  }
  resize();
})(typeof window !== "undefined" ? window : globalThis);
