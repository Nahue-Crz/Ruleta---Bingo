/* Dibujo, geometría y animación de una ruleta. El indicador siempre apunta hacia arriba. */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const SIZE = 600;
  const RADIUS = 286;

  function normalize(angle) {
    return ((angle % TAU) + TAU) % TAU;
  }

  // El sector 0 empieza arriba; esta función identifica lo que ve el indicador fijo.
  function indexAtPointer(rotation, count) {
    if (!Number.isInteger(count) || count < 1) throw new Error("Cantidad de sectores inválida.");
    return Math.floor(normalize(-rotation) / (TAU / count)) % count;
  }

  // Deja el centro exacto del sector elegido debajo del indicador después de varias vueltas.
  function targetRotation(currentRotation, targetIndex, count, turns) {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= count) {
      throw new Error("Sector de destino inválido.");
    }
    const desired = normalize(-(targetIndex + 0.5) * (TAU / count));
    const delta = normalize(desired - normalize(currentRotation));
    return currentRotation + turns * TAU + delta;
  }

  function randomIndex(count) {
    if (window.crypto && window.crypto.getRandomValues) {
      const sample = new Uint32Array(1);
      const limit = Math.floor(4294967296 / count) * count;
      do { window.crypto.getRandomValues(sample); } while (sample[0] >= limit);
      return sample[0] % count;
    }
    return Math.floor(Math.random() * count);
  }

  function contrastColor(hex) {
    const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = rgb.map((v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    return luminance > 0.38 ? "#171225" : "#ffffff";
  }

  class Wheel {
    constructor(canvas, sectors, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.sectors = sectors;
      this.rotation = 0;
      this.spinning = false;
      this.options = options;
      this.lastIndex = indexAtPointer(0, sectors.length);
      this.lastTickTime = 0;
      this.draw();
    }

    setSectors(sectors) {
      if (this.spinning) return false;
      this.sectors = sectors;
      this.rotation = 0;
      this.lastIndex = indexAtPointer(0, sectors.length);
      this.draw();
      return true;
    }

    draw() {
      const ctx = this.ctx;
      const count = this.sectors.length;
      const step = TAU / count;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate(this.rotation);

      for (let i = 0; i < count; i++) {
        const sector = this.sectors[i];
        const start = -Math.PI / 2 + i * step;
        const middle = start + step / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, RADIUS, start, start + step);
        ctx.closePath();
        ctx.fillStyle = sector.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(17, 13, 31, .58)";
        ctx.stroke();

        ctx.save();
        ctx.rotate(middle);
        ctx.translate(RADIUS * 0.63, 0);
        if (Math.cos(middle) < 0) ctx.rotate(Math.PI);
        ctx.fillStyle = contrastColor(sector.color);
        ctx.font = `800 ${count > 18 ? 18 : count > 12 ? 21 : 25}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = `${sector.emoji ? sector.emoji + " " : ""}${sector.label}`;
        ctx.fillText(label, 0, 0, RADIUS * 0.71);
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(0, 0, RADIUS + 1, 0, TAU);
      ctx.strokeStyle = "#f6eaff";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, RADIUS - 9, 0, TAU);
      ctx.strokeStyle = "rgba(255,255,255,.28)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    spin() {
      if (this.spinning) return Promise.resolve(null);
      this.spinning = true;
      this.options.onStateChange?.(true);
      const chosenIndex = randomIndex(this.sectors.length);
      const from = this.rotation;
      const turns = 6 + randomIndex(3);
      const to = targetRotation(from, chosenIndex, this.sectors.length, turns);
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const duration = reducedMotion ? 450 : 4400 + randomIndex(1201);
      const started = performance.now();
      this.lastIndex = indexAtPointer(from, this.sectors.length);
      this.lastTickTime = started;

      return new Promise((resolve) => {
        const frame = (now) => {
          const progress = Math.min((now - started) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          this.rotation = from + (to - from) * eased;
          this.draw();
          const index = indexAtPointer(this.rotation, this.sectors.length);
          if (index !== this.lastIndex && now - this.lastTickTime > 70) {
            this.lastIndex = index;
            this.lastTickTime = now;
            this.options.onTick?.();
          }
          if (progress < 1) {
            requestAnimationFrame(frame);
          } else {
            this.rotation = normalize(to);
            this.draw();
            const winnerIndex = indexAtPointer(this.rotation, this.sectors.length);
            this.spinning = false;
            this.options.onStateChange?.(false);
            resolve({ index: winnerIndex, sector: { ...this.sectors[winnerIndex] } });
          }
        };
        requestAnimationFrame(frame);
      });
    }
  }

  window.PartySpinRoulette = { Wheel, indexAtPointer, targetRotation, randomIndex, normalize };
})();
