/**
 * Calendar Integration Service
 * 
 * Provides multi-calendar support WITHOUT overriding dnd5e system.
 * 
 * Data Storage:
 * - Module world settings: dnd5e-calendar.secondary
 * - Module world settings: dnd5e-calendar.config
 * 
 * Primary Calendar: Mirrors dnd5e/Foundry world time (read-only)
 * Secondary Calendar: Independent time tracking in module
 * 
 * API:
 * - getCurrentDate(calendarId)
 * - advanceTime(calendarId, minutes)
 * - syncWithWorldTime()
 * - getTime(calendarId)
 * - setDate(calendarId, day, month, year)
 * - getAllCalendars()
 * - switchCalendar(id)
 */

import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

/**
 * Data Schema for Secondary Calendar
 * Stored in module world settings
 */
const SECONDARY_CALENDAR_SCHEMA = {
  id: "secondary",
  name: "Secondary Calendar",
  shortName: "SC",
  currentDay: { type: Number, default: 1 },
  currentMonth: { type: Number, default: 0 },
  currentYear: { type: Number, default: 1492 },
  currentHour: { type: Number, default: 6 },
  currentMinute: { type: Number, default: 0 },
  dayCount: { type: Number, default: 0 },
  epoch: { type: String, default: "" },
  yearZero: { type: Number, default: 0 },
  yearName: { type: String, default: "" },
  months: { type: Array, default: () => [] },
  weekdays: { type: Array, default: () => [] },
  intercalaryDays: { type: Number, default: 0 },
  lastSyncedAt: { type: String, default: "" }
};

/**
 * Configuration Schema
 */
const MULTI_CAL_CONFIG_SCHEMA = {
  activeCalendarId: { type: String, default: "primary" },
  linkedToWorldTime: { type: Boolean, default: true },
  timeOffset: { type: Number, default: 0 },  // Difference in days between calendars
  autoSync: { type: Boolean, default: true }
};

// Settings keys
const SETTINGS_KEYS = {
  SECONDARY_CALENDAR: "dnd5e-calendar.secondary",
  MULTI_CAL_CONFIG: "dnd5e-calendar.multiCalConfig",
  STATE: "dnd5e-calendar.state"
};

/**
 * Utility functions using Foundry utilities
 */
function deepClone(obj) {
  return foundry.utils.deepClone(obj);
}

function merge(target, source) {
  return foundry.utils.mergeObject(target, source, { inplace: true });
}

function createDefaultSecondaryCalendar() {
  return {
    id: "secondary",
    name: "Secondary Calendar",
    shortName: "SC",
    currentDay: 1,
    currentMonth: 0,
    currentYear: 1492,
    currentHour: 6,
    currentMinute: 0,
    dayCount: 0,
    epoch: "",
    yearZero: 0,
    yearName: "",
    months: deepClone(CALENDAR_CONSTANTS.DEFAULT_MONTHS),
    weekdays: deepClone(CALENDAR_CONSTANTS.DEFAULT_WEEKDAYS),
    intercalaryDays: 0,
    lastSyncedAt: new Date().toISOString()
  };
}

function createDefaultConfig() {
  return {
    activeCalendarId: "primary",
    linkedToWorldTime: true,
    timeOffset: 0,
    autoSync: true
  };
}

/**
 * CalendarIntegrationService
 * 
 * Manages calendar data without overriding dnd5e system.
 * Primary = dnd5e world time (read)
 * Secondary = module settings (read/write)
 */
class CalendarIntegrationService {
  constructor() {
    this._initialized = false;
    this._secondaryCalendar = null;
    this._config = null;
    this._hooksRegistered = false;
  }

  /**
   * Initialize the service
   * Loads data from module settings
   */
  async initialize() {
    if (this._initialized) return this;
    
    console.log("[DnD5e-Calendar] Initializing CalendarIntegrationService");
    
    // Load secondary calendar from world settings
    this._secondaryCalendar = game.settings.get("world", SETTINGS_KEYS.SECONDARY_CALENDAR);
    if (!this._secondaryCalendar || !this._secondaryCalendar.id) {
      this._secondaryCalendar = createDefaultSecondaryCalendar();
      await this._saveSecondaryCalendar();
    }
    
    // Load configuration
    this._config = game.settings.get("world", SETTINGS_KEYS.MULTI_CAL_CONFIG);
    if (!this._config) {
      this._config = createDefaultConfig();
      await this._saveConfig();
    }
    
    // Register hooks for world time sync
    this._registerHooks();
    
    this._initialized = true;
    console.log("[DnD5e-Calendar] CalendarIntegrationService ready", {
      activeCalendarId: this._config.activeCalendarId,
      secondaryCalendar: this._secondaryCalendar.name
    });
    
    return this;
  }

  /**
   * Register hooks for world time sync
   */
  _registerHooks() {
    if (this._hooksRegistered) return;
    
    Hooks.on("updateWorldTime", (worldTime, delta, options) => {
      this._onWorldTimeUpdate(worldTime, delta, options);
    });
    
    this._hooksRegistered = true;
  }

  /**
   * Handle world time updates
   */
  _onWorldTimeUpdate(worldTime, delta, options) {
    if (!this._config.linkedToWorldTime || !this._config.autoSync) return;
    
    // Update primary reference (should match dnd5e)
    // This is tracked implicitly through game.time
    
    // Optionally advance secondary
    if (this._config.activeCalendarId === "secondary") {
      const totalMinutes = Math.floor(delta / 60);
      this._advanceSecondaryTime(totalMinutes);
    }
  }

  /**
   * Advance secondary calendar time
   */
  _advanceSecondaryTime(minutes) {
    if (!this._secondaryCalendar) return;
    
    let hour = this._secondaryCalendar.currentHour;
    let minute = this._secondaryCalendar.currentMinute;
    let dayAdvance = 0;
    
    // Calculate new time
    const totalMinutes = (hour * 60 + minute) + minutes;
    hour = Math.floor(totalMinutes / 60) % 24;
    minute = totalMinutes % 60;
    dayAdvance = Math.floor(totalMinutes / 1440);
    
    this._secondaryCalendar.currentHour = hour;
    this._secondaryCalendar.currentMinute = minute;
    
    // Handle day wrap
    if (totalMinutes >= 1440) {
      this._advanceSecondaryDays(dayAdvance);
    }
    
    this._saveSecondaryCalendar();
  }

  /**
   * Advance secondary days
   */
  _advanceSecondaryDays(days) {
    if (!this._secondaryCalendar || days <= 0) return;
    
    let newDay = this._secondaryCalendar.currentDay + days;
    let newMonth = this._secondaryCalendar.currentMonth;
    let newYear = this._secondaryCalendar.currentYear;
    const months = this._secondaryCalendar.months;
    
    // Calculate new date
    while (newDay > (months[newMonth]?.days || 30)) {
      newDay -= months[newMonth]?.days || 30;
      newMonth++;
      if (newMonth >= months.length) {
        newMonth = 0;
        newYear++;
      }
    }
    
    this._secondaryCalendar.currentDay = newDay;
    this._secondaryCalendar.currentMonth = newMonth;
    this._secondaryCalendar.currentYear = newYear;
    this._secondaryCalendar.dayCount += days;
  }

  // ============== Public API ==============

  /**
   * Get current date for specified calendar
   * @param {string} calendarId - "primary" or "secondary"
   * @returns {Object} { day, month, year }
   */
  getCurrentDate(calendarId = null) {
    calendarId = calendarId || this._config?.activeCalendarId || "primary";
    
    if (calendarId === "primary" || calendarId === "dnd5e") {
      // Read from dnd5e system/world time
      if (game.dnd5e?.calendar) {
        return {
          day: game.dnd5e.calendar.currentDay || 1,
          month: game.dnd5e.calendar.currentMonth || 0,
          year: game.dnd5e.calendar.currentYear || 0
        };
      }
      // Fallback to game.time
      return {
        day: 1,
        month: 0,
        year: game.time.worldYear || 0
      };
    }
    
    // Secondary calendar from module settings
    return {
      day: this._secondaryCalendar?.currentDay || 1,
      month: this._secondaryCalendar?.currentMonth || 0,
      year: this._secondaryCalendar?.currentYear || 0
    };
  }

  /**
   * Get current time for specified calendar
   * @param {string} calendarId - "primary" or "secondary"
   * @returns {Object} { hour, minute }
   */
  getTime(calendarId = null) {
    calendarId = calendarId || this._config?.activeCalendarId || "primary";
    
    if (calendarId === "primary" || calendarId === "dnd5e") {
      // Read from dnd5e system
      if (game.dnd5e?.time) {
        return {
          hour: game.dnd5e.time.hour || 6,
          minute: game.dnd5e.time.minute || 0
        };
      }
      return {
        hour: Math.floor(game.time.worldTime / 60) % 24,
        minute: game.time.worldTime % 60
      };
    }
    
    // Secondary calendar
    return {
      hour: this._secondaryCalendar?.currentHour || 6,
      minute: this._secondaryCalendar?.currentMinute || 0
    };
  }

  /**
   * Advance time for specified calendar
   * @param {string} calendarId - "primary" or "secondary"
   * @param {number} minutes - Minutes to advance
   */
  async advanceTime(calendarId, minutes) {
    calendarId = calendarId || this._config?.activeCalendarId || "primary";
    
    if (calendarId === "primary" || calendarId === "dnd5e") {
      // Advance world time through dnd5e system
      if (game.dnd5e?.time) {
        await game.dnd5e.time.advance(minutes);
      }
      return;
    }
    
    // Advance secondary calendar
    this._advanceSecondaryTime(minutes);
    await this._saveSecondaryCalendar();
    
    // Trigger update hook
    Hooks.callAll("dnd5e-calendar:timeChange", {
      calendar: "secondary",
      time: this.getTime("secondary"),
      date: this.getCurrentDate("secondary")
    });
  }

  /**
   * Set date for secondary calendar only
   * @param {number} day
   * @param {number} month
   * @param {number} year
   */
  async setDate(day, month, year) {
    if (!this._secondaryCalendar) return;
    
    this._secondaryCalendar.currentDay = day;
    this._secondaryCalendar.currentMonth = month;
    this._secondaryCalendar.currentYear = year;
    this._secondaryCalendar.dayCount = this._calculateDayCount(day, month, year);
    this._secondaryCalendar.lastSyncedAt = new Date().toISOString();
    
    await this._saveSecondaryCalendar();
    
    Hooks.callAll("dnd5e-calendar:dateChange", {
      calendar: "secondary",
      date: { day, month, year }
    });
  }

  /**
   * Set time for secondary calendar
   * @param {number} hour
   * @param {number} minute
   */
  async setTime(hour, minute) {
    if (!this._secondaryCalendar) return;
    
    this._secondaryCalendar.currentHour = hour;
    this._secondaryCalendar.currentMinute = minute;
    
    await this._saveSecondaryCalendar();
    
    Hooks.callAll("dnd5e-calendar:timeChange", {
      calendar: "secondary",
      time: { hour, minute }
    });
  }

  /**
   * Sync secondary calendar with world time
   * Makes secondary match current world date/time
   */
  async syncWithWorldTime() {
    if (!this._secondaryCalendar) return;
    
    // Get current world time
    if (game.dnd5e?.calendar) {
      this._secondaryCalendar.currentDay = game.dnd5e.calendar.currentDay;
      this._secondaryCalendar.currentMonth = game.dnd5e.calendar.currentMonth;
      this._secondaryCalendar.currentYear = game.dnd5e.calendar.currentYear;
    }
    
    if (game.dnd5e?.time) {
      this._secondaryCalendar.currentHour = game.dnd5e.time.hour;
      this._secondaryCalendar.currentMinute = game.dnd5e.time.minute;
    }
    
    this._secondaryCalendar.dayCount = this._calculateDayCount(
      this._secondaryCalendar.currentDay,
      this._secondaryCalendar.currentMonth,
      this._secondaryCalendar.currentYear
    );
    this._secondaryCalendar.lastSyncedAt = new Date().toISOString();
    
    // Calculate offset (days difference)
    if (game.dnd5e?.calendar) {
      const primaryDayCount = this._calculateDayCount(
        game.dnd5e.calendar.currentDay,
        game.dnd5e.calendar.currentMonth,
        game.dnd5e.calendar.currentYear
      );
      this._config.timeOffset = this._secondaryCalendar.dayCount - primaryDayCount;
      await this._saveConfig();
    }
    
    await this._saveSecondaryCalendar();
    
    ui.notifications.info("Secondary calendar synced with world time");
    
    Hooks.callAll("dnd5e-calendar:calendarSync", {
      calendar: "secondary",
      syncedWith: "primary"
    });
  }

  /**
   * Get all available calendars
   * @returns {Array} List of calendars with metadata
   */
  getAllCalendars() {
    const config = this._config || { activeCalendarId: "primary" };
    
    return [
      {
        id: "primary",
        name: "Primary (World Time)",
        shortName: "Primary",
        isActive: config.activeCalendarId === "primary",
        isWorldLinked: true
      },
      {
        id: "secondary",
        name: this._secondaryCalendar?.name || "Secondary Calendar",
        shortName: this._secondaryCalendar?.shortName || "SC",
        isActive: config.activeCalendarId === "secondary",
        isWorldLinked: false,
        dayCount: this._secondaryCalendar?.dayCount || 0,
        lastSyncedAt: this._secondaryCalendar?.lastSyncedAt
      }
    ];
  }

  /**
   * Switch active calendar
   * @param {string} calendarId - "primary" or "secondary"
   */
  async switchCalendar(calendarId) {
    if (!this._config) return;
    
    const oldId = this._config.activeCalendarId;
    this._config.activeCalendarId = calendarId;
    await this._saveConfig();
    
    Hooks.callAll("dnd5e-calendar:calendarSwitch", {
      from: oldId,
      to: calendarId
    });
    
    console.log(`[DnD5e-Calendar] Switched to ${calendarId}`);
  }

  /**
   * Get secondary calendar details
   * @returns {Object} Full secondary calendar data
   */
  getSecondaryCalendar() {
    return deepClone(this._secondaryCalendar);
  }

  /**
   * Get time offset between calendars
   * @returns {number} Days offset
   */
  getTimeOffset() {
    return this._config?.timeOffset || 0;
  }

  /**
   * Get active calendar ID
   * @returns {string} "primary" or "secondary"
   */
  getActiveCalendarId() {
    return this._config?.activeCalendarId || "primary";
  }

  // ============== Private Helpers ==============

  _calculateDayCount(day, month, year) {
    const months = this._secondaryCalendar?.months || CALENDAR_CONSTANTS.DEFAULT_MONTHS;
    let days = day;
    for (let m = 0; m < month; m++) {
      days += months[m]?.days || 30;
    }
    days += year * months.reduce((sum, m) => sum + (m?.days || 30), 0);
    return days;
  }

  async _saveSecondaryCalendar() {
    await game.settings.set("world", SETTINGS_KEYS.SECONDARY_CALENDAR, this._secondaryCalendar);
  }

  async _saveConfig() {
    await game.settings.set("world", SETTINGS_KEYS.MULTI_CAL_CONFIG, this._config);
  }
}

// Export singleton
export const CalendarIntegration = new CalendarIntegrationService();

// Also export for global access
window.CalendarIntegration = CalendarIntegration;