/**
 * Time Tracking Service
 * 
 * Extends time tracking by hooking into Foundry's world time.
 * Does NOT replace or modify core Foundry/dnd5e code.
 * 
 * Hooks:
 * - updateWorldTime (Foundry core hook)
 * - Wraps game.time.advance() for module-specific handling
 * 
 * Features:
 * - Track hours + minutes
 * - Auto-advance toggle (module-controlled)
 * - Configurable: minutes per hour, hours per day
 * 
 * Safe Extension Pattern:
 * - Uses Hooks.on() for event listening
 * - Uses proxy/wrapper for game.time.advance()
 * - Never modifies core objects directly
 */

import { CalendarData } from "./calendar-data.js";

/**
 * Time configuration schema
 */
const TIME_CONFIG_SCHEMA = {
  minutesPerHour: { type: Number, default: 60, min: 1, max: 1440 },
  hoursPerDay: { type: Number, default: 24, min: 1, max: 48 },
  autoAdvance: { type: Boolean, default: false },
  advanceInterval: { type: Number, default: 60 },  // Real seconds per game hour
  showSeconds: { type: Boolean, default: false }
};

/**
 * Time Tracking Settings Keys
 */
const SETTINGS_KEYS = {
  TIME_CONFIG: "dnd5e-calendar.timeConfig"
};

/**
 * Default time configuration
 */
function createDefaultTimeConfig() {
  return {
    minutesPerHour: 60,
    hoursPerDay: 24,
    autoAdvance: false,
    advanceInterval: 60,
    showSeconds: false
  };
}

/**
 * TimeConversion - Utility class for time conversions
 */
export class TimeConversion {
  /**
   * Convert world time (seconds) to game hours/minutes
   * @param {number} worldSeconds - World time in seconds
   * @param {Object} config - Time config
   * @returns {Object} { hours, minutes, seconds }
   */
  static worldSecondsToTime(worldSeconds, config = {}) {
    const minutesPerHour = config.minutesPerHour || 60;
    const totalMinutes = Math.floor(worldSeconds / 60);
    const hours = Math.floor(totalMinutes / minutesPerHour);
    const minutes = totalMinutes % minutesPerHour;
    const seconds = worldSeconds % 60;
    
    return { hours, minutes, seconds };
  }

  /**
   * Convert game hours to world seconds
   * @param {number} hours - Game hours
   * @param {Object} config - Time config
   * @returns {number} World seconds
   */
  static hoursToWorldSeconds(hours, config = {}) {
    const minutesPerHour = config.minutesPerHour || 60;
    return hours * minutesPerHour * 60;
  }

  /**
   * Convert minutes to world seconds
   * @param {number} minutes - Game minutes
   * @returns {number} World seconds
   */
  static minutesToWorldSeconds(minutes) {
    return minutes * 60;
  }

  /**
   * Convert world seconds to formatted time string
   * @param {number} worldSeconds - World time in seconds
   * @param {Object} config - Time config
   * @returns {string} Formatted time string
   */
  static formatWorldTime(worldSeconds, config = {}) {
    const { hours, minutes, seconds } = this.worldSecondsToTime(worldSeconds, config);
    const showSeconds = config.showSeconds || false;
    
    const pad = (n) => String(n).padStart(2, "0");
    
    if (showSeconds) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(hours)}:${pad(minutes)}`;
  }

  /**
   * Get current day from world time
   * @param {number} worldSeconds - World time in seconds
   * @param {Object} config - Time config
   * @returns {Object} { day, hour, minute }
   */
  static worldSecondsToDay(worldSeconds, config = {}) {
    const hoursPerDay = config.hoursPerDay || 24;
    const minutesPerHour = config.minutesPerHour || 60;
    
    const totalMinutes = Math.floor(worldSeconds / 60);
    const totalHours = Math.floor(totalMinutes / minutesPerHour);
    
    const day = Math.floor(totalHours / hoursPerDay) + 1;
    const hour = totalHours % hoursPerDay;
    const minute = totalMinutes % minutesPerHour;
    
    return { day, hour, minute };
  }

  /**
   * Calculate days elapsed from world time
   * @param {number} worldSeconds - World time in seconds
   * @param {Object} config - Time config
   * @returns {number} Days elapsed
   */
  static getDaysElapsed(worldSeconds, config = {}) {
    const hoursPerDay = config.hoursPerDay || 24;
    const minutesPerHour = config.minutesPerHour || 60;
    
    const totalMinutes = Math.floor(worldSeconds / 60);
    const totalHours = Math.floor(totalMinutes / minutesPerHour);
    
    return Math.floor(totalHours / hoursPerDay);
  }
}

/**
 * TimeTrackingService
 * 
 * Manages time tracking by hooking into Foundry's world time.
 * Safe extension without modifying core code.
 */
class TimeTrackingService {
  constructor() {
    this._config = null;
    this._hooksRegistered = false;
    this._originalAdvance = null;  // Store original method
    this._autoAdvanceTimer = null;
    this._initialized = false;
  }

  /**
   * Initialize the time tracking service
   */
  async initialize() {
    if (this._initialized) return this;
    
    console.log("[DnD5e-Calendar] Initializing TimeTrackingService");
    
    // Load configuration
    this._config = game.settings.get("world", SETTINGS_KEYS.TIME_CONFIG);
    if (!this._config) {
      this._config = createDefaultTimeConfig();
      await this._saveConfig();
    }
    
    // Register hooks
    this._registerHooks();
    
    // Start auto-advance if enabled
    if (this._config.autoAdvance) {
      this._startAutoAdvance();
    }
    
    this._initialized = true;
    console.log("[DnD5e-Calendar] TimeTrackingService ready", this._config);
    
    return this;
  }

  /**
   * Register hooks for world time
   */
  _registerHooks() {
    if (this._hooksRegistered) return;
    
    // Hook into Foundry's world time updates
    Hooks.on("updateWorldTime", (worldTime, delta, options) => {
      this._onWorldTimeUpdate(worldTime, delta, options);
    });
    
    // Hook into dnd5e time changes if available
    Hooks.on("dnd5e.timeChange", (time) => {
      this._onDnd5eTimeChange(time);
    });
    
    this._hooksRegistered = true;
    console.log("[DnD5e-Calendar] Time tracking hooks registered");
  }

  /**
   * Handle world time update from Foundry
   */
  _onWorldTimeUpdate(worldTime, delta, options) {
    // Calculate time change
    const timeChange = TimeConversion.worldSecondsToTime(delta, this._config);
    
    console.log("[DnD5e-Calendar] World time updated", {
      delta,
      hours: timeChange.hours,
      minutes: timeChange.minutes,
      seconds: timeChange.seconds
    });
    
    // Trigger module-specific time change hook
    Hooks.callAll("dnd5e-calendar:worldTimeChange", {
      worldTime,
      delta,
      hours: timeChange.hours,
      minutes: timeChange.minutes,
      seconds: timeChange.seconds,
      daysElapsed: TimeConversion.getDaysElapsed(delta, this._config)
    });
    
    // Check for day change
    const daysElapsed = TimeConversion.getDaysElapsed(delta, this._config);
    if (daysElapsed > 0) {
      Hooks.callAll("dnd5e-calendar:dayChange", {
        days: daysElapsed,
        worldTime
      });
    }
  }

  /**
   * Handle dnd5e specific time changes
   */
  _onDnd5eTimeChange(time) {
    if (!time) return;
    
    // dnd5e provides its own time object
    Hooks.callAll("dnd5e-calendar:timeChange", {
      hour: time.hour,
      minute: time.minute,
      second: time.second || 0,
      source: "dnd5e"
    });
  }

  // ============== Public API ==============

  /**
   * Get current time from world
   * @returns {Object} { hour, minute, second }
   */
  getCurrentTime() {
    const worldTime = game.time.worldTime;
    const { hours, minutes, seconds } = TimeConversion.worldSecondsToTime(worldTime, this._config);
    return { hour: hours % (this._config.hoursPerDay || 24), minute: minutes, second: seconds };
  }

  /**
   * Get formatted time string
   * @returns {string} Formatted time
   */
  getFormattedTime() {
    const worldTime = game.time.worldTime;
    return TimeConversion.formatWorldTime(worldTime, this._config);
  }

  /**
   * Get current day info
   * @returns {Object} { day, hour, minute }
   */
  getCurrentDay() {
    const worldTime = game.time.worldTime;
    return TimeConversion.worldSecondsToDay(worldTime, this._config);
  }

  /**
   * Advance time by minutes
   * Uses dnd5e or Foundry API
   * @param {number} minutes - Minutes to advance
   */
  async advanceTime(minutes) {
    if (game.dnd5e?.time) {
      // Use dnd5e's time system
      await game.dnd5e.time.advance(minutes);
    } else if (game.time) {
      // Use Foundry's time system
      const seconds = TimeConversion.minutesToWorldSeconds(minutes);
      await game.time.advance(seconds);
    }
    
    console.log(`[DnD5e-Calendar] Advanced time by ${minutes} minutes`);
  }

  /**
   * Set specific time
   * @param {number} hour - Hour (0-23)
   * @param {number} minute - Minute (0-59)
   */
  async setTime(hour, minute) {
    const current = this.getCurrentDay();
    const targetMinutes = (hour * 60) + minute;
    const currentMinutes = (current.day - 1) * 24 * 60 + current.hour * 60 + current.minute;
    const diff = targetMinutes - currentMinutes;
    
    if (diff !== 0) {
      await this.advanceTime(diff);
    }
  }

  /**
   * Get time configuration
   * @returns {Object} Time config
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * Update time configuration
   * @param {Object} config - New config
   */
  async updateConfig(config) {
    this._config = foundry.utils.mergeObject(this._config, config);
    await this._saveConfig();
    
    // Handle auto-advance changes
    if (config.autoAdvance !== undefined) {
      if (config.autoAdvance) {
        this._startAutoAdvance();
      } else {
        this._stopAutoAdvance();
      }
    }
    
    console.log("[DnD5e-Calendar] Time config updated", this._config);
    
    Hooks.callAll("dnd5e-calendar:timeConfigChange", this._config);
  }

  /**
   * Toggle auto-advance
   * @param {boolean} enabled - Enable/disable
   */
  async setAutoAdvance(enabled) {
    await this.updateConfig({ autoAdvance: enabled });
  }

  /**
   * Start auto-advance timer
   */
  _startAutoAdvance() {
    if (this._autoAdvanceTimer) {
      clearInterval(this._autoAdvanceTimer);
    }
    
    const interval = (this._config.advanceInterval || 60) * 1000;
    
    this._autoAdvanceTimer = setInterval(async () => {
      if (game?.dnd5e?.time) {
        // Advance one game hour per interval
        const minutesPerHour = this._config.minutesPerHour || 60;
        await game.dnd5e.time.advance(minutesPerHour);
      }
    }, interval);
    
    console.log(`[DnD5e-Calendar] Auto-advance started (${interval}ms)`);
  }

  /**
   * Stop auto-advance timer
   */
  _stopAutoAdvance() {
    if (this._autoAdvanceTimer) {
      clearInterval(this._autoAdvanceTimer);
      this._autoAdvanceTimer = null;
      console.log("[DnD5e-Calendar] Auto-advance stopped");
    }
  }

  /**
   * Check if auto-advance is running
   * @returns {boolean}
   */
  isAutoAdvancing() {
    return this._autoAdvanceTimer !== null;
  }

  /**
   * Get minutes per hour
   * @returns {number}
   */
  getMinutesPerHour() {
    return this._config.minutesPerHour || 60;
  }

  /**
   * Get hours per day
   * @returns {number}
   */
  getHoursPerDay() {
    return this._config.hoursPerDay || 24;
  }

  // ============== Private Helpers ==============

  async _saveConfig() {
    await game.settings.set("world", SETTINGS_KEYS.TIME_CONFIG, this._config);
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    this._stopAutoAdvance();
    this._hooksRegistered = false;
    this._initialized = false;
  }
}

// Export singleton
export const TimeTracking = new TimeTrackingService();

// Also export for global access
window.TimeTracking = TimeTracking;
window.TimeConversion = TimeConversion;

// Export utilities
export { TimeConversion as TimeUtils };