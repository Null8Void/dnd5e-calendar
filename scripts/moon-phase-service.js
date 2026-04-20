/**
 * Moon Phase Service
 * 
 * Manages moon phase system tied to elapsed in-game days.
 * 
 * Configuration:
 * - cycleDays: number (default 15)
 * - currentDay: number (day count since start)
 * - currentPhase: number (0-7)
 * 
 * 8 Phases:
 * 0. New Moon
 * 1. Waxing Crescent
 * 2. First Quarter
 * 3. Waxing Gibbous
 * 4. Full Moon
 * 5. Waning Gibbous
 * 6. Last Quarter
 * 7. Waning Crescent
 * 
 * Integration:
 * - Updates on updateWorldTime hook
 * - Provides display data to HUD injection
 */

import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

/**
 * Moon phase settings key
 */
const MOON_SETTINGS_KEY = "dnd5e-calendar.moonConfig";

/**
 * Default moon configuration
 */
function createDefaultMoonConfig() {
  return {
    cycleDays: 15,
    currentDay: 0,
    currentPhase: 0,
    enabled: true
  };
}

/**
 * 8 Moon phases
 */
const MOON_PHASES = [
  { key: "new", name: "New Moon", icon: "moon", fraction: 0 },
  { key: "waxingCrescent", name: "Waxing Crescent", icon: "moon", fraction: 0.125 },
  { key: "firstQuarter", name: "First Quarter", icon: "moon", fraction: 0.25 },
  { key: "waxingGibbous", name: "Waxing Gibbous", icon: "moon", fraction: 0.375 },
  { key: "full", name: "Full Moon", icon: "moon", fraction: 0.5 },
  { key: "waningGibbous", name: "Waning Gibbous", icon: "moon", fraction: 0.625 },
  { key: "lastQuarter", name: "Last Quarter", icon: "moon", fraction: 0.75 },
  { key: "waningCrescent", name: "Waning Crescent", icon: "moon", fraction: 0.875 }
];

/**
 * Get phase from fraction (0-1)
 */
function getPhaseFromFraction(fraction) {
  const index = Math.floor(fraction * 8) % 8;
  return MOON_PHASES[index];
}

/**
 * Get phase from day count
 */
function getPhaseFromDay(dayCount, cycleDays = 15) {
  const fraction = (dayCount % cycleDays) / cycleDays;
  return getPhaseFromFraction(fraction);
}

/**
 * MoonPhaseService
 */
class MoonPhaseService {
  constructor() {
    this._config = null;
    this._initialized = false;
  }

  /**
   * Initialize the moon phase service
   */
  async initialize() {
    if (this._initialized) return this;
    
    console.log("[DnD5e-Calendar] Initializing MoonPhaseService");
    
    // Load config
    this._config = game.settings.get("world", MOON_SETTINGS_KEY);
    if (!this._config) {
      this._config = createDefaultMoonConfig();
      await this._saveConfig();
    }
    
    // Register hooks
    this._registerHooks();
    
    this._initialized = true;
    console.log("[DnD5e-Calendar] MoonPhaseService ready", {
      cycle: this._config.cycleDays,
      day: this._config.currentDay,
      phase: this._getCurrentPhase().name
    });
    
    return this;
  }

  /**
   * Register hooks for time updates
   */
  _registerHooks() {
    // Update on world time changes
    Hooks.on("updateWorldTime", (worldTime, delta, options) => {
      const daysElapsed = Math.floor(delta / 86400);
      if (daysElapsed > 0) {
        this._onDayChange(daysElapsed);
      }
    });
    
    // Also check dnd5e day changes
    Hooks.on("dnd5e-calendar:dateChange", () => {
      this._syncFromDnd5e();
    });
  }

  /**
   * Handle day changes
   */
  _onDayChange(days) {
    if (!this._config.enabled) return;
    
    const oldDay = this._config.currentDay;
    const oldPhase = this._config.currentPhase;
    
    // Update day count (track position in cycle 0 to cycleDays-1)
    this._config.currentDay = (this._config.currentDay + days) % this._config.cycleDays;
    
    // Calculate phase from day position: (day / cycleDays) * 8 gives 0-8 range
    const phaseIndex = Math.floor((this._config.currentDay / this._config.cycleDays) * 8) % 8;
    this._config.currentPhase = phaseIndex;
    
    const oldPhaseData = MOON_PHASES[oldPhase];
    const newPhaseData = this._getCurrentPhase();
    
    // Only trigger if phase changed
    if (oldPhase !== this._config.currentPhase) {
      this._saveConfig();
      
      Hooks.callAll("dnd5e-calendar:moonPhaseChange", {
        phase: this._config.currentPhase,
        phaseName: newPhaseData.name,
        phaseKey: newPhaseData.key,
        dayCount: this._config.currentDay,
        cycleDays: this._config.cycleDays,
        oldPhase: oldPhaseData.name
      });
    }
  }

  /**
   * Sync from dnd5e system
   */
  _syncFromDnd5e() {
    // Try to sync from dnd5e calendar if available
    const dnd5eCal = game.dnd5e?.calendar;
    if (dnd5eCal) {
      // Calculate day count from dnd5e date
      const dayCount = (dnd5eCal.currentYear * 360) + 
                     (dnd5eCal.currentMonth * 30) + 
                     dnd5eCal.currentDay;
      
      if (dayCount !== this._config.currentDay) {
        this._config.currentDay = dayCount;
        this._config.currentPhase = dayCount % this._config.cycleDays;
        this._saveConfig();
      }
    }
  }

  // ============== Public API ==============

  /**
   * Get current phase data
   */
  getCurrentPhase() {
    return MOON_PHASES[this._config.currentPhase];
  }

  /**
   * Get phase name
   */
  getPhaseName() {
    return this._getCurrentPhase().name;
  }

  /**
   * Get phase icon
   */
  getPhaseIcon() {
    return this._getCurrentPhase().icon;
  }

  /**
   * Get current day in cycle
   */
  getCurrentDay() {
    return this._config.currentDay;
  }

  /**
   * Get cycle length
   */
  getCycleDays() {
    return this._config.cycleDays;
  }

  /**
   * Set cycle length (GM only)
   */
  async setCycleDays(days) {
    if (!CalendarPermissions?.canEdit()) return;
    
    this._config.cycleDays = Math.max(1, Math.min(100, days));
    this._config.currentDay = this._config.currentDay % this._config.cycleDays;
    const phaseIndex = Math.floor((this._config.currentDay / this._config.cycleDays) * 8) % 8;
    this._config.currentPhase = phaseIndex;
    await this._saveConfig();
  }

  /**
   * Set current day manually (for testing)
   */
  async setDay(day) {
    this._config.currentDay = day % this._config.cycleDays;
    const phaseIndex = Math.floor((this._config.currentDay / this._config.cycleDays) * 8) % 8;
    this._config.currentPhase = phaseIndex;
    await this._saveConfig();
    
    Hooks.callAll("dnd5e-calendar:moonPhaseChange", {
      phase: this._config.currentPhase,
      ...this.getCurrentPhase()
    });
  }

  /**
   * Enable/disable moon tracking
   */
  async setEnabled(enabled) {
    this._config.enabled = enabled;
    await this._saveConfig();
  }

  /**
   * Get config
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * Get HUD-ready display data
   */
  getHUDDisplay() {
    const phase = this.getCurrentPhase();
    return {
      name: phase.name,
      icon: phase.icon,
      day: this._config.currentDay,
      cycle: this._config.cycleDays,
      daysUntilFull: this._getDaysUntilFull(),
      daysUntilNew: this._getDaysUntilNew()
    };
  }

  /**
   * Get days until next full moon
   */
  _getDaysUntilFull() {
    // Full moon is at phase 4 (fraction 0.5)
    const targetPhase = 4;
    let days = targetPhase - this._config.currentDay;
    if (days <= 0) days += this._config.cycleDays;
    return days;
  }

  /**
   * Get days until next new moon
   */
  _getDaysUntilNew() {
    // New moon is at day 0
    let days = this._config.cycleDays - this._config.currentDay;
    if (days === this._config.cycleDays) days = 0;
    return days;
  }

  /**
   * Get current phase data
   */
  _getCurrentPhase() {
    return MOON_PHASES[this._config.currentPhase];
  }

  // ============== Private ==============

  async _saveConfig() {
    await game.settings.set("world", MOON_SETTINGS_KEY, this._config);
  }
}

// Export singleton
export const MoonPhaseService = new MoonPhaseService();

// Export for global access
window.MoonPhaseService = MoonPhaseService;

// Export phases for reference
export { MOON_PHASES };