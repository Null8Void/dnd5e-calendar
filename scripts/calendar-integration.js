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

import { CalendarData, CalendarState } from "./calendar-data.js";
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
      
      // Update moon phase - runs on EVERY time update to catch changes
      this.updateMoonPhase();
      
      // Call season manager day change
      if (midnights > 0) {
        this.seasonManager.onDayChange(null, this.getDate());
      }
      
      // Update scene darkness on time change
      this.updateSceneDarkness();
      
      // Sync centralized state for data-driven HUD
      this.syncState();
      
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
    
    // Handle sunrise/sunset for day/night visual effects
    Hooks.on("dnd5e-calendar:sunrise", () => {
      this.updateSceneDarkness();
      Hooks.callAll("dnd5e-calendar:dayNightChange", { period: "day", isDay: true });
    });
    
    Hooks.on("dnd5e-calendar:sunset", () => {
      this.updateSceneDarkness();
      Hooks.callAll("dnd5e-calendar:dayNightChange", { period: "night", isDay: false });
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
    
    if (this.customData.season.autoTrackSeasons) {
      this.seasonManager.enableAutoTrack(true);
    }
    
    if (this.customData.season.autoWeatherRoll) {
      this.seasonManager.rollWeatherForDay(this.getDate());
    }
    
    this.updateSceneDarkness();
    
    Hooks.callAll("dnd5e-calendar:dayChange", this.getDate());
  }
  
  updateSceneDarkness() {
    const time = this.getTime();
    const dayStartHour = CALENDAR_CONSTANTS.DAY_NIGHT.DAY_START_HOUR;
    const nightStartHour = CALENDAR_CONSTANTS.DAY_NIGHT.NIGHT_START_HOUR;
    
    let darkness = 0;
    if (time.hour >= nightStartHour || time.hour < dayStartHour) {
      darkness = 0.7;
    } else if (time.hour >= nightStartHour - 2 || time.hour < dayStartHour + 2) {
      darkness = 0.35;
    }
    
    if (game.scenes?.active && canvas?.scene) {
      canvas.scene.update({ darkness });
      Hooks.callAll("dnd5e-calendar:darknessChange", darkness);
    }
  }

  /**
   * Update moon phase based on current day count
   * Called every updateWorldTime to ensure phase is current
   */
  updateMoonPhase() {
    if (!this.customData?.moon?.enabled) return;
    
    const dayCount = this.getDayCount();
    const cycleDays = this.customData.moon.cycleDays || 15;
    const previousPhase = this.customData.moon.currentDay % cycleDays;
    const currentPhase = dayCount % cycleDays;
    
    // Only trigger hook if phase actually changed
    if (previousPhase !== currentPhase) {
      console.log(`[DnD5e-Calendar] Moon phase changed: ${previousPhase} -> ${currentPhase} (day ${dayCount})`);
      
      this.customData.moon.currentDay = dayCount;
      const phaseData = this.moonManager.updateMoonPhase(dayCount);
      
      // Fire moon phase change hook
      Hooks.callAll("dnd5e-calendar:moonPhaseChange", {
        day: currentPhase,
        phase: this.moonManager.getPhase(),
        dayCount: dayCount
      });
      
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
    const weatherEffect = this.weatherManager.getWeatherEffect();
    const weather = this.weatherManager.getWeather();
    
    // Update CSS overlay effect
    if (container) {
      container.className = "weather-effect-container";
      if (weatherEffect) {
        container.classList.add("active");
        container.classList.add(weatherEffect);
      }
    }
    
    // Integrate with FXMaster if available
    if (game.modules.get("fxmaster")?.active) {
      this.applyFXMasterWeather(weather);
    }
    
    Hooks.callAll("dnd5e-calendar:weatherEffect", { weather, effect: weatherEffect });
  }

  /**
   * Apply weather effects via FXMaster API
   */
  applyFXMasterWeather(weather) {
    if (!game.fxmaster) return;
    
    const weatherEffects = {
      "Light rain": { type: "rain", intensity: 0.3 },
      "Heavy rain": { type: "rain", intensity: 0.7 },
      "Thunderstorm": { type: "rain", intensity: 1.0, lightning: true },
      "Light snow": { type: "snow", intensity: 0.3 },
      "Heavy snow": { type: "snow", intensity: 0.7 },
      "Blizzard": { type: "snow", intensity: 1.0 },
      "Foggy": { type: "fog", intensity: 0.5 },
      "Windy": { type: "wind", intensity: 0.5 }
    };
    
    const effect = weatherEffects[weather];
    if (effect) {
      // FXMaster API call (if available)
      try {
        game.fxmaster.applyWeatherEffect(effect.type, effect.intensity);
      } catch (e) {
        console.log("[DnD5e-Calendar] FXMaster not available:", e);
      }
    } else {
      try {
        game.fxmaster.clearWeatherEffect();
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Sync the centralized state object with current calendar data
   * This drives the data-driven HUD
   * Also syncs with persistent CalendarState in game settings
   */
  syncState() {
    if (!this.dnd5eCalendar) return CalendarState.get();
    
    const date = this.getDate();
    const time = this.getTime();
    const calendar = this.dnd5eCalendar;
    
    // Get current persisted state
    const state = CalendarState.get();
    
    // Update date and time from dnd5e calendar
    state.date = date;
    state.time = time;
    
    // Update weather
    state.weather = {
      current: this.weatherManager.getWeather(),
      mode: state.weather?.mode || "manual",
      icon: this.weatherManager.getWeatherIcon()
    };
    
    // Update season
    state.season.current = this.seasonManager.getCurrentSeason();
    state.season.seasonNames = state.season.seasonNames || {
      spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter"
    };
    
    // Update moon phase
    const moonPhase = this.moonManager.getPhase();
    state.moon = state.moon || {};
    state.moon.currentDay = state.moon.currentDay || 0;
    state.moon.cycleDays = state.moon.cycleDays || 10;
    state.moon.phase = moonPhase;
    state.moon.icon = CalendarUtils.getMoonPhaseIcon(moonPhase.key);
    
    // Update day/night
    state.isDay = time.hour >= 6 && time.hour < 18;
    
    // Update day of week
    if (calendar.weekdays && calendar.months) {
      state.dayOfWeek = CalendarUtils.getDayOfWeek(date.day, date.month, date.year, calendar)?.name || "Starday";
    }
    
    // Check for holidays
    const holiday = this.holidayManager.getHolidayOnDate(date.day, date.month, date.year, "primary");
    state.isHoliday = !!holiday;
    state.holidays = holiday ? [holiday] : [];
    
    // Update auto weather roll setting
    state.autoWeatherRoll = this.seasonManager.isAutoWeatherRollEnabled();
    
    // Mark state as updated
    state.lastUpdate = Date.now();
    
    // Sync back to persisted state
    CalendarState.set(state);
    
    return state;
  }

  /**
   * Get the centralized state object
   * HUD binds to this for reactive updates
   */
  getState() {
    return this.syncState();
  }
  
  /**
   * Get specific value from state
   */
  getFromState(path) {
    const state = CalendarState.get();
    const keys = path.split(".");
    let current = state;
    for (const key of keys) {
      if (current === undefined) return null;
      current = current[key];
    }
    return current;
  }
  
  /**
   * Update specific value in state
   */
  async setInState(path, value) {
    await CalendarState.update(path, value);
    this.syncState();
  }
}

// Create singleton instance
export const DnD5eCalendar = new DnD5eCalendarIntegration();

window.DnD5eCalendar = DnD5eCalendar;
