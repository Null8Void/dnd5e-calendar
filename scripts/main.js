import { CalendarManager } from "./calendar-manager.js";
import { CalendarHUD } from "./calendar-hud.js";
import { CalendarConfig } from "./calendar-config.js";
import { CalendarApprovalPanel } from "./holiday-approval-panel.js";
import { HolidaySubmitDialog } from "./holiday-submit-dialog.js";
import { CalendarAPI } from "./calendar-api.js";
import { CalendarData } from "./calendar-data.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarUtils } from "./calendar-utils.js";
import { CalendarDebug } from "./calendar-debug.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

console.log("[DnD5e-Calendar] DEBUG: main.js TOP - imports loaded, defining DnD5eCalendar");
console.log("[DnD5e-Calendar] DEBUG: CALENDAR_CONSTANTS:", CALENDAR_CONSTANTS.VERSION);

export const DnD5eCalendar = {
  manager: null,
  hud: null,
  config: null,
  api: null,
  debug: CalendarDebug,

  init() {
    console.log("[DnD5e-Calendar] DEBUG: DnD5eCalendar.init() STARTED");
    CalendarDebug.init();
    CalendarDebug.info("Module initialization starting");

    DnD5eCalendar.manager = new CalendarManager();
    DnD5eCalendar.api = new CalendarAPI();
    DnD5eCalendar.hud = new CalendarHUD();
    DnD5eCalendar.config = new CalendarConfig();

    this.registerSettings();
    console.log("[DnD5e-Calendar] DEBUG: registerSettings() completed");

    this.registerHooks();
    console.log("[DnD5e-Calendar] DEBUG: registerHooks() completed");

    this.registerKeyboardShortcuts();
    console.log("[DnD5e-Calendar] DEBUG: registerKeyboardShortcuts() completed");

    CalendarDebug.info("Module initialization complete");
    console.log("DnD5e Calendar | Module initialized");
  },

  registerSettings() {
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
        if (DnD5eCalendar.manager?.seasonManager) {
          DnD5eCalendar.manager.seasonManager.enableAutoWeatherRoll(value);
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
  },

  registerHooks() {
    console.log("[DnD5e-Calendar] DEBUG: registerHooks() - Setting up hooks");

    Hooks.on("ready", () => {
      console.log("[DnD5e-Calendar] DEBUG: Hooks.on('ready') fired!");
      console.log("[DnD5e-Calendar] DEBUG: Calling manager.initialize()...");
      DnD5eCalendar.manager.initialize().then(() => {
        console.log("[DnD5e-Calendar] DEBUG: manager.initialize() COMPLETED");
      }).catch(err => {
        console.error("[DnD5e-Calendar] DEBUG: manager.initialize() FAILED:", err);
      });
      console.log("[DnD5e-Calendar] DEBUG: Calling hud.render(true)...");
      DnD5eCalendar.hud.render(true).then(() => {
        console.log("[DnD5e-Calendar] DEBUG: hud.render() COMPLETED");
      }).catch(err => {
        console.error("[DnD5e-Calendar] DEBUG: hud.render() FAILED:", err);
      });
      console.log("[DnD5e-Calendar] DEBUG: Ready hook setup complete, waiting for init...");

      if (game.users.current?.role >= CONST.USER_ROLES.ASSISTANT) {
        game.socket.on("dnd5e-calendar:update", (data) => {
          DnD5eCalendar.manager.handleSocketUpdate(data);
        });
      }
    });

    Hooks.on("renderSettingsConfig", (app, html) => {
      if (!CalendarPermissions.canEdit()) return;
    });

    Hooks.on("closeCalendarConfig", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:dateChange", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:dayChange", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:timeChange", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:dayNightChange", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:moonPhaseChange", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:weatherChange", () => {
      DnD5eCalendar.hud.updateWeatherEffect();
    });

    Hooks.on("dnd5e-calendar:seasonChange", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:autoWeatherRoll", () => {
      DnD5eCalendar.hud.render();
      DnD5eCalendar.hud.updateWeatherEffect();
    });
  },

  registerKeyboardShortcuts() {
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
        if (CalendarPermissions.canEdit()) {
          DnD5eCalendar.config.render(true);
        }
      }
    });
  }
};

console.log("[DnD5e-Calendar] DEBUG: DnD5eCalendar object defined, registering Hooks.once('init')");

Hooks.once("init", () => {
  console.log("[DnD5e-Calendar] DEBUG: Hooks.once('init') fired - calling DnD5eCalendar.init()");
  DnD5eCalendar.init();
});
