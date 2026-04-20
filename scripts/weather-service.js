/**
 * Weather Manager Service
 * 
 * Manages weather configuration and settings.
 * Uses existing WeatherManager for the core logic.
 * 
 * Key features:
 * - 14 weather types (from constant)
 * - GM can set weather and add private notes
 * - Player view sees weather type only
 * - Integrated with HUD Augmentation
 */

import { CALENDAR_CONSTANTS } from "./calendar-constants.js";
import { CalendarPermissions } from "./calendar-permissions.js";

/**
 * Weather settings key
 */
const WEATHER_SETTINGS_KEY = "dnd5e-calendar.weatherConfig";

/**
 * Default weather configuration
 */
function createDefaultWeatherConfig() {
  return {
    currentWeather: "Clear skies",
    weatherMode: "manual",
    gmNotes: "",
    autoRoll: false,
    weatherHistory: []
  };
}

/**
 * Get all weather types with FontAwesome icons
 */
function getWeatherTypes() {
  return [
    { key: "Clear skies", icon: "sun" },
    { key: "Partly cloudy", icon: "cloud-sun" },
    { key: "Overcast", icon: "cloud" },
    { key: "Light rain", icon: "cloud-rain" },
    { key: "Heavy rain", icon: "cloud-showers-heavy" },
    { key: "Thunderstorm", icon: "bolt" },
    { key: "Light snow", icon: "snowflake" },
    { key: "Heavy snow", icon: "snowflakes" },
    { key: "Foggy", icon: "smog" },
    { key: "Windy", icon: "wind" },
    { key: "Hot", icon: "temperature-high" },
    { key: "Cold", icon: "temperature-low" },
    { key: "Blizzard", icon: "snowstorm" },
    { key: "Hail", icon: "cloud-hail" }
  ];
}

/**
 * Get FontAwesome icon for weather type
 */
function getWeatherIcon(weather) {
  const types = getWeatherTypes();
  const found = types.find(t => t.key === weather);
  return found?.icon || "cloud";
}

/**
 * WeatherManagerService
 * 
 * Handles weather settings and configuration.
 * Delegates core weather logic to existing WeatherManager.
 */
class WeatherManagerService {
  constructor() {
    this._config = null;
    this._initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this._initialized) return this;
    
    console.log("[DnD5e-Calendar] Initializing WeatherManagerService");
    
    // Load config
    this._config = game.settings.get("world", WEATHER_SETTINGS_KEY);
    if (!this._config) {
      this._config = createDefaultWeatherConfig();
      await this._saveConfig();
    }
    
    this._initialized = true;
    console.log("[DnD5e-Calendar] WeatherManagerService ready", this._config);
    
    return this;
  }

  // ============== Public API ==============

  /**
   * Get current weather type
   */
  getWeather() {
    return this._config.currentWeather;
  }

  /**
   * Get weather icon
   */
  getWeatherIcon() {
    return getWeatherIcon(this._config.currentWeather);
  }

  /**
   * Set weather manually (GM only)
   */
  async setWeather(weather, notes = null) {
    if (!CalendarPermissions.canEdit()) return false;
    
    const types = getWeatherTypes().map(t => t.key);
    if (!types.includes(weather)) {
      console.warn("[DnD5e-Calendar] Invalid weather:", weather);
      return false;
    }
    
    const oldWeather = this._config.currentWeather;
    this._config.currentWeather = weather;
    this._config.weatherMode = "manual";
    
    if (notes !== null) {
      this._config.gmNotes = notes;
    }
    
    await this._saveConfig();
    
    // Trigger hook
    Hooks.callAll("dnd5e-calendar:weatherChange", {
      weather: weather,
      oldWeather,
      mode: "manual"
    });
    
    return true;
  }

  /**
   * Set GM notes (private)
   */
  async setGMNotes(notes) {
    if (!CalendarPermissions.canEdit()) return;
    
    this._config.gmNotes = notes;
    await this._saveConfig();
  }

  /**
   * Get GM notes (only for GM)
   */
  getGMNotes() {
    if (!CalendarPermissions.canEdit()) return null;
    return this._config.gmNotes;
  }

  /**
   * Enable auto-roll on day change
   */
  async setAutoRoll(enabled) {
    if (!CalendarPermissions.canEdit()) return;
    
    this._config.autoRoll = enabled;
    this._config.weatherMode = enabled ? "auto" : "manual";
    await this._saveConfig();
  }

  /**
   * Get all weather types
   */
  getWeatherTypes() {
    return getWeatherTypes();
  }

  /**
   * Get config
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * Get public config (without GM notes for players)
   */
  getPublicConfig() {
    return {
      currentWeather: this._config.currentWeather,
      weatherMode: this._config.weatherMode
    };
  }

  // ============== Private ==============

  async _saveConfig() {
    await game.settings.set("world", WEATHER_SETTINGS_KEY, this._config);
  }
}

// Export singleton
export const WeatherManagerService = new WeatherManagerService();

// Export for global access
window.WeatherManagerService = WeatherManagerService;

// Also export utility
window.getWeatherIcon = getWeatherIcon;