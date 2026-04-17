import { DnD5eCalendar } from "./calendar-integration.js";
import { CalendarDebug } from "./calendar-debug.js";
import { CalendarHUD } from "./calendar-hud.js";
import { CalendarConfig } from "./calendar-config.js";
import { CalendarPermissions } from "./calendar-permissions.js";

console.log("[DnD5e-Calendar] v14 Integration - main.js loaded");

let hud = null;
let config = null;

function init() {
  console.log("[DnD5e-Calendar] DEBUG: init() STARTED");
  CalendarDebug.init();
  CalendarDebug.info("Module initialization starting");

  hud = new CalendarHUD();
  config = new CalendarConfig();
  window.DnD5eCalendarConfig = config;

  registerSettings();
  console.log("[DnD5e-Calendar] DEBUG: registerSettings() completed");

  registerHooks();
  console.log("[DnD5e-Calendar] DEBUG: registerHooks() completed");

  registerKeyboardShortcuts();
  console.log("[DnD5e-Calendar] DEBUG: registerKeyboardShortcuts() completed");

  registerCalendarWithDND5E();
  console.log("[DnD5e-Calendar] DEBUG: registerCalendarWithDND5E() completed");

  CalendarDebug.info("Module initialization complete");
  console.log("DnD5e Calendar | Module initialized (v14 Integration)");
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
    name: game.i18n.localize("DNDCAL.Settings.DebugMode"),
    hint: game.i18n.localize("DNDCAL.Settings.DebugModeHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
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
    console.log("[DnD5e-Calendar] DEBUG: updateWorldTime hook fired!", { worldTime, delta, options });
    
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

    if (game.users.current?.role >= CONST.USER_ROLES.ASSISTANT) {
      game.socket.on("dnd5e-calendar:update", (data) => {
        console.log("[DnD5e-Calendar] Socket update received:", data);
      });
    }
  });

  Hooks.on("renderSettingsConfig", (app, html) => {
    if (!CalendarPermissions.canEdit()) return;
  });

  Hooks.on("closeCalendarConfig", () => {
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

console.log("[DnD5e-Calendar] DEBUG: main.js - registering Hooks.once('init')");

Hooks.once("init", () => {
  console.log("[DnD5e-Calendar] DEBUG: Hooks.once('init') fired - calling init()");
  init();
});
