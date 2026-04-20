/**
 * Season Service
 * 
 * Computes season based on current date.
 * Supports auto mode (month-based) and manual override.
 * 
 * Configuration:
 * - autoTrack: boolean
 * - currentSeason: string (manual override)
 * - monthRanges: { spring: [2,3,4], summer: [5,6,7], ... }
 * - seasonNames: { spring: "Spring", ... }
 * 
 * Integration:
 * - Updates season on updateWorldTime hook
 * - Exposes to HUD augmentation layer
 */

import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

/**
 * Season settings schema
 */
const SEASON_CONFIG_SCHEMA = {
  autoTrack: { type: Boolean, default: true },
  currentSeason: { type: String, default: "spring" },
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
 * Settings key
 */
const SEASON_SETTINGS_KEY = "dnd5e-calendar.seasonConfig";

/**
 * Default season configuration
 */
function createDefaultSeasonConfig() {
  return {
    autoTrack: true,
    currentSeason: "spring",
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
  };
}

/**
 * Season Service
 * 
 * Handles season computation and tracking.
 */
class SeasonService {
  constructor() {
    this._config = null;
    this._hooksRegistered = false;
    this._initialized = false;
    
    // Current computed season (for caching)
    this._cachedSeason = null;
  }

  /**
   * Initialize the season service
   */
  async initialize() {
    if (this._initialized) return this;
    
    console.log("[DnD5e-Calendar] Initializing SeasonService");
    
    // Load configuration
    this._config = game.settings.get("world", SEASON_SETTINGS_KEY);
    if (!this._config) {
      this._config = createDefaultSeasonConfig();
      await this._saveConfig();
    }
    
    // Register hooks
    this._registerHooks();
    
    // Compute initial season
    this._cachedSeason = this.getCurrentSeason();
    
    this._initialized = true;
    console.log("[DnD5e-Calendar] SeasonService ready", {
      autoTrack: this._config.autoTrack,
      current: this._cachedSeason.name
    });
    
    return this;
  }

  /**
   * Register hooks for time updates
   */
  _registerHooks() {
    if (this._hooksRegistered) return;
    
    // Update on world time changes
    Hooks.on("updateWorldTime", (worldTime, delta, options) => {
      if (!this._config.autoTrack) return;
      
      // Check if day changed
      const daysElapsed = Math.floor(delta / 86400);
      if (daysElapsed > 0) {
        this._onDayChange(daysElapsed);
      }
    });
    
    // Also listen for calendar date changes
    Hooks.on("dnd5e-calendar:dateChange", () => {
      if (!this._config.autoTrack) return;
      this._computeAndNotify();
    });
    
    this._hooksRegistered = true;
  }

  /**
   * Handle day change
   */
  _onDayChange(days) {
    if (this._config.autoTrack) {
      this._computeAndNotify();
    }
  }

  /**
   * Compute season from current date and notify
   */
  _computeAndNotify() {
    const newSeason = this._computeSeasonFromDate();
    
    if (newSeason.key !== (this._cachedSeason?.key)) {
      const oldSeason = this._cachedSeason;
      this._cachedSeason = newSeason;
      
      // Trigger hook
      Hooks.callAll("dnd5e-calendar:seasonChange", {
        season: newSeason.key,
        name: newSeason.name,
        icon: this._getSeasonIcon(newSeason.key),
        oldSeason: oldSeason?.key,
        auto: this._config.autoTrack
      });
      
      console.log("[DnD5e-Calendar] Season changed:", oldSeason?.name, "→", newSeason.name);
    }
  }

  /**
   * Compute season from date
   */
  _computeSeasonFromDate() {
    // Get current month from dnd5e or game
    let month = 0;
    
    if (game.dnd5e?.calendar) {
      month = game.dnd5e.calendar.currentMonth;
    } else if (game.time?.worldTime !== undefined) {
      const totalHours = Math.floor(game.time.worldTime / 3600);
      const hoursPerDay = this._config.hoursPerDay || 24;
      month = Math.floor(totalHours / hoursPerDay / 30) % 12;
    }
    
    // Find matching season
    const ranges = this._config.monthRanges;
    for (const [season, months] of Object.entries(ranges)) {
      if (months.includes(month)) {
        return {
          key: season,
          name: this._config.seasonNames[season],
          month
        };
      }
    }
    
    // Default fallback
    return {
      key: "spring",
      name: this._config.seasonNames.spring,
      month
    };
  }

  /**
   * Get FontAwesome icon for season
   */
  _getSeasonIcon(season) {
    const icons = {
      spring: "leaf",
      summer: "sun",
      fall: "leaf-maple",
      winter: "snowflake"
    };
    return icons[season] || "calendar";
  }

  // ============== Public API ==============

  /**
   * Get current season
   * @returns {Object} { key, name, icon }
   */
  getCurrentSeason() {
    if (!this._config.autoTrack) {
      return {
        key: this._config.currentSeason,
        name: this._config.seasonNames[this._config.currentSeason],
        icon: this._getSeasonIcon(this._config.currentSeason)
      };
    }
    
    // Recompute if not cached
    if (!this._cachedSeason) {
      this._cachedSeason = this._computeSeasonFromDate();
    }
    
    return this._cachedSeason;
  }

  /**
   * Set season manually (GM only)
   */
  async setSeason(season) {
    if (!this._config.seasonNames[season]) {
      console.warn("[DnD5e-Calendar] Invalid season:", season);
      return;
    }
    
    const oldSeason = this._config.currentSeason;
    this._config.currentSeason = season;
    this._config.autoTrack = false;
    await this._saveConfig();
    
    this._cachedSeason = {
      key: season,
      name: this._config.seasonNames[season],
      icon: this._getSeasonIcon(season)
    };
    
    // Trigger hook
    Hooks.callAll("dnd5e-calendar:seasonChange", {
      season,
      name: this._cachedSeason.name,
      icon: this._cachedSeason.icon,
      oldSeason,
      auto: false
    });
    
    console.log("[DnD5e-Calendar] Season set manually:", season);
  }

  /**
   * Enable auto-tracking
   */
  async enableAutoTrack() {
    this._config.autoTrack = true;
    await this._saveConfig();
    
    // Recompute season
    this._computeAndNotify();
  }

  /**
   * Disable auto-tracking (switch to manual)
   */
  async disableAutoTrack() {
    this._config.autoTrack = false;
    await this._saveConfig();
  }

  /**
   * Get config
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * Update config
   */
  async updateConfig(config) {
    this._config = foundry.utils.mergeObject(this._config, config);
    await this._saveConfig();
    
    // If auto-track enabled, recompute
    if (this._config.autoTrack) {
      this._computeAndNotify();
    }
  }

  /**
   * Set season names
   */
  async setSeasonNames(names) {
    this._config.seasonNames = {
      ...this._config.seasonNames,
      ...names
    };
    await this._saveConfig();
  }

  /**
   * Set month ranges
   */
  async setMonthRanges(ranges) {
    this._config.monthRanges = {
      ...this._config.monthRanges,
      ...ranges
    };
    await this._saveConfig();
  }

  /**
   * Check if auto-tracking is enabled
   */
  isAutoTrack() {
    return this._config.autoTrack;
  }

  /**
   * Get season names
   */
  getSeasonNames() {
    return { ...this._config.seasonNames };
  }

  /**
   * Get month ranges
   */
  getMonthRanges() {
    return { ...this._config.monthRanges };
  }

  // ============== Private ==============

  async _saveConfig() {
    await game.settings.set("world", SEASON_SETTINGS_KEY, this._config);
  }
}

// Export singleton
export const SeasonService = new SeasonService();

// Also export for global access
window.SeasonService = SeasonService;