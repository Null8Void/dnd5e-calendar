import { CalendarManager } from "./calendar-manager.js";
import { CalendarHUD } from "./calendar-hud.js";
import { CalendarConfig } from "./calendar-config.js";
import { CalendarAPI } from "./calendar-api.js";
import { CalendarData } from "./calendar-data.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarDebug } from "./calendar-debug.js";

export const DnD5eCalendar = {
  manager: null,
  hud: null,
  config: null,
  api: null,
  debug: CalendarDebug,

  init() {
    CalendarDebug.init();
    CalendarDebug.info("Module initialization starting");

    DnD5eCalendar.manager = new CalendarManager();
    DnD5eCalendar.api = new CalendarAPI();
    DnD5eCalendar.hud = new CalendarHUD();
    DnD5eCalendar.config = new CalendarConfig();

    this.registerSettings();
    this.registerHooks();
    this.registerKeyboardShortcuts();

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
      default: false
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
    Hooks.on("ready", () => {
      DnD5eCalendar.manager.initialize();
      DnD5eCalendar.hud.render(true);
      console.log("DnD5e Calendar | Ready hook fired, HUD rendered");
    });

    Hooks.on("renderSettingsConfig", (app, html) => {
      if (!CalendarPermissions.canEdit()) return;
    });

    Hooks.on("closeCalendarConfig", () => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:dateChange", (data) => {
      DnD5eCalendar.hud.render();
    });

    Hooks.on("dnd5e-calendar:timeChange", (data) => {
      DnD5eCalendar.hud.render();
    });
  },

  registerKeyboardShortcuts() {
    game.keybindings.register("dnd5e-calendar", "openConfig", {
      name: game.i18n.localize("DNDCAL.Keybinds.OpenConfig"),
      hint: game.i18n.localize("DNDCAL.Keybinds.OpenConfigHint"),
      editable: [
        {
          key: "KeyC",
          modifiers: [MODIFIER_KEYS.ALT]
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

Hooks.once("init", () => {
  DnD5eCalendar.init();
});

Hooks.once("ready", () => {
  if (game.user.isGM) {
    game.socket.on("dnd5e-calendar:update", (data) => {
      DnD5eCalendar.manager.handleSocketUpdate(data);
    });
  }
});
