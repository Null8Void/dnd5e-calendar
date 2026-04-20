import { DnD5eCalendar, DnD5eCalendarIntegration } from "./calendar-integration.js";
import { CalendarDebug } from "./calendar-debug.js";
import { CalendarHUD } from "./calendar-hud.js";
import { CalendarConfig } from "./calendar-config.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarIntegration } from "./calendar-integration-service.js";
import { TimeTracking } from "./time-tracking-service.js";
import { SeasonService } from "./season-service.js";
import { WeatherManagerService } from "./weather-service.js";
import { MoonPhaseService } from "./moon-phase-service.js";
import { HUDAugmentation } from "./hud-augmentation.js";
import { HUDRenderer } from "./hud-renderer.js";

Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("and", (...args) => {
  args.pop();
  return args.every(Boolean);
});

console.log("[DnD5e-Calendar] v14 Integration - main.js loaded");

let hud = null;
let config = null;

async function runPreflightDiagnostics() {
  const report = [];

  const mod = game.modules.get("dnd5e-calendar");
  if (!mod) {
    report.push({ area: "MODULE", status: "FAIL", issue: "Module not found in game.modules", fix: "Check module.json id and folder name match" });
  } else {
    report.push({ area: "MODULE", status: "OK", issue: `Module registered: ${mod.version}`, fix: null });
  }

  if (typeof DnD5eCalendar === "undefined") {
    report.push({ area: "IMPORT", status: "FAIL", issue: "DnD5eCalendar undefined", fix: "Check esmodules path and export in calendar-integration.js" });
  } else {
    report.push({ area: "IMPORT", status: "OK", issue: "DnD5eCalendar imported", fix: null });
  }

  const version = game.version || game.data?.version;
  report.push({ area: "FOUNDRY", status: version?.startsWith?.("14") ? "OK" : "WARN", issue: `Version: ${version}`, fix: "Verify compatibility in module.json" });

  if (!game.settings) {
    report.push({ area: "SETTINGS", status: "FAIL", issue: "game.settings unavailable", fix: "Init hook not firing correctly" });
  } else {
    report.push({ area: "SETTINGS", status: "OK", issue: "Settings system available", fix: null });
  }

  console.group("[DnD5e-Calendar] Preflight Report");
  console.table(report);
  console.groupEnd();
  return report;
}

async function init() {
  registerSettings();
  CalendarDebug.init();
  CalendarDebug.master("MODULE STARTUP - v1.1.3");

  registerHooks();
  CalendarDebug.trackInit("registerHooks", true);

  registerKeyboardShortcuts();
  CalendarDebug.trackInit("registerKeyboardShortcuts", true);

  registerCalendarWithDND5E();
  CalendarDebug.trackInit("registerCalendarWithDND5E", true);

  await DnD5eCalendar.initialize?.();
  CalendarDebug.trackInit("DnD5eCalendar", true);

  await CalendarIntegration.initialize();
  CalendarDebug.trackInit("CalendarIntegration", true);

  await TimeTracking.initialize();
  CalendarDebug.trackInit("TimeTracking", true);

  await SeasonService.initialize();
  CalendarDebug.trackInit("SeasonService", true);

  await WeatherManagerService.initialize();
  CalendarDebug.trackInit("WeatherManagerService", true);

  await MoonPhaseService.initialize();
  CalendarDebug.trackInit("MoonPhaseService", true);

  window.CalendarIntegration = CalendarIntegration;
  window.TimeTracking = TimeTracking;
  window.SeasonService = SeasonService;
  window.WeatherManagerService = WeatherManagerService;
  window.MoonPhaseService = MoonPhaseService;
  window.HUDAugmentation = HUDAugmentation;
  window.HUDRenderer = HUDRenderer;
  window.CalendarAPI = {
    getCurrentDate: (id) => CalendarIntegration.getCurrentDate(id),
    getTime: (id) => CalendarIntegration.getTime(id),
    advanceTime: (id, mins) => CalendarIntegration.advanceTime(id, mins),
    syncWithWorldTime: () => CalendarIntegration.syncWithWorldTime(),
    getAllCalendars: () => CalendarIntegration.getAllCalendars(),
    switchCalendar: (id) => CalendarIntegration.switchCalendar(id)
  };
  window.TimeAPI = {
    getCurrentTime: () => TimeTracking.getCurrentTime(),
    getFormattedTime: () => TimeTracking.getFormattedTime(),
    advanceTime: (mins) => TimeTracking.advanceTime(mins),
    setTime: (h, m) => TimeTracking.setTime(h, m),
    getConfig: () => TimeTracking.getConfig(),
    setAutoAdvance: (enabled) => TimeTracking.setAutoAdvance(enabled)
  };
  window.WeatherAPI = {
    getWeather: () => WeatherManagerService.getWeather(),
    setWeather: (weather, notes) => WeatherManagerService.setWeather(weather, notes),
    setGMNotes: (notes) => WeatherManagerService.setGMNotes(notes),
    getWeatherTypes: () => WeatherManagerService.getWeatherTypes(),
    setAutoRoll: (enabled) => WeatherManagerService.setAutoRoll(enabled)
  };
  window.MoonAPI = {
    getPhase: () => MoonPhaseService.getCurrentPhase(),
    getPhaseName: () => MoonPhaseService.getPhaseName(),
    getHUDDisplay: () => MoonPhaseService.getHUDDisplay(),
    setDay: (day) => MoonPhaseService.setDay(day),
    setCycleDays: (days) => MoonPhaseService.setCycleDays(days),
    getConfig: () => MoonPhaseService.getConfig()
  };

  // Initialize UI (HUD and Config) - Keep existing dnd5e calendar
  hud = new CalendarHUD();
  config = new CalendarConfig();
  window.DnD5eCalendarConfig = config;

  // Initialize HUD Augmentation (injects into dnd5e HUD)
  HUDAugmentation.initialize();
  CalendarDebug.trackInit("HUDAugmentation", true);

  // Initialize centralized HUDRenderer
  HUDRenderer.initialize();
  CalendarDebug.trackInit("HUDRenderer", true);

  CalendarDebug.trackInit("FULL_INIT", true, CalendarDebug.getFlowState());
}

function registerCalendarWithDND5E() {
  if (typeof CONFIG !== "undefined" && CONFIG.DND5E) {
    CONFIG.DND5E.calendar = CONFIG.DND5E.calendar || {};
    CONFIG.DND5E.calendar.application = CalendarHUD;

    console.log("[DnD5e-Calendar] Registered CalendarHUD as CONFIG.DND5E.calendar.application");
  }
}

function registerSettings() {
  game.settings.register("dnd5e-calendar", "enabled", {
    name: game.i18n.localize("DNDCAL.Settings.Enabled"),
    hint: game.i18n.localize("DNDCAL.Settings.EnabledHint"),
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register("dnd5e-calendar", "hudPosition", {
    name: game.i18n.localize("DNDCAL.Settings.HudPosition"),
    scope: "world",
    config: false,
    type: String,
    default: "top"
  });

  game.settings.register("dnd5e-calendar", "debugMode", {
    name: "DNDCAL.Settings.DebugMode",
    hint: "DNDCAL.Settings.DebugModeHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      CalendarDebug.setDebugMode(value);
    }
  });

  game.settings.register("dnd5e-calendar", "autoWeatherRoll", {
    name: game.i18n.localize("DNDCAL.Settings.AutoWeatherRoll"),
    hint: game.i18n.localize("DNDCAL.Settings.AutoWeatherRollHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (DnD5eCalendar.seasonManager) {
        DnD5eCalendar.seasonManager.enableAutoWeatherRoll(value);
      }
    }
  });

  game.settings.registerMenu("dnd5e-calendar", "configMenu", {
    name: game.i18n.localize("DNDCAL.Settings.OpenConfig"),
    label: game.i18n.localize("DNDCAL.Settings.OpenConfigLabel"),
    hint: game.i18n.localize("DNDCAL.Settings.OpenConfigHint"),
    icon: "fas fa-cog",
    type: CalendarConfig,
    restricted: true
  });
}

function registerHooks() {
  console.log("[DnD5e-Calendar] DEBUG: registerHooks() - Setting up hooks");

  Hooks.on("dnd5e.setupCalendar", (calendar) => {
    console.log("[DnD5e-Calendar] DEBUG: dnd5e.setupCalendar hook fired!");
    DnD5eCalendar.setupCalendar(calendar);
  });

  Hooks.on("updateWorldTime", (worldTime, delta, options) => {
    if (DnD5eCalendar && DnD5eCalendar.dnd5eCalendar) {
      const dnd5eDeltas = options?.dnd5e?.deltas || {};
      const midnights = dnd5eDeltas.midnights || 0;
      
      if (midnights > 0 || delta >= 86400) {
        if (DnD5eCalendar.onNewDay) {
          DnD5eCalendar.onNewDay();
        }
      }
      
      if (DnD5eCalendar.updateMoonPhase) {
        DnD5eCalendar.updateMoonPhase();
      }
      
      Hooks.callAll("dnd5e-calendar:timeChange", { worldTime, delta, midnights });
    }
    
    if (hud) {
      hud.render();
    }
  });

  Hooks.on("ready", () => {
    console.log("[DnD5e-Calendar] DEBUG: Hooks.on('ready') fired!");

    if (game.dnd5e) {
      game.dnd5e.ui = game.dnd5e.ui || {};
      game.dnd5e.ui.calendar = hud;
    }

    if (hud) {
      hud.render(true).catch(err => {
        console.error("[DnD5e-Calendar] DEBUG: hud.render() FAILED:", err);
      });
    }

    if (game.user?.role >= CONST.USER_ROLES.ASSISTANT) {
      game.socket.on("dnd5e-calendar:update", (data) => {
        console.log("[DnD5e-Calendar] Socket update received:", data);
      });
    }
  });

  Hooks.on("renderSettingsConfig", (app, html) => {
    if (!CalendarPermissions.canEdit()) return;
    if (!game.settings.get("dnd5e-calendar", "enabled")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "dnd5e-calendar-config-btn";
    button.style.marginTop = "10px";
    button.innerHTML = `<i class="fas fa-calendar"></i> ${game.i18n.localize("DNDCAL.Settings.OpenConfigLabel")}`;
    button.addEventListener("click", () => {
      config?.render(true);
    });

    const container = html.querySelector(".settings-buttons") || html.querySelector("footer") || html;
    if (container) {
      container.appendChild(button);
    }
  });

  Hooks.on("closeSettingsConfig", () => {
    if (hud) hud.render();
  });

  Hooks.on("dnd5e-calendar:dateChange", () => {
    if (hud) hud.render();
  });

  Hooks.on("dnd5e-calendar:dayChange", () => {
    if (hud) hud.render();
  });

  Hooks.on("dnd5e-calendar:timeChange", () => {
    if (hud) hud.render();
  });

  Hooks.on("dnd5e-calendar:dayNightChange", () => {
    if (hud) hud.render();
  });

  Hooks.on("dnd5e-calendar:moonPhaseChange", () => {
    if (hud) hud.render();
  });

  Hooks.on("dnd5e-calendar:weatherChange", () => {
    if (hud) hud.updateWeatherEffect();
  });

  Hooks.on("dnd5e-calendar:seasonChange", () => {
    if (hud) hud.render();
  });

  Hooks.on("dnd5e-calendar:autoWeatherRoll", () => {
    if (hud) {
      hud.render();
      hud.updateWeatherEffect();
    }
  });

  Hooks.on("dnd5e-calendar:render", () => {
    if (hud) hud.render();
  });
}

function registerKeyboardShortcuts() {
  game.keybindings.register("dnd5e-calendar", "openConfig", {
    name: game.i18n.localize("DNDCAL.Keybinds.OpenConfig"),
    hint: game.i18n.localize("DNDCAL.Keybinds.OpenConfigHint"),
    editable: [
      {
        key: "KeyC",
        modifiers: [KeyboardManager.MODIFIER_KEYS.ALT]
      }
    ],
    onDown: () => {
      if (CalendarPermissions.canEdit() && config) {
        config.render(true);
      }
    }
  });
}

console.log("[DnD5e-Calendar] DEBUG: main.js - registering Hooks.on('init', {once: true})");

Hooks.once("init", async () => {
  console.log("[DnD5e-Calendar] BOOTSTRAP INIT");

  try {
    await runPreflightDiagnostics();
    await init();
    console.log("[DnD5e-Calendar] INIT COMPLETE");
  } catch (err) {
    console.error("[DnD5e-Calendar] FATAL INIT FAILURE", err);
  }
});
