/**
 * DnD5e Calendar - Calendar Integration Layer
 * 
 * This module extends and integrates with DnD5e's built-in calendar system.
 * Instead of creating a standalone calendar, it:
 * - Hooks into dnd5e.setupCalendar to extend the existing calendar
 * - Uses updateWorldTime for day/time changes
 * - Stores custom data (weather, holidays, seasons) in calendar.flags
 * - Provides companion UI for custom features
 */

import { CalendarData } from "./calendar-data.js";
import { CalendarUtils } from "./calendar-utils.js";
import { CalendarDebug } from "./calendar-debug.js";
import { MoonPhaseManager } from "./moon-phase-manager.js";
import { WeatherManager } from "./weather-manager.js";
import { SeasonManager } from "./season-manager.js";
import { HolidayManager } from "./holiday-manager.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

console.log("[DnD5e-Calendar] DEBUG: calendar-integration.js LOADED");

export class DnD5eCalendarIntegration {
  constructor() {
    console.log("[DnD5e-Calendar] DEBUG: DnD5eCalendarIntegration constructor fired");
    this.dnd5eCalendar = null;
    this.customData = null;
    this.moonManager = new MoonPhaseManager(this);
    this.weatherManager = new WeatherManager(this);
    this.seasonManager = new SeasonManager(this);
    this.holidayManager = new HolidayManager(this);
  }

  /**
   * Initialize the integration layer
   * Called after dnd5e calendar is set up
   */
  async initialize() {
    console.log("[DnD5e-Calendar] DEBUG: DnD5eCalendarIntegration.initialize() STARTED");
    
    CalendarDebug.feature("calendar", "Initializing DnD5e Calendar Integration");
    
    // Load custom data from calendar flags
    await this.loadCustomData();
    
    // Initialize managers
    this.moonManager.initialize(this.customData.moon);
    this.weatherManager.initialize(this.customData.weather);
    this.seasonManager.initialize(this.customData.season);
    this.holidayManager.initialize();
    
    // Register updateWorldTime hook for day changes
    this.registerWorldTimeHooks();
    
    CalendarDebug.feature("calendar", "Integration initialized successfully");
    console.log("[DnD5e-Calendar] Integration initialized with calendar:", this.dnd5eCalendar?.name);
  }

  /**
   * Hook into dnd5e.setupCalendar - This is the entry point for integration
   * @param {Object} calendar - The DnD5e calendar instance
   */
  setupCalendar(calendar) {
    console.log("[DnD5e-Calendar] DEBUG: dnd5e.setupCalendar hook fired!", calendar);
    CalendarDebug.feature("calendar", "dnd5e.setupCalendar hook fired", calendar);
    
    this.dnd5eCalendar = calendar;
    
    // Extend calendar with custom flags if not present
    if (!calendar.flags?.['dnd5e-calendar']) {
      if (!calendar.flags) calendar.flags = {};
      calendar.flags['dnd5e-calendar'] = {
        version: CALENDAR_CONSTANTS.VERSION,
        weather: CALENDAR_CONSTANTS.WEATHER.TYPES[0],
        gmNotes: "",
        season: {
          current: "spring",
          autoTrack: true,
          seasonNames: {
            spring: game.i18n.localize("DNDCAL.Season.Spring") || "Spring",
            summer: game.i18n.localize("DNDCAL.Season.Summer") || "Summer",
            fall: game.i18n.localize("DNDCAL.Season.Fall") || "Fall",
            winter: game.i18n.localize("DNDCAL.Season.Winter") || "Winter"
          }
        },
        moon: {
          cycleDays: CALENDAR_CONSTANTS.MOON.DEFAULT_CYCLE_DAYS,
          currentPhase: 0,
          currentDay: 0,
          enabled: true
        },
        holidays: {
          approved: [],
          pending: [],
          rejected: []
        }
      };
    }
    
    // Add custom month ranges to calendar
    this.extendCalendarMonths(calendar);
    
    // Initialize custom features
    this.initialize();
    
    // Register hooks for UI updates
    this.registerUIHooks();
    
    return calendar;
  }

  /**
   * Extend the calendar with custom configuration options
   * @param {Object} calendar - The calendar instance
   */
  extendCalendarMonths(calendar) {
    // Add custom properties if they don't exist
    if (!calendar.showSeasonNames) {
      calendar.showSeasonNames = true;
    }
    if (!calendar.customName) {
      calendar.customName = calendar.name || "Campaign Calendar";
    }
    
    CalendarDebug.feature("calendar", "Extended calendar with custom properties", {
      customName: calendar.customName,
      showSeasonNames: calendar.showSeasonNames
    });
  }

  /**
   * Load custom data from the calendar flags
   */
  async loadCustomData() {
    CalendarDebug.feature("data", "Loading custom data from calendar flags");
    
    if (this.dnd5eCalendar?.flags?.['dnd5e-calendar']) {
      const savedData = this.dnd5eCalendar.flags['dnd5e-calendar'];
      this.customData = {
        weather: {
          current: savedData.weather || "Clear skies",
          gmNotes: savedData.gmNotes || ""
        },
        season: savedData.season || {
          current: "spring",
          autoTrack: true,
          seasonNames: CALENDAR_CONSTANTS.SEASONS.NAMES
        },
        moon: savedData.moon || {
          cycleDays: CALENDAR_CONSTANTS.MOON.DEFAULT_CYCLE_DAYS,
          currentPhase: 0,
          currentDay: 0,
          enabled: true
        },
        holidays: savedData.holidays || {
          approved: [],
          pending: [],
          rejected: []
        }
      };
    } else {
      this.customData = {
        weather: {
          current: "Clear skies",
          gmNotes: ""
        },
        season: {
          current: "spring",
          autoTrack: true,
          seasonNames: CALENDAR_CONSTANTS.SEASONS.NAMES
        },
        moon: {
          cycleDays: CALENDAR_CONSTANTS.MOON.DEFAULT_CYCLE_DAYS,
          currentPhase: 0,
          currentDay: 0,
          enabled: true
        },
        holidays: {
          approved: [],
          pending: [],
          rejected: []
        }
      };
    }
    
    CalendarDebug.feature("data", "Custom data loaded", this.customData);
  }

  /**
   * Save custom data to calendar flags
   */
  async saveCustomData() {
    if (!this.dnd5eCalendar) {
      CalendarDebug.warn("Cannot save custom data - calendar not initialized");
      return;
    }
    
    this.dnd5eCalendar.flags['dnd5e-calendar'] = {
      version: CALENDAR_CONSTANTS.VERSION,
      weather: this.customData.weather,
      season: this.customData.season,
      moon: this.customData.moon,
      holidays: this.customData.holidays
    };
    
    CalendarDebug.feature("data", "Custom data saved to calendar flags");
  }

  /**
   * Register hooks for updateWorldTime events
   */
  registerWorldTimeHooks() {
    console.log("[DnD5e-Calendar] DEBUG: registerWorldTimeHooks() called");
    
    Hooks.on("updateWorldTime", (worldTime, delta, options) => {
      console.log("[DnD5e-Calendar] DEBUG: updateWorldTime fired!", { worldTime, delta, options });
      CalendarDebug.feature("time", "updateWorldTime hook fired", { worldTime, delta, options });
      
      // Check for midnight transition (new day)
      const dnd5eDeltas = options?.dnd5e?.deltas || {};
      const midnights = dnd5eDeltas.midnights || 0;
      
      if (midnights > 0 || delta >= 86400) {
        this.onNewDay();
      }
      
      // Update moon phase if needed
      this.updateMoonPhase();
      
      // Call season manager day change
      if (midnights > 0) {
        this.seasonManager.onDayChange(null, this.getDate());
      }
      
      // Emit custom hook for our features
      Hooks.callAll("dnd5e-calendar:timeUpdate", {
        worldTime,
        delta,
        midnights,
        isNewDay: midnights > 0
      });
    });
    
    CalendarDebug.feature("hooks", "updateWorldTime hook registered");
  }

  /**
   * Register UI-related hooks
   */
  registerUIHooks() {
    Hooks.on("dnd5e-calendar:timeUpdate", () => {
      Hooks.callAll("dnd5e-calendar:render");
    });
    
    Hooks.on("dnd5e-calendar:weatherChange", () => {
      this.updateWeatherVisualEffect();
      Hooks.callAll("dnd5e-calendar:render");
    });
    
    Hooks.on("dnd5e-calendar:seasonChange", () => {
      Hooks.callAll("dnd5e-calendar:render");
    });
    
    Hooks.callAll("dnd5e-calendar:integrationReady");
    
    CalendarDebug.feature("hooks", "UI hooks registered");
  }

  /**
   * Handle new day events
   */
  onNewDay() {
    console.log("[DnD5e-Calendar] DEBUG: onNewDay() fired");
    CalendarDebug.feature("calendar", "New day detected!");
    
    // Auto-roll weather if enabled
    if (this.customData.season.autoWeatherRoll) {
      this.seasonManager.rollWeatherForDay(this.getDate());
    }
    
    // Emit day change hook
    Hooks.callAll("dnd5e-calendar:dayChange", this.getDate());
  }

  /**
   * Update moon phase based on current day count
   */
  updateMoonPhase() {
    if (!this.customData.moon.enabled) return;
    
    const dayCount = this.getDayCount();
    const oldPhase = this.customData.moon.currentDay % this.customData.moon.cycleDays;
    const newPhase = dayCount % this.customData.moon.cycleDays;
    
    if (oldPhase !== newPhase) {
      this.customData.moon.currentDay = dayCount;
      this.moonManager.updateMoonPhase(dayCount);
      this.saveCustomData();
    }
  }

  /**
   * Get the current date from dnd5e calendar
   */
  getDate() {
    if (!this.dnd5eCalendar) return { day: 1, month: 0, year: 0 };
    
    return {
      day: this.dnd5eCalendar.currentDay || 1,
      month: this.dnd5eCalendar.currentMonth ?? 0,
      year: this.dnd5eCalendar.currentYear || 0
    };
  }

  /**
   * Get the current time
   */
  getTime() {
    if (!this.dnd5eCalendar) return { hour: 0, minute: 0 };
    
    return {
      hour: this.dnd5eCalendar.currentHour || 0,
      minute: this.dnd5eCalendar.currentMinute || 0
    };
  }

  /**
   * Get total day count
   */
  getDayCount() {
    if (!this.dnd5eCalendar) return 0;
    
    const { day, month, year } = this.getDate();
    const calendar = this.dnd5eCalendar;
    
    if (!calendar.months || !calendar.months.length) return 0;
    
    let totalDays = day;
    for (let m = 0; m < month; m++) {
      totalDays += calendar.months[m]?.length || 30;
    }
    totalDays += year * calendar.months.reduce((sum, m) => sum + (m?.length || 30), 0);
    
    return totalDays;
  }

  /**
   * Get the dnd5e calendar instance
   */
  getCalendar() {
    return this.dnd5eCalendar;
  }

  /**
   * Set custom calendar name
   */
  setCalendarName(name) {
    if (this.dnd5eCalendar) {
      this.dnd5eCalendar.customName = name;
      CalendarDebug.feature("calendar", "Calendar name updated", { name });
      Hooks.callAll("dnd5e-calendar:calendarNameChanged", name);
    }
  }

  /**
   * Get custom calendar name
   */
  getCalendarName() {
    return this.dnd5eCalendar?.customName || this.dnd5eCalendar?.name || "Campaign Calendar";
  }

  /**
   * Update weather
   */
  setWeather(weather) {
    const oldWeather = this.customData.weather.current;
    this.customData.weather.current = weather;
    this.weatherManager.setWeather(weather);
    this.saveCustomData();
    
    Hooks.callAll("dnd5e-calendar:weatherChange", { old: oldWeather, new: weather });
  }

  /**
   * Get current weather
   */
  getWeather() {
    return this.customData.weather.current;
  }

  /**
   * Get current season
   */
  getSeason() {
    return this.seasonManager.getCurrentSeason();
  }

  /**
   * Get current moon phase
   */
  getMoonPhase() {
    return this.moonManager.getPhase();
  }

  /**
   * Update weather visual effect overlay
   */
  updateWeatherVisualEffect() {
    const container = document.getElementById("dnd5e-calendar-weather-effect");
    if (!container) return;

    const weatherEffect = this.weatherManager.getWeatherEffect();
    container.className = "weather-effect-container";

    if (weatherEffect) {
      container.classList.add("active");
      container.classList.add(weatherEffect);
    }
  }
}

// Create singleton instance
export const DnD5eCalendar = new DnD5eCalendarIntegration();

window.DnD5eCalendar = DnD5eCalendar;
