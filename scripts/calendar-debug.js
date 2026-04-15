export class CalendarDebug {
  static PREFIX = "[DnD5e-Calendar]";
  static enabled = false;
  static features = {
    hud: true,
    time: true,
    calendar: true,
    weather: true,
    season: true,
    moon: true,
    holidays: true,
    permissions: true,
    sockets: true,
    hooks: true,
    data: true
  };

  static init() {
    this.enabled = game.settings.get("dnd5e-calendar", "debugMode") ?? false;

    game.settings.register("dnd5e-calendar", "debugMode", {
      name: "Enable Debug Mode",
      hint: "Enable detailed console logging for troubleshooting",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: (value) => {
        this.enabled = value;
        if (value) {
          this.info("Debug mode ENABLED");
        } else {
          this.info("Debug mode DISABLED");
        }
      }
    });

    game.settings.register("dnd5e-calendar", "debugFeatures", {
      name: "Debug Features",
      hint: "Toggle individual feature debugging",
      scope: "world",
      config: true,
      type: Object,
      default: { ...this.features }
    });

    if (this.enabled) {
      this.info("CalendarDebug initialized", { features: this.features });
    }
  }

  static isFeatureEnabled(feature) {
    return this.enabled && (this.features[feature] ?? false);
  }

  static setFeature(feature, enabled) {
    this.features[feature] = enabled;
    this.debug(`Feature [${feature}] set to ${enabled ? "ON" : "OFF"}`, { feature });
  }

  static _log(level, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const prefix = `${this.PREFIX} [${timestamp}] [${level}]`;

    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  static error(message, data = null) {
    this._log("ERROR", message, data);
  }

  static warn(message, data = null) {
    this._log("WARN", message, data);
  }

  static info(message, data = null) {
    this._log("INFO", message, data);
  }

  static debug(message, data = null) {
    this._log("DEBUG", message, data);
  }

  static feature(feature, message, data = null) {
    if (this.isFeatureEnabled(feature)) {
      this._log(`[${feature.toUpperCase()}]`, message, data);
    }
  }

  static trace(message, data = null) {
    if (!this.enabled) return;
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const prefix = `${this.PREFIX} [${timestamp}] [TRACE]`;
    console.trace(`${prefix} ${message}`, data);
  }

  static table(data, label = "Table") {
    if (!this.enabled) return;
    console.log(`${this.PREFIX} [TABLE] ${label}:`, data);
  }

  static group(label) {
    if (!this.enabled) return;
    console.group(`${this.PREFIX} [GROUP] ${label}`);
  }

  static groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  }

  static logHook(hookName, data) {
    this.feature("hooks", `Hook fired: ${hookName}`, data);
  }

  static logPermission(action, user, allowed) {
    this.feature("permissions", `Permission ${action}: ${user.name} (role: ${user.role}) -> ${allowed ? "ALLOWED" : "DENIED"}`);
  }

  static logSocket(action, data) {
    this.feature("sockets", `Socket ${action}`, data);
  }

  static logData(operation, path, value) {
    this.feature("data", `Data ${operation}: ${path}`, value);
  }
}

window.CalendarDebug = CalendarDebug;
