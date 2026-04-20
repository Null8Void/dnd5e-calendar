import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

/**
 * DnD5e Calendar - Data Model
 * 
 * FoundryVTT v14 Compliant Data Schema
 * - Uses foundry.utils.deepClone for safe cloning
 * - Uses foundry.utils.mergeObject for safe merging
 * - Supports world and client scope settings
 * - Structured schemas for all entities
 */

// ============== Data Schemas ==============

/**
 * Calendar Schema
 * Defines structure for calendar configuration
 */
const CALENDAR_SCHEMA = {
  id: { type: String, required: true, default: "primary" },
  name: { type: String, required: true, default: "Primary Calendar" },
  shortName: { type: String, default: "PC" },
  timeName: { type: String, default: "Primary Time" },
  timeShortName: { type: String, default: "PT" },
  months: { type: Array, default: () => [] },
  weekdays: { type: Array, default: () => [] },
  epoch: { type: String, default: "Dale's Reckoning" },
  yearZero: { type: Number, default: 0 },
  yearName: { type: String, default: "" },
  intercalaryDays: { type: Number, default: 0 },
  intercalaryMonth: { type: [String, Number], default: null }
};

/**
 * Month Schema
 */
const MONTH_SCHEMA = {
  name: { type: String, default: "Month" },
  abbr: { type: String, default: "Mo" },
  days: { type: Number, default: 30, min: 1, max: 366 },
  isIntercalary: { type: Boolean, default: false }
};

/**
 * Weekday Schema
 */
const WEEKDAY_SCHEMA = {
  name: { type: String, default: "Day" },
  abbr: { type: String, default: "Da" }
};

/**
 * Time Schema
 */
const TIME_SCHEMA = {
  hour: { type: Number, default: 6, min: 0, max: 23 },
  minute: { type: Number, default: 0, min: 0, max: 59 },
  second: { type: Number, default: 0, min: 0, max: 59 }
};

/**
 * Season Schema
 */
const SEASON_SCHEMA = {
  current: { type: String, default: "spring" },
  autoTrack: { type: Boolean, default: true },
  monthRanges: {
    type: Object,
    default: () => ({
      spring: [2, 3, 4],
      summer: [5, 6, 7],
      fall: [8, 9, 10],
      winter: [11, 0, 1]
    })
  },
  seasonNames: {
    type: Object,
    default: () => ({
      spring: "Spring",
      summer: "Summer",
      fall: "Fall",
      winter: "Winter"
    })
  }
};

/**
 * Weather Schema
 */
const WEATHER_SCHEMA = {
  current: { type: String, default: "Clear skies" },
  mode: { type: String, default: "manual", choices: ["manual", "auto"] },
  gmNotes: { type: String, default: "" }
};

/**
 * Moon Schema
 */
const MOON_SCHEMA = {
  cycleDays: { type: Number, default: 15, min: 1, max: 100 },
  currentDay: { type: Number, default: 0 },
  currentPhase: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
};

/**
 * Holiday Schema
 */
const HOLIDAY_SCHEMA = {
  id: { type: String, required: true },
  name: { type: String, required: true },
  day: { type: Number, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  description: { type: String, default: "" },
  submittedBy: { type: String, default: "Unknown" },
  submittedAt: { type: String, required: true },
  status: { type: String, default: "pending", choices: ["pending", "approved", "rejected"] },
  approvedBy: { type: String, default: "" },
  approvedAt: { type: String, default: "" },
  rejectedBy: { type: String, default: "" },
  rejectedAt: { type: String, default: "" },
  rejectionReason: { type: String, default: "" }
};

/**
 * Holidays Collection Schema
 */
const HOLIDAYS_COLLECTION_SCHEMA = {
  approved: { type: Array, default: () => [] },
  pending: { type: Array, default: () => [] },
  rejected: { type: Array, default: () => [] }
};

/**
 * Day/Night Schema
 */
const DAY_NIGHT_SCHEMA = {
  dayStartHour: { type: Number, default: 6, min: 0, max: 23 },
  nightStartHour: { type: Number, default: 18, min: 0, max: 23 }
};

/**
 * Settings Schema
 */
const SETTINGS_SCHEMA = {
  enableGradientBar: { type: Boolean, default: true },
  enableIconToggle: { type: Boolean, default: false },
  playersCanSubmitHolidays: { type: Boolean, default: true },
  playersCanViewPendingHolidays: { type: Boolean, default: false },
  autoTrackSeasons: { type: Boolean, default: true },
  autoWeatherRoll: { type: Boolean, default: false },
  showSeconds: { type: Boolean, default: false },
  timeFlowEnabled: { type: Boolean, default: false },
  realSecondsPerGameHour: { type: Number, default: 60 }
};

// ============== Utility Functions ==============

/**
 * Deep clone an object using Foundry's utility
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return foundry.utils.deepClone(obj);
}

/**
 * Safely merge objects using Foundry's utility
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function merge(target, source) {
  return foundry.utils.mergeObject(target, source, { inplace: true });
}

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validated data with defaults
 */
function validate(data, schema) {
  const result = {};
  
  for (const [key, field] of Object.entries(schema)) {
    if (data[key] !== undefined) {
      // Type check
      if (field.type && typeof data[key] !== field.type) {
        result[key] = field.default;
      } else {
        result[key] = data[key];
      }
      
      // Range validation for numbers
      if (field.type === Number) {
        if (field.min !== undefined && result[key] < field.min) result[key] = field.min;
        if (field.max !== undefined && result[key] > field.max) result[key] = field.max;
      }
      
      // Choices validation
      if (field.choices && !field.choices.includes(result[key])) {
        result[key] = field.default;
      }
    } else if (field.required) {
      result[key] = field.default;
    } else {
      // Default value
      if (typeof field.default === 'function') {
        result[key] = field.default();
      } else {
        result[key] = field.default;
      }
    }
  }
  
  return result;
}

// ============== Default Data Factory ==============

/**
 * Create default calendar data
 */
function createDefaultCalendar(id = "primary") {
  return validate({
    id,
    name: id === "primary" ? "Primary Calendar" : "Secondary Calendar",
    shortName: id === "primary" ? "PC" : "SC",
    timeName: id === "primary" ? "Primary Time" : "Secondary Time",
    timeShortName: id === "primary" ? "PT" : "ST",
    months: deepClone(CALENDAR_CONSTANTS.DEFAULT_MONTHS),
    weekdays: deepClone(CALENDAR_CONSTANTS.DEFAULT_WEEKDAYS),
    epoch: id === "primary" ? "Dale's Reckoning" : "",
    yearZero: 0,
    yearName: "",
    intercalaryDays: 0,
    intercalaryMonth: null
  }, CALENDAR_SCHEMA);
}

/**
 * Create default time data
 */
function createDefaultTime() {
  return validate({
    hour: CALENDAR_CONSTANTS.TIME.DEFAULT_START_HOUR,
    minute: CALENDAR_CONSTANTS.TIME.DEFAULT_START_MINUTE,
    second: 0
  }, TIME_SCHEMA);
}

/**
 * Create default season data
 */
function createDefaultSeason() {
  return validate({
    current: "spring",
    autoTrack: true,
    monthRanges: {
      spring: [2, 3, 4],
      summer: [5, 6, 7],
      fall: [8, 9, 10],
      winter: [11, 0, 1]
    },
    seasonNames: {
      spring: "Spring",
      summer: "Summer",
      fall: "Fall",
      winter: "Winter"
    }
  }, SEASON_SCHEMA);
}

/**
 * Create default weather data
 */
function createDefaultWeather() {
  return validate({
    current: "Clear skies",
    mode: "manual",
    gmNotes: ""
  }, WEATHER_SCHEMA);
}

/**
 * Create default moon data
 */
function createDefaultMoon() {
  return validate({
    cycleDays: CALENDAR_CONSTANTS.MOON.DEFAULT_CYCLE_DAYS,
    currentDay: 0,
    currentPhase: 0,
    enabled: true
  }, MOON_SCHEMA);
}

/**
 * Create default holidays collection
 */
function createDefaultHolidays() {
  return validate({
    approved: [],
    pending: [],
    rejected: []
  }, HOLIDAYS_COLLECTION_SCHEMA);
}

/**
 * Create default day/night data
 */
function createDefaultDayNight() {
  return validate({
    dayStartHour: CALENDAR_CONSTANTS.DAY_NIGHT.DAY_START_HOUR,
    nightStartHour: CALENDAR_CONSTANTS.DAY_NIGHT.NIGHT_START_HOUR
  }, DAY_NIGHT_SCHEMA);
}

/**
 * Create default settings
 */
function createDefaultSettings() {
  return validate({
    enableGradientBar: true,
    enableIconToggle: false,
    playersCanSubmitHolidays: true,
    playersCanViewPendingHolidays: false,
    autoTrackSeasons: true,
    autoWeatherRoll: false,
    showSeconds: false,
    timeFlowEnabled: false,
    realSecondsPerGameHour: 60
  }, SETTINGS_SCHEMA);
}

/**
 * Create full default module data
 */
function createDefaultModuleData() {
  return {
    version: CALENDAR_CONSTANTS.VERSION,
    activeCalendarId: "primary",
    calendars: {
      primary: createDefaultCalendar("primary"),
      secondary: createDefaultCalendar("secondary")
    },
    date: { day: 1, month: 0, year: 1492 },
    time: createDefaultTime(),
    season: createDefaultSeason(),
    weather: createDefaultWeather(),
    moon: createDefaultMoon(),
    holidays: createDefaultHolidays(),
    dayNight: createDefaultDayNight(),
    dayCount: 0
  };
}

// ============== Settings Keys ==============

const SETTINGS_KEYS = {
  MODULE_DATA: "dnd5e-calendar.data",
  SETTINGS: "dnd5e-calendar.settings",
  HOLIDAYS: "dnd5e-calendar.holidays",
  STATE: "dnd5e-calendar.state"
};

// ============== Data Access Layer ==============

/**
 * Get current user name safely
 */
function getCurrentUser() {
  return game.user?.name ?? "Unknown User";
}

/**
 * CalendarData - Main data access class
 * 
 * Provides structured access to all module data
 * with proper schema validation and safe operations
 */
export class CalendarData {
  constructor() {
    console.log("[DnD5e-Calendar] DEBUG: CalendarData class instantiated");
  }

  // ============== Module Data (World Scope) ==============

  /**
   * Load module data from world settings
   * Includes calendars, date, time, etc.
   */
  static async load() {
    let data = game.settings.get("world", SETTINGS_KEYS.MODULE_DATA);
    
    if (!data || Object.keys(data).length === 0) {
      data = createDefaultModuleData();
      await this.save(data);
    }
    
    // Validate and migrate if needed
    return this.migrateData(data);
  }

  /**
   * Save module data to world settings
   */
  static async save(data) {
    const validated = this.validateModuleData(data);
    await game.settings.set("world", SETTINGS_KEYS.MODULE_DATA, validated);
    return validated;
  }

  /**
   * Update a specific path in module data
   */
  static async update(path, value) {
    const data = await this.load();
    const keys = path.split(".");
    let current = data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    await this.save(data);
    return data;
  }

  /**
   * Get a specific path from module data
   */
  static async get(path) {
    const data = await this.load();
    const keys = path.split(".");
    let current = data;
    
    for (const key of keys) {
      if (current === undefined) return null;
      current = current[key];
    }
    
    return current;
  }

  // ============== Settings (World Scope) ==============

  /**
   * Load settings from world settings
   */
  static async loadSettings() {
    let settings = game.settings.get("world", SETTINGS_KEYS.SETTINGS);
    
    if (!settings || Object.keys(settings).length === 0) {
      settings = createDefaultSettings();
      await this.saveSettings(settings);
    }
    
    return this.validateSettings(settings);
  }

  /**
   * Save settings to world settings
   */
  static async saveSettings(settings) {
    const validated = this.validateSettings(settings);
    await game.settings.set("world", SETTINGS_KEYS.SETTINGS, validated);
    return validated;
  }

  /**
   * Update specific setting
   */
  static async updateSettings(path, value) {
    const settings = await this.loadSettings();
    const keys = path.split(".");
    let current = settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    await this.saveSettings(settings);
    return settings;
  }

  // ============== Holidays (World Scope) ==============

  /**
   * Load holidays from world settings
   */
  static async loadHolidays() {
    let holidays = game.settings.get("world", SETTINGS_KEYS.HOLIDAYS);
    
    if (!holidays) {
      holidays = createDefaultHolidays();
      await this.saveHolidays(holidays);
    }
    
    return this.validateHolidays(holidays);
  }

  /**
   * Save holidays to world settings
   */
  static async saveHolidays(holidays) {
    const validated = this.validateHolidays(holidays);
    await game.settings.set("world", SETTINGS_KEYS.HOLIDAYS, validated);
    return validated;
  }

  /**
   * Add a new holiday
   */
  static async addHoliday(holiday, status = "pending") {
    const holidays = await this.loadHolidays();
    
    const newHoliday = validate({
      ...holiday,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submittedBy: getCurrentUser(),
      submittedAt: new Date().toISOString(),
      status
    }, HOLIDAY_SCHEMA);
    
    holidays[status].push(newHoliday);
    await this.saveHolidays(holidays);
    return newHoliday;
  }

  /**
   * Update a holiday
   */
  static async updateHoliday(id, updates) {
    const holidays = await this.loadHolidays();
    const allHolidays = [...holidays.approved, ...holidays.pending, ...holidays.rejected];
    const index = allHolidays.findIndex(h => h.id === id);
    
    if (index === -1) return null;
    
    let targetArray;
    if (holidays.approved.some(h => h.id === id)) targetArray = holidays.approved;
    else if (holidays.pending.some(h => h.id === id)) targetArray = holidays.pending;
    else targetArray = holidays.rejected;
    
    const localIndex = targetArray.findIndex(h => h.id === id);
    targetArray[localIndex] = merge(targetArray[localIndex], updates);
    
    await this.saveHolidays(holidays);
    return targetArray[localIndex];
  }

  /**
   * Approve a holiday
   */
  static async approveHoliday(id) {
    const holidays = await this.loadHolidays();
    const pendingIndex = holidays.pending.findIndex(h => h.id === id);
    
    if (pendingIndex === -1) return null;
    
    const holiday = holidays.pending.splice(pendingIndex, 1)[0];
    holiday.status = "approved";
    holiday.approvedBy = getCurrentUser();
    holiday.approvedAt = new Date().toISOString();
    holidays.approved.push(holiday);
    
    await this.saveHolidays(holidays);
    return holiday;
  }

  /**
   * Reject a holiday
   */
  static async rejectHoliday(id, reason = "") {
    const holidays = await this.loadHolidays();
    const pendingIndex = holidays.pending.findIndex(h => h.id === id);
    
    if (pendingIndex === -1) return null;
    
    const holiday = holidays.pending.splice(pendingIndex, 1)[0];
    holiday.status = "rejected";
    holiday.rejectedBy = getCurrentUser();
    holiday.rejectedAt = new Date().toISOString();
    holiday.rejectionReason = reason;
    holidays.rejected.push(holiday);
    
    await this.saveHolidays(holidays);
    return holiday;
  }

  // ============== Validation Methods ==============

  /**
   * Validate module data against schema
   */
  static validateModuleData(data) {
    return validate(data, {
      version: { type: String, default: CALENDAR_CONSTANTS.VERSION },
      activeCalendarId: { type: String, default: "primary" },
      calendars: { type: Object, default: () => ({}) },
      date: { type: Object, default: () => ({ day: 1, month: 0, year: 1492 }) },
      time: { type: Object, default: createDefaultTime },
      season: { type: Object, default: createDefaultSeason },
      weather: { type: Object, default: createDefaultWeather },
      moon: { type: Object, default: createDefaultMoon },
      holidays: { type: Object, default: createDefaultHolidays },
      dayNight: { type: Object, default: createDefaultDayNight },
      dayCount: { type: Number, default: 0 }
    });
  }

  /**
   * Validate settings against schema
   */
  static validateSettings(settings) {
    return validate(settings, SETTINGS_SCHEMA);
  }

  /**
   * Validate holidays against schema
   */
  static validateHolidays(holidays) {
    return validate(holidays, HOLIDAYS_COLLECTION_SCHEMA);
  }

  /**
   * Migrate data from older versions
   */
  static migrateData(data) {
    const currentVersion = CALENDAR_CONSTANTS.VERSION;
    
    if (!data.version || data.version !== currentVersion) {
      console.log(`[DnD5e-Calendar] Migrating data from ${data.version || 'unknown'} to ${currentVersion}`);
      
      // Ensure all new fields exist
      if (!data.calendars?.primary) {
        data.calendars = {
          primary: createDefaultCalendar("primary"),
          secondary: createDefaultCalendar("secondary")
        };
      }
      
      if (!data.moon?.cycleDays) {
        data.moon = createDefaultMoon();
      }
      
      if (!data.weather?.gmNotes !== undefined) {
        data.weather = merge(createDefaultWeather(), data.weather);
      }
      
      data.version = currentVersion;
    }
    
    return data;
  }
}

// ============== CalendarState - Runtime State ==============

/**
 * CalendarState - Runtime state manager
 * 
 * Provides lightweight access to current calendar state
 * for use during game sessions
 */
export class CalendarState {
  static SETTINGS_KEY = SETTINGS_KEYS.STATE;

  /**
   * Get current state from world settings
   */
  static get() {
    let state = game.settings.get("world", this.SETTINGS_KEY);
    if (!state) {
      state = this.getDefaultState();
      this.set(state);
    }
    return state;
  }

  /**
   * Get default runtime state
   */
  static getDefaultState() {
    return deepClone({
      version: CALENDAR_CONSTANTS.VERSION,
      date: { day: 1, month: 0, year: 1492 },
      time: { hour: 6, minute: 0 },
      weather: createDefaultWeather(),
      season: createDefaultSeason(),
      moon: createDefaultMoon(),
      dayNight: createDefaultDayNight(),
      isDay: true,
      dayOfWeek: "Starday"
    });
  }

  /**
   * Set entire state
   */
  static async set(state) {
    await game.settings.set("world", this.SETTINGS_KEY, deepClone(state));
    return state;
  }

  /**
   * Update specific path in state
   */
  static async update(path, value) {
    const state = this.get();
    const keys = path.split(".");
    let current = state;

    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    await this.set(state);
    return state;
  }

  /**
   * Get total elapsed days
   */
  static getTotalDays() {
    const state = this.get();
    const { day, month, year } = state.date;
    return year * 360 + month * 30 + day;
  }
}

// Export schema constants for external use
export const SCHEMAS = {
  CALENDAR: CALENDAR_SCHEMA,
  MONTH: MONTH_SCHEMA,
  WEEKDAY: WEEKDAY_SCHEMA,
  TIME: TIME_SCHEMA,
  SEASON: SEASON_SCHEMA,
  WEATHER: WEATHER_SCHEMA,
  MOON: MOON_SCHEMA,
  HOLIDAY: HOLIDAY_SCHEMA,
  HOLIDAYS_COLLECTION: HOLIDAYS_COLLECTION_SCHEMA,
  DAY_NIGHT: DAY_NIGHT_SCHEMA,
  SETTINGS: SETTINGS_SCHEMA
};

export { deepClone, merge, validate, createDefaultModuleData };
export { SETTINGS_KEYS };
