/* Navegación e integración de ruletas, configuración y resultados. */
(() => {
  "use strict";

  const storage = window.PartySpinStorage;
  const roulette = window.PartySpinRoulette;
  const config = storage.loadConfig();
  let history = storage.loadHistory();
  const current = { a: null, b: null };
  const screens = {
    home: document.getElementById("home-screen"),
    roulette: document.getElementById("roulette-screen"),
    bingo: document.getElementById("bingo-screen")
  };
  const dialog = document.getElementById("settings-dialog");
  const toastElement = document.getElementById("toast");
  const celebrationLayer = document.getElementById("celebration-layer");
  const resultElements = {
    card: document.getElementById("result-card"),
    empty: document.getElementById("result-empty"),
    details: document.getElementById("result-details"),
    color: document.getElementById("result-color"),
    category: document.getElementById("result-category"),
    instruction: document.getElementById("result-instruction")
  };
  let toastTimer;
  let audioContext;
  let bothInProgress = false;
  let celebrationToken = 0;

  function toast(message) {
    toastElement.textContent = message;
    toastElement.hidden = false;
    toastElement.classList.remove("is-visible");
    void toastElement.offsetWidth;
    toastElement.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastElement.hidden = true; }, 3300);
  }
  window.PartySpinToast = toast;

  function resumeAudio() {
    if (!config.soundEnabled) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audioContext ||= new Context();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    } catch (_) { /* El juego sigue funcionando si el navegador bloquea audio. */ }
  }

  function tone(frequency, duration = 0.06, volume = 0.04) {
    if (!config.soundEnabled || !audioContext || audioContext.state !== "running") return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function celebrate() {
    if (config.soundEnabled) {
      resumeAudio();
      [523, 659, 784, 1047].forEach((note, index) => setTimeout(() => tone(note, 0.2, 0.06), index * 110));
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ff6f8d", "#fbd567", "#6ae8da", "#a68bff", "#ffffff"];
    const token = ++celebrationToken;
    celebrationLayer.replaceChildren();
    for (let index = 0; index < 32; index++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--x", `${Math.random() * 100}vw`);
      piece.style.setProperty("--delay", `${Math.random() * 0.5}s`);
      piece.style.setProperty("--duration", `${1.6 + Math.random() * 1.1}s`);
      piece.style.setProperty("--color", colors[index % colors.length]);
      piece.style.setProperty("--turn", `${Math.random() * 900 - 450}deg`);
      celebrationLayer.append(piece);
    }
    setTimeout(() => { if (token === celebrationToken) celebrationLayer.replaceChildren(); }, 3000);
  }
  window.PartySpinCelebrate = celebrate;

  const wheels = {
    a: new roulette.Wheel(document.getElementById("wheel-a"), config.wheels.a.sectors, {
      onTick: () => tone(660, 0.035, 0.018),
      onStateChange: updateSpinButtons
    }),
    b: new roulette.Wheel(document.getElementById("wheel-b"), config.wheels.b.sectors, {
      onTick: () => tone(540, 0.035, 0.018),
      onStateChange: updateSpinButtons
    })
  };

  function showScreen(name) {
    if (!screens[name]) return;
    for (const [key, screen] of Object.entries(screens)) screen.hidden = key !== name;
    document.querySelectorAll("[data-screen]").forEach((button) => {
      const selected = button.dataset.screen === name;
      button.classList.toggle("is-active", selected);
      if (button.classList.contains("nav-link")) {
        if (selected) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }
    });
    window.scrollTo(0, 0);
  }

  function updateSpinButtons() {
    const spinning = wheels.a.spinning || wheels.b.spinning;
    document.getElementById("spin-a").disabled = wheels.a.spinning || bothInProgress;
    document.getElementById("center-a").disabled = wheels.a.spinning || bothInProgress;
    document.getElementById("spin-b").disabled = wheels.b.spinning || bothInProgress;
    document.getElementById("center-b").disabled = wheels.b.spinning || bothInProgress;
    document.getElementById("spin-both").disabled = spinning || bothInProgress;
    document.getElementById("open-settings").disabled = spinning || bothInProgress;
    document.getElementById("reset-results").disabled = spinning || bothInProgress || !(current.a || current.b);
  }

  function setWheelStatus(key, message) {
    document.getElementById(`wheel-status-${key}`).textContent = message;
  }

  function resultSentence() {
    if (!current.a || !current.b) return "";
    const usualItems = {
      comida: "comida", bebida: "una bebida", golosina: "una golosina",
      chocolate: "chocolate", galletitas: "galletitas", postre: "un postre", snack: "un snack"
    };
    const item = usualItems[current.b.label.toLowerCase()] || `algo de «${current.b.label}»`;
    return `Tenés que llevar ${item} de color ${current.a.label.toLowerCase()}.`;
  }

  function resultText() {
    if (!current.a && !current.b) return "";
    const lines = ["🎉 ¡TE TOCÓ!"];
    if (current.a) lines.push(`Color: ${current.a.label}`);
    if (current.b) lines.push(`Categoría: ${current.b.emoji ? current.b.emoji + " " : ""}${current.b.label}`);
    if (current.a && current.b) lines.push(resultSentence());
    return lines.join("\n");
  }

  function renderResultItem(element, label, sector, isColor) {
    element.replaceChildren();
    const eyebrow = document.createElement("span");
    eyebrow.className = "result-item-label";
    eyebrow.textContent = label;
    const value = document.createElement("strong");
    if (isColor) {
      const swatch = document.createElement("span");
      swatch.className = "result-color-swatch";
      swatch.style.backgroundColor = sector.color;
      swatch.setAttribute("aria-hidden", "true");
      value.append(swatch);
    } else if (sector.emoji) {
      const emoji = document.createElement("span");
      emoji.textContent = sector.emoji + " ";
      emoji.setAttribute("aria-hidden", "true");
      value.append(emoji);
    }
    value.append(document.createTextNode(sector.label));
    element.append(eyebrow, value);
  }

  function renderResult() {
    const hasResult = Boolean(current.a || current.b);
    resultElements.empty.hidden = hasResult;
    resultElements.details.hidden = !hasResult;
    resultElements.color.hidden = !current.a;
    resultElements.category.hidden = !current.b;
    resultElements.instruction.hidden = !(current.a && current.b);
    if (current.a) renderResultItem(resultElements.color, "COLOR", current.a, true);
    if (current.b) renderResultItem(resultElements.category, "CATEGORÍA", current.b, false);
    if (current.a && current.b) resultElements.instruction.textContent = resultSentence();
    for (const id of ["copy-result", "share-result", "reset-results"]) {
      document.getElementById(id).disabled = !hasResult;
    }
    resultElements.card.classList.toggle("has-result", hasResult);
  }

  function recordHistory() {
    history.unshift({ date: new Date().toISOString(), color: current.a ? { ...current.a } : null,
      category: current.b ? { ...current.b } : null });
    history = history.slice(0, 50);
    if (!storage.saveHistory(history)) toast("El historial no se pudo guardar en este navegador.");
    renderHistory();
  }

  function renderHistory() {
    const list = document.getElementById("history-list");
    list.replaceChildren();
    if (!history.length) {
      const empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = "Todavía no hay giros guardados.";
      list.append(empty);
    } else {
      history.forEach((entry) => {
        const item = document.createElement("li");
        const date = document.createElement("time");
        date.dateTime = entry.date;
        const parsed = new Date(entry.date);
        date.textContent = Number.isNaN(parsed.getTime()) ? "Sorteo" :
          new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
        const value = document.createElement("span");
        value.textContent = [entry.color?.label, entry.category &&
          `${entry.category.emoji ? entry.category.emoji + " " : ""}${entry.category.label}`].filter(Boolean).join(" + ");
        item.append(date, value);
        list.append(item);
      });
    }
    document.getElementById("clear-history").disabled = history.length === 0;
  }

  // Cada giro guarda el resultado que queda visible, sin bloquear a la otra ruleta.
  async function spinOne(key) {
    if (bothInProgress || wheels[key].spinning) return;
    resumeAudio();
    current[key] = null;
    renderResult();
    setWheelStatus(key, "Girando...");
    const outcome = await wheels[key].spin();
    if (!outcome) return;
    current[key] = outcome.sector;
    setWheelStatus(key, `${outcome.sector.emoji ? outcome.sector.emoji + " " : ""}${outcome.sector.label}`);
    renderResult();
    recordHistory();
    celebrate();
  }

  async function spinBoth() {
    if (bothInProgress || wheels.a.spinning || wheels.b.spinning) return;
    bothInProgress = true;
    current.a = null;
    current.b = null;
    renderResult();
    setWheelStatus("a", "Girando...");
    setWheelStatus("b", "Girando...");
    resumeAudio();
    const [color, category] = await Promise.all([wheels.a.spin(), wheels.b.spin()]);
    current.a = color.sector;
    current.b = category.sector;
    bothInProgress = false;
    updateSpinButtons();
    setWheelStatus("a", color.sector.label);
    setWheelStatus("b", `${category.sector.emoji ? category.sector.emoji + " " : ""}${category.sector.label}`);
    renderResult();
    recordHistory();
    celebrate();
  }

  function persistConfig() {
    if (!storage.saveConfig(config)) toast("La configuración cambió, pero no se pudo guardar en este navegador.");
  }

  function refreshWheel(key) {
    wheels[key].setSectors(config.wheels[key].sectors);
    document.getElementById(`center-${key}`).textContent = config.wheels[key].centerText;
    current[key] = null;
    setWheelStatus(key, "Lista para girar");
    renderResult();
    persistConfig();
  }

  function sectorRow(key, sector, index) {
    const row = document.createElement("div");
    row.className = "sector-row";
    row.dataset.index = String(index);
    const color = document.createElement("input");
    color.type = "color";
    color.value = sector.color;
    color.className = "sector-color";
    color.title = "Color de fondo";
    color.setAttribute("aria-label", `Color del sector ${index + 1}`);
    const text = document.createElement("input");
    text.type = "text";
    text.value = sector.label;
    text.maxLength = 32;
    text.className = "sector-text text-input";
    text.setAttribute("aria-label", `Texto del sector ${index + 1}`);
    row.append(color);
    if (key === "b") {
      const emoji = document.createElement("input");
      emoji.type = "text";
      emoji.value = sector.emoji || "";
      emoji.maxLength = 16;
      emoji.className = "sector-emoji text-input";
      emoji.setAttribute("aria-label", `Emoji del sector ${index + 1}`);
      emoji.placeholder = "🙂";
      row.append(emoji);
    }
    row.append(text);
    for (const [action, glyph, description] of [
      ["up", "↑", "Subir"], ["down", "↓", "Bajar"], ["delete", "✕", "Eliminar"]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `sector-${action === "delete" ? "delete" : "move"}`;
      button.dataset.action = action;
      button.textContent = glyph;
      button.title = `${description} sector`;
      button.setAttribute("aria-label", `${description} sector ${index + 1}`);
      button.disabled = (action === "up" && index === 0) ||
        (action === "down" && index === config.wheels[key].sectors.length - 1) ||
        (action === "delete" && config.wheels[key].sectors.length <= 2);
      row.append(button);
    }
    return row;
  }

  function renderSectorList(key) {
    const container = document.getElementById(`sectors-${key}`);
    container.replaceChildren(...config.wheels[key].sectors.map((sector, index) => sectorRow(key, sector, index)));
    document.getElementById(`add-sector-${key}`).disabled = config.wheels[key].sectors.length >= 24;
  }

  function renderSettings() {
    document.getElementById("sound-enabled").checked = config.soundEnabled;
    for (const key of ["a", "b"]) {
      document.getElementById(`center-text-${key}`).value = config.wheels[key].centerText;
      document.getElementById(`center-${key}`).textContent = config.wheels[key].centerText;
      renderSectorList(key);
    }
  }

  function addSector(key) {
    if (config.wheels[key].sectors.length >= 24) return toast("La ruleta admite hasta 24 sectores.");
    const palette = ["#ef6b81", "#39b3be", "#a47bef", "#efad50", "#70bf80"];
    const sector = { label: "Nuevo sector", color: palette[config.wheels[key].sectors.length % palette.length] };
    if (key === "b") sector.emoji = "✨";
    config.wheels[key].sectors.push(sector);
    renderSectorList(key);
    refreshWheel(key);
    document.querySelector(`#sectors-${key} .sector-row:last-child .sector-text`)?.focus();
  }

  function onSectorInput(event) {
    const input = event.target;
    const row = input.closest(".sector-row");
    if (!row) return;
    const key = event.currentTarget.id.endsWith("-a") ? "a" : "b";
    const sector = config.wheels[key].sectors[Number(row.dataset.index)];
    if (!sector) return;
    if (input.classList.contains("sector-color")) sector.color = input.value;
    else if (input.classList.contains("sector-emoji")) {
      const emoji = Array.from(input.value).slice(0, 8).join("");
      input.value = emoji;
      sector.emoji = emoji;
    } else if (input.classList.contains("sector-text")) {
      if (!input.value.trim()) return;
      sector.label = input.value.trim();
    } else return;
    refreshWheel(key);
  }

  function onSectorClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = button.closest(".sector-row");
    const key = event.currentTarget.id.endsWith("-a") ? "a" : "b";
    const sectors = config.wheels[key].sectors;
    const index = Number(row.dataset.index);
    const action = button.dataset.action;
    if (action === "delete") {
      if (sectors.length <= 2) return toast("La ruleta necesita al menos dos sectores.");
      if (!window.confirm(`¿Eliminar el sector «${sectors[index].label}»?`)) return;
      sectors.splice(index, 1);
      toast("Sector eliminado.");
    } else {
      const target = index + (action === "up" ? -1 : 1);
      if (target < 0 || target >= sectors.length) return;
      [sectors[index], sectors[target]] = [sectors[target], sectors[index]];
    }
    renderSectorList(key);
    refreshWheel(key);
  }

  function openSettings() {
    if (wheels.a.spinning || wheels.b.spinning) return;
    renderSettings();
    dialog.showModal();
  }

  function exportConfig() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "party-spin-config.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast("Configuración exportada.");
  }

  async function importConfig(file) {
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error("El archivo es demasiado grande para una configuración.");
      const imported = storage.validateConfig(JSON.parse(await file.text()));
      if (!window.confirm("¿Importar esta configuración? Reemplazará tus ruletas y sonidos actuales.")) return;
      config.version = imported.version;
      config.soundEnabled = imported.soundEnabled;
      config.wheels = imported.wheels;
      renderSettings();
      refreshWheel("a");
      refreshWheel("b");
      toast("Configuración importada correctamente.");
    } catch (error) {
      toast(`No se pudo importar: ${error instanceof SyntaxError ? "el JSON no es válido." : error.message}`);
    } finally {
      document.getElementById("import-file").value = "";
    }
  }

  function restoreDefaults() {
    if (!window.confirm("¿Restaurar las dos ruletas y los sonidos a sus valores predeterminados?")) return;
    const defaults = storage.defaults();
    config.version = defaults.version;
    config.soundEnabled = defaults.soundEnabled;
    config.wheels = defaults.wheels;
    renderSettings();
    refreshWheel("a");
    refreshWheel("b");
    toast("Configuración restaurada.");
  }

  async function copyResult() {
    const text = resultText();
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else throw new Error("Clipboard API unavailable");
    } catch (_) {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      let success = false;
      try { success = document.execCommand("copy"); } catch (_) { /* Puede estar bloqueado. */ }
      field.remove();
      if (!success) return toast("No se pudo copiar. Seleccioná el resultado manualmente.");
    }
    toast("Resultado copiado.");
  }

  async function shareResult() {
    const text = resultText();
    if (!text) return;
    if (navigator.share) {
      try { await navigator.share({ title: "Party Spin", text }); }
      catch (error) { if (error.name !== "AbortError") toast("No se pudo compartir el resultado."); }
    } else {
      await copyResult();
      toast("Tu dispositivo no ofrece compartir acá. Copié el resultado para enviarlo.");
    }
  }

  document.querySelectorAll("[data-screen]").forEach((button) =>
    button.addEventListener("click", () => showScreen(button.dataset.screen)));
  document.getElementById("spin-a").addEventListener("click", () => spinOne("a"));
  document.getElementById("center-a").addEventListener("click", () => spinOne("a"));
  document.getElementById("spin-b").addEventListener("click", () => spinOne("b"));
  document.getElementById("center-b").addEventListener("click", () => spinOne("b"));
  document.getElementById("spin-both").addEventListener("click", spinBoth);
  document.getElementById("copy-result").addEventListener("click", copyResult);
  document.getElementById("share-result").addEventListener("click", shareResult);
  document.getElementById("reset-results").addEventListener("click", () => {
    current.a = null;
    current.b = null;
    setWheelStatus("a", "Lista para girar");
    setWheelStatus("b", "Lista para girar");
    renderResult();
    toast("Resultado reiniciado.");
  });
  document.getElementById("toggle-history").addEventListener("click", (event) => {
    const panel = document.getElementById("history-panel");
    panel.hidden = !panel.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
    event.currentTarget.textContent = panel.hidden ? "Ver historial" : "Ocultar historial";
  });
  document.getElementById("clear-history").addEventListener("click", () => {
    if (!history.length || !window.confirm("¿Borrar todo el historial de giros?")) return;
    history = [];
    storage.saveHistory(history);
    renderHistory();
    toast("Historial borrado.");
  });
  document.getElementById("open-settings").addEventListener("click", openSettings);
  document.getElementById("close-settings").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  document.getElementById("sound-enabled").addEventListener("change", (event) => {
    config.soundEnabled = event.target.checked;
    persistConfig();
    if (config.soundEnabled) { resumeAudio(); tone(780, 0.1); }
  });
  for (const key of ["a", "b"]) {
    const center = document.getElementById(`center-text-${key}`);
    center.addEventListener("input", () => {
      if (!center.value.trim()) return;
      config.wheels[key].centerText = center.value.trim();
      document.getElementById(`center-${key}`).textContent = config.wheels[key].centerText;
      persistConfig();
    });
    center.addEventListener("blur", () => { if (!center.value.trim()) center.value = config.wheels[key].centerText; });
    const list = document.getElementById(`sectors-${key}`);
    list.addEventListener("input", onSectorInput);
    list.addEventListener("click", onSectorClick);
    list.addEventListener("focusout", (event) => {
      if (event.target.classList.contains("sector-text") && !event.target.value.trim()) {
        const sector = config.wheels[key].sectors[Number(event.target.closest(".sector-row").dataset.index)];
        event.target.value = sector.label;
        toast("El texto del sector no puede quedar vacío.");
      }
    });
    document.getElementById(`add-sector-${key}`).addEventListener("click", () => addSector(key));
  }
  document.getElementById("export-config").addEventListener("click", exportConfig);
  document.getElementById("import-config").addEventListener("click", () => document.getElementById("import-file").click());
  document.getElementById("import-file").addEventListener("change", (event) => importConfig(event.target.files[0]));
  document.getElementById("restore-defaults").addEventListener("click", restoreDefaults);

  renderSettings();
  renderResult();
  renderHistory();
  updateSpinButtons();
  showScreen("home");
  window.PartySpinBingo.init();
})();
