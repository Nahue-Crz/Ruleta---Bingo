/* Bingo local de Party Spin. No necesita servidor ni sincronización. */
(() => {
  "use strict";

  const STORAGE_KEY = "party-spin:bingo:v1";
  const LETTERS = ["B", "I", "N", "G", "O"];
  let state;
  let elements;
  let initialized = false;
  let completedLines = new Set();
  let cardWasFull = false;

  function randomIndex(length) {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const limit = Math.floor(0x100000000 / length) * length;
      const sample = new Uint32Array(1);
      do {
        window.crypto.getRandomValues(sample);
      } while (sample[0] >= limit);
      return sample[0] % length;
    }
    return Math.floor(Math.random() * length);
  }

  function shuffle(values) {
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1);
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }

  // El cartón grande respeta los cinco rangos clásicos y deja libre el centro.
  function makeCard(size) {
    if (size === 3) {
      return shuffle(Array.from({ length: 75 }, (_, i) => i + 1)).slice(0, 9);
    }

    const columns = LETTERS.map((_, column) => {
      const start = column * 15 + 1;
      return shuffle(Array.from({ length: 15 }, (_, i) => start + i)).slice(0, 5);
    });
    const card = [];
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        card.push(row === 2 && column === 2 ? null : columns[column][row]);
      }
    }
    return card;
  }

  function freshState(size = 5) {
    return { size, card: makeCard(size), marks: [], drawn: [] };
  }

  // Nunca usamos datos guardados sin validar forma, unicidad y rangos.
  function validState(value) {
    if (!value || typeof value !== "object" || ![3, 5].includes(value.size)) return false;
    const { size, card, marks, drawn } = value;
    if (!Array.isArray(card) || card.length !== size * size ||
        !Array.isArray(marks) || !Array.isArray(drawn)) return false;

    const numbers = card.filter((number) => number !== null);
    if (numbers.length !== (size === 5 ? 24 : 9) ||
        numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 75) ||
        new Set(numbers).size !== numbers.length) return false;

    if (size === 5) {
      if (card[12] !== null) return false;
      for (let index = 0; index < card.length; index += 1) {
        if (index === 12) continue;
        const column = index % 5;
        if (card[index] < column * 15 + 1 || card[index] > column * 15 + 15) return false;
      }
    } else if (card.includes(null)) {
      return false;
    }

    if (marks.some((index) => !Number.isInteger(index) || index < 0 ||
        index >= card.length || card[index] === null) ||
        new Set(marks).size !== marks.length) return false;
    if (drawn.length > 75 ||
        drawn.some((number) => !Number.isInteger(number) || number < 1 || number > 75) ||
        new Set(drawn).size !== drawn.length) return false;
    return true;
  }

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return validState(stored) ? stored : freshState();
    } catch {
      return freshState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      window.PartySpinToast?.("No se pudo guardar la partida en este navegador.");
    }
  }

  function numberLabel(number) {
    return `${LETTERS[Math.floor((number - 1) / 15)]} ${number}`;
  }

  function marked(index) {
    return state.card[index] === null || state.marks.includes(index);
  }

  function lineIndexes() {
    const size = state.size;
    const lines = [];
    for (let row = 0; row < size; row += 1) {
      lines.push({ id: `row-${row}`, cells: Array.from({ length: size }, (_, col) => row * size + col) });
    }
    for (let col = 0; col < size; col += 1) {
      lines.push({ id: `col-${col}`, cells: Array.from({ length: size }, (_, row) => row * size + col) });
    }
    lines.push({ id: "diag-main", cells: Array.from({ length: size }, (_, i) => i * size + i) });
    lines.push({ id: "diag-other", cells: Array.from({ length: size }, (_, i) => i * size + size - 1 - i) });
    return lines;
  }

  function getAchievement() {
    const lines = new Set(lineIndexes().filter((line) => line.cells.every(marked)).map((line) => line.id));
    const full = state.card.every((_, index) => marked(index));
    return { lines, full };
  }

  function renderCard() {
    const grid = elements.card;
    grid.replaceChildren();
    grid.className = `bingo-grid bingo-grid--${state.size}`;
    grid.style.setProperty("--bingo-columns", state.size);

    if (state.size === 5) {
      LETTERS.forEach((letter) => {
        const heading = document.createElement("span");
        heading.className = "bingo-column-header";
        heading.textContent = letter;
        grid.append(heading);
      });
    }

    state.card.forEach((number, index) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "bingo-cell";
      cell.dataset.index = String(index);
      if (number === null) {
        cell.classList.add("bingo-cell--free", "is-marked");
        cell.textContent = "★";
        cell.setAttribute("aria-label", "Casilla libre");
        cell.setAttribute("aria-pressed", "true");
        cell.disabled = true;
      } else {
        const isMarked = marked(index);
        cell.textContent = String(number);
        cell.classList.toggle("is-marked", isMarked);
        cell.setAttribute("aria-label", `${isMarked ? "Desmarcar" : "Marcar"} número ${number}`);
        cell.setAttribute("aria-pressed", String(isMarked));
      }
      grid.append(cell);
    });
  }

  function renderHost() {
    const last = state.drawn.at(-1);
    elements.lastNumber.textContent = last === undefined ? "—" : numberLabel(last);
    elements.drawnCount.textContent = `${state.drawn.length} / 75`;
    elements.drawButton.disabled = state.drawn.length === 75;
    elements.drawButton.textContent = state.drawn.length === 75 ? "Todos sorteados" : "Sortear número";
    elements.drawnList.replaceChildren();
    if (state.drawn.length === 0) {
      const empty = document.createElement("span");
      empty.className = "drawn-empty";
      empty.textContent = "Todavía no salió ningún número.";
      elements.drawnList.append(empty);
      return;
    }
    [...state.drawn].reverse().forEach((number) => {
      const ball = document.createElement("span");
      ball.className = "drawn-ball";
      ball.textContent = numberLabel(number);
      elements.drawnList.append(ball);
    });
  }

  function renderAchievement(announce = false) {
    const current = getAchievement();
    const newlyCompleted = [...current.lines].filter((line) => !completedLines.has(line));
    const newlyFull = current.full && !cardWasFull;
    if (current.full) {
      elements.status.textContent = "¡BINGO! Cartón completo 🎉";
      elements.status.className = "bingo-status is-winner";
    } else if (current.lines.size) {
      elements.status.textContent = `${current.lines.size} ${current.lines.size === 1 ? "línea completa" : "líneas completas"} ✨`;
      elements.status.className = "bingo-status is-line";
    } else {
      elements.status.textContent = "Marcá los números de tu cartón para completar una línea.";
      elements.status.className = "bingo-status";
    }
    const markedCount = state.marks.length + (state.size === 5 ? 1 : 0);
    elements.progress.textContent = `${markedCount} de ${state.card.length} casillas marcadas`;
    if (announce && (newlyCompleted.length || newlyFull)) {
      window.PartySpinCelebrate?.();
      window.PartySpinToast?.(newlyFull ? "¡BINGO! Completaste el cartón." : "¡Completaste una línea!");
    }
    completedLines = current.lines;
    cardWasFull = current.full;
  }

  function toggleCell(event) {
    const button = event.target.closest("button[data-index]");
    if (!button || !elements.card.contains(button)) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= state.card.length || state.card[index] === null) return;
    const markedAt = state.marks.indexOf(index);
    if (markedAt === -1) state.marks.push(index);
    else state.marks.splice(markedAt, 1);
    save();
    const isMarked = marked(index);
    button.classList.toggle("is-marked", isMarked);
    button.setAttribute("aria-pressed", String(isMarked));
    button.setAttribute("aria-label", `${isMarked ? "Desmarcar" : "Marcar"} número ${state.card[index]}`);
    renderAchievement(true);
  }

  function drawNumber() {
    if (state.drawn.length === 75) return;
    const drawn = new Set(state.drawn);
    const remaining = Array.from({ length: 75 }, (_, i) => i + 1).filter((number) => !drawn.has(number));
    const number = remaining[randomIndex(remaining.length)];
    state.drawn.push(number);
    save();
    renderHost();
    window.PartySpinToast?.(`Salió ${numberLabel(number)}`);
  }

  function newCard(size) {
    if (state.marks.length && !window.confirm("¿Generar otro cartón? Se perderán las marcas del cartón actual.")) {
      elements.size.value = String(state.size);
      return;
    }
    state.size = size;
    state.card = makeCard(size);
    state.marks = [];
    completedLines = new Set();
    cardWasFull = false;
    save();
    renderCard();
    renderAchievement();
    window.PartySpinToast?.("Nuevo cartón generado.");
  }

  function resetGame() {
    if (!window.confirm("¿Reiniciar la partida? Se borrarán los números sorteados y las marcas del cartón.")) return;
    state.drawn = [];
    state.marks = [];
    completedLines = new Set();
    cardWasFull = false;
    save();
    renderCard();
    renderHost();
    renderAchievement();
    window.PartySpinToast?.("Partida reiniciada.");
  }

  function init() {
    if (initialized) return;
    elements = {
      size: document.getElementById("bingo-size"),
      newCard: document.getElementById("new-card"),
      card: document.getElementById("bingo-card"),
      drawButton: document.getElementById("draw-number"),
      lastNumber: document.getElementById("last-number"),
      drawnList: document.getElementById("drawn-list"),
      drawnCount: document.getElementById("drawn-count"),
      resetButton: document.getElementById("reset-game"),
      status: document.getElementById("bingo-status"),
      progress: document.getElementById("bingo-progress")
    };
    if (Object.values(elements).some((element) => !element)) return;
    initialized = true;
    state = load();
    elements.size.value = String(state.size);
    renderCard();
    renderHost();
    renderAchievement();

    elements.card.addEventListener("click", toggleCell);
    elements.drawButton.addEventListener("click", drawNumber);
    elements.newCard.addEventListener("click", () => newCard(Number(elements.size.value)));
    elements.size.addEventListener("change", () => newCard(Number(elements.size.value)));
    elements.resetButton.addEventListener("click", resetGame);
  }

  window.PartySpinBingo = { init };
})();
