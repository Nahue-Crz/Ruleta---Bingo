/* Configuración y resultados locales. Sin red ni dependencias externas. */
(function () {
  "use strict";

  const CONFIG_KEY = "party-spin:config:v1";
  const HISTORY_KEY = "party-spin:history:v1";
  const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
  const defaults = {
    version: 1,
    soundEnabled: true,
    wheels: {
      a: {
        centerText: "GIRAR",
        sectors: [
          { label: "Rojo", color: "#f0445b" },
          { label: "Azul", color: "#2498eb" },
          { label: "Verde", color: "#18b47c" },
          { label: "Amarillo", color: "#f7c948" },
          { label: "Violeta", color: "#9255e9" },
          { label: "Naranja", color: "#f78c36" },
          { label: "Rosa", color: "#ed64ac" }
        ]
      },
      b: {
        centerText: "GIRAR",
        sectors: [
          { label: "Comida", emoji: "🍕", color: "#ef685a" },
          { label: "Bebida", emoji: "🥤", color: "#33a9d8" },
          { label: "Golosina", emoji: "🍬", color: "#d966c7" },
          { label: "Chocolate", emoji: "🍫", color: "#a76a54" },
          { label: "Galletitas", emoji: "🍪", color: "#dba94e" },
          { label: "Postre", emoji: "🍰", color: "#ec8aa8" },
          { label: "Snack", emoji: "🍟", color: "#e5a746" }
        ]
      }
    }
  };

  const copy = (value) => JSON.parse(JSON.stringify(value));

  // Importaciones y datos recuperados pasan por la misma validación antes de entrar a la app.
  function validateConfig(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) || input.version !== 1 ||
        typeof input.soundEnabled !== "boolean" || !input.wheels || typeof input.wheels !== "object") {
      throw new Error("El archivo no tiene una configuración válida de Party Spin.");
    }
    const wheels = {};
    for (const key of ["a", "b"]) {
      const wheel = input.wheels[key];
      if (!wheel || typeof wheel !== "object" || typeof wheel.centerText !== "string" ||
          wheel.centerText.trim().length < 1 || wheel.centerText.trim().length > 14 ||
          !Array.isArray(wheel.sectors) || wheel.sectors.length < 2 || wheel.sectors.length > 24) {
        throw new Error(`La ruleta ${key.toUpperCase()} debe tener entre 2 y 24 sectores y un texto central válido.`);
      }
      wheels[key] = {
        centerText: wheel.centerText.trim(),
        sectors: wheel.sectors.map((sector, index) => {
          if (!sector || typeof sector !== "object" || typeof sector.label !== "string" ||
              sector.label.trim().length < 1 || sector.label.trim().length > 32 ||
              typeof sector.color !== "string" || !HEX_COLOR.test(sector.color)) {
            throw new Error(`El sector ${index + 1} de la ruleta ${key.toUpperCase()} no es válido.`);
          }
          const clean = { label: sector.label.trim(), color: sector.color.toLowerCase() };
          if (key === "b") {
            if (sector.emoji !== undefined && (typeof sector.emoji !== "string" ||
                Array.from(sector.emoji).length > 8)) {
              throw new Error(`El emoji del sector ${index + 1} no es válido.`);
            }
            clean.emoji = (sector.emoji || "").trim();
          }
          return clean;
        })
      };
    }
    return { version: 1, soundEnabled: input.soundEnabled, wheels };
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? validateConfig(JSON.parse(raw)) : copy(defaults);
    } catch (_) {
      return copy(defaults);
    }
  }

  function saveConfig(config) {
    const clean = validateConfig(config);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(data)) return [];
      return data.filter((item) => item && typeof item === "object" &&
        typeof item.date === "string" &&
        (item.color === null || (item.color && typeof item.color.label === "string")) &&
        (item.category === null || (item.category && typeof item.category.label === "string")))
        .slice(0, 50);
    } catch (_) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
      return true;
    } catch (_) {
      return false;
    }
  }

  window.PartySpinStorage = {
    defaults: () => copy(defaults),
    validateConfig,
    loadConfig,
    saveConfig,
    loadHistory,
    saveHistory
  };
})();
