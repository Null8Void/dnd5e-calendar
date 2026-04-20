/**
 * HUD Augmentation Service
 * 
 * Injects additional elements into the existing dnd5e calendar HUD.
 * 
 * Now delegates to HUDRenderer for centralized rendering.
 * Kept for backwards compatibility and fallback.
 */

import { CalendarIntegration } from "./calendar-integration-service.js";
import { TimeTracking } from "./time-tracking-service.js";
import { HUDRenderer } from "./hud-renderer.js";

/**
 * HUD Augmentation Service
 * 
 * Injects elements into the dnd5e calendar HUD.
 */
class HUDAugmentationService {
  constructor() {
    this._hooksRegistered = false;
    this._injectedElements = null;
    this._enabled = true;
  }

  /**
   * Initialize the HUD augmentation
   */
  initialize() {
    if (this._hooksRegistered) return;
    
    console.log("[DnD5e-Calendar] Initializing HUD augmentation");
    
    // Check if HUDRenderer should take precedence
    if (window.HUDRenderer && typeof window.HUDRenderer.initialize === 'function') {
      console.log("[DnD5e-Calendar] HUDRenderer available - HUDAugmentation acts as fallback only");
    }
    
    this._registerHooks();
    console.log("[DnD5e-Calendar] HUD augmentation ready");
  }

  /**
   * Register hooks for HUD rendering
   * Only registers if no other renderer is active
   */
  _registerHooks() {
    if (this._hooksRegistered) return;
    
    // Only register render hooks, rely on event bubbling for updates
    Hooks.on("renderApplication", (app, html, options) => {
      const isDnd5eHUD = app.constructor.name === "CalendarHUD" || 
          app.constructor.name === "BaseCalendarHUD" ||
          app.constructor.name.includes("Dnd5e");
      
      // Only inject if HUDRenderer hasn't already done so
      if (isDnd5eHUD && !document.querySelector('.dnd5e-calendar-additional[data-version="14"]')) {
        this._injectIntoHUD(html, app);
      }
    });
    
    this._hooksRegistered = true;
  }

  /**
   * Find and attempt to augment the dnd5e HUD
   */
  _findAndAugmentHUD() {
    // Look for existing dnd5e HUD elements
    const existingHUD = document.querySelector(".dnd5e-bars .calendar");
    if (existingHUD) {
      console.log("[DnD5e-Calendar] Found dnd5e HUD, preparing augmentation");
      return;
    }
    
    // Try finding by class or id patterns used by dnd5e
    const possibleHuds = [
      document.querySelector("#dnd5e-hud"),
      document.querySelector(".dnd5e-hud"),
      document.querySelector('[data-app="dnd5e"]'),
      document.querySelector('[id*="dnd5e"]')
    ];
    
    for (const hud of possibleHuds) {
      if (hud) {
        console.log("[DnD5e-Calendar] Found dnd5e HUD element");
        return;
      }
    }
  }

  /**
   * Inject elements into rendered HUD
   * @param {HTMLElement} html - Rendered HTML
   * @param {Object} app - Application instance
   */
  _injectIntoHUD(html, app) {
    if (!this._enabled || this._injectedElements) return;
    
    // Check if this is dnd5e calendar HUD
    const isDnd5eHUD = this._isDnd5eHUD(app);
    if (!isDnd5eHUD) return;
    
    console.log("[DnD5e-Calendar] Injecting into dnd5e HUD");
    
    // Find insertion point
    const insertionPoint = this._findInsertionPoint(html);
    if (!insertionPoint) {
      console.log("[DnD5e-Calendar] No insertion point found");
      return;
    }
    
    // Create additional elements
    const additionalElements = this._createAdditionalElements();
    
    // Inject after insertion point
    insertionPoint.insertAdjacentHTML("afterend", additionalElements);
    
    this._injectedElements = true;
    console.log("[DnD5e-Calendar] Elements injected successfully");
  }

  /**
   * Check if application is dnd5e calendar HUD
   * @param {Object} app - Application instance
   * @returns {boolean}
   */
  _isDnd5eHUD(app) {
    if (!app) return false;
    const name = app.constructor.name;
    const id = app.id || "";
    
    if (name === "CalendarHUD" || 
        name === "BaseCalendarHUD" ||
        name.includes("Dnd5e")) {
      return true;
    }
    
    if (id.includes("dnd5e-calendar") ||
        id === "calendar-hud" ||
        id === "dnd5e-hud") {
      return true;
    }
    
    if (name.includes("Calendar") && name.includes("HUD")) {
      return true;
    }
    
    return false;
  }

  /**
   * Find appropriate insertion point in the HUD
   * @param {HTMLElement} html - HTML root
   * @returns {HTMLElement|null}
   */
  _findInsertionPoint(html) {
    // Try various common insertion points
    const selectors = [
      ".calendar-date",
      ".day-cycle",
      "[data-day-info]",
      ".dnd5e-time",
      ".time-display",
      "flex-row",
      ".control-bar",
      "header"
    ];
    
    for (const selector of selectors) {
      const el = html.querySelector(selector);
      if (el) return el;
    }
    
    // Fallback: return first flex container
    const flex = html.querySelector('[style*="flex"], .flex, .row');
    if (flex) return flex;
    
    return html.firstElementChild;
  }

  /**
   * Create HTML for additional elements
   * Delegates to HUDRenderer for centralized rendering
   * @returns {string} HTML string
   */
  _createAdditionalElements() {
    if (window.HUDRenderer?.render) {
      return window.HUDRenderer.render();
    }
    return this._createFallbackElements();
  }

  /**
   * Fallback elements if HUDRenderer unavailable
   * @returns {string} HTML string
   */
  _createFallbackElements() {
    const secondaryCal = CalendarIntegration.getSecondaryCalendar();
    const timeOffset = CalendarIntegration.getTimeOffset();
    
    return `
      <div class="dnd5e-calendar-additional" data-augmented="true" data-version="14">
        <div class="additional-calendar">
          <span class="label">Alt:</span>
          <span class="value">${secondaryCal?.currentMonth + 1}/${secondaryCal?.currentDay}/${secondaryCal?.currentYear}</span>
          ${timeOffset !== 0 ? `<span class="offset">(${timeOffset > 0 ? '+' : ''}${timeOffset}d)</span>` : ''}
        </div>
        ${this._createWeatherElement()}
        ${this._createSeasonElement()}
        ${this._createMoonElement()}
        ${this._createHolidayElement()}
      </div>
    `;
  }

  /**
   * Create weather element HTML
   */
  _createWeatherElement() {
    // Try WeatherManagerService first, fallback to DnD5eCalendar
    const weather = window.WeatherManagerService?.getWeather() || 
                    DnD5eCalendar?.weatherManager?.getWeather() || 
                    "Clear skies";
    const icon = window.WeatherManagerService?.getWeatherIcon() || 
                 this._getWeatherIcon(weather);
    return `
      <div class="weather-indicator" data-tooltip="${weather}">
        <i class="fas fa-${icon}"></i>
      </div>
    `;
  }

  /**
   * Create season element HTML
   */
  _createSeasonElement() {
    // Try SeasonService first, fallback to DnD5eCalendar
    const seasonData = window.SeasonService?.getCurrentSeason();
    const season = seasonData?.name || 
                  DnD5eCalendar?.seasonManager?.getCurrentSeasonName() || 
                  "Spring";
    const seasonKey = seasonData?.key || season.toLowerCase();
    const icon = this._getSeasonIcon(seasonKey);
    return `
      <div class="season-indicator">
        <i class="fas fa-${icon}"></i>
        <span class="season-name">${season}</span>
      </div>
    `;
  }

  /**
   * Create moon element HTML
   */
  _createMoonElement() {
    // Try MoonPhaseService first, fallback to DnD5eCalendar
    const moonData = window.MoonPhaseService?.getHUDDisplay() || 
                   { name: "New Moon", icon: "moon" };
    return `
      <div class="moon-indicator" data-tooltip="${moonData.name}">
        <i class="fas fa-${moonData.icon}"></i>
      </div>
    `;
  }

  /**
   * Create holiday element HTML
   */
  _createHolidayElement() {
    const currentDate = CalendarIntegration.getCurrentDate();
    const activeCalId = CalendarIntegration.getActiveCalendarId();
    
    const holiday = DnD5eCalendar?.holidayManager?.getHolidayOnDate(
      currentDate.day, 
      currentDate.month, 
      currentDate.year, 
      activeCalId
    );
    
    if (!holiday) return '';
    
    const description = holiday.description ? ` - ${holiday.description}` : '';
    return `
      <div class="holiday-indicator" data-tooltip="${holiday.name}${description}">
        <i class="fas fa-glass-cheers"></i>
        <span class="holiday-name">${holiday.name}</span>
      </div>
    `;
  }

  /**
   * Get FontAwesome icon for weather
   */
  _getWeatherIcon(weather) {
    const icons = {
      "Clear skies": "sun",
      "Partly cloudy": "cloud-sun",
      "Overcast": "cloud",
      "Light rain": "cloud-rain",
      "Heavy rain": "cloud-showers-heavy",
      "Thunderstorm": "bolt",
      "Light snow": "snowflake",
      "Heavy snow": "snowflakes",
      "Foggy": "smog",
      "Windy": "wind",
      "Hot": "temperature-high",
      "Cold": "temperature-low",
      "Blizzard": "snowstorm",
      "Hail": "cloud-hail"
    };
    return icons[weather] || "cloud";
  }

  /**
   * Get FontAwesome icon for season
   */
  _getSeasonIcon(season) {
    const icons = {
      "Spring": "leaf",
      "Summer": "sun",
      "Fall": "leaf-maple",
      "Winter": "snowflake"
    };
    return icons[season] || "calendar";
  }

  /**
   * Get FontAwesome icon for moon phase
   */
  _getMoonIcon(phase) {
    const icons = {
      "New Moon": "moon",
      "Waxing Crescent": "moon",
      "First Quarter": "moon",
      "Waxing Gibbous": "moon",
      "Full Moon": "moon",
      "Waning Gibbous": "moon",
      "Last Quarter": "moon",
      "Waning Crescent": "moon"
    };
    return icons[phase] || "moon";
  }

  /**
   * Update injected elements (called on data changes)
   */
  _updateInjection() {
    if (!this._injectedElements) return;
    
    // Find our container
    const container = document.querySelector(".dnd5e-calendar-additional[data-augmented='true']");
    if (!container) {
      this._injectedElements = null;
      return;
    }
    
    // Update content
    container.innerHTML = this._createAdditionalElements();
  }

  /**
   * Enable/disable augmentation
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    if (!enabled && this._injectedElements) {
      const container = document.querySelector(".dnd5e-calendar-additional[data-augmented='true']");
      if (container) {
        container.remove();
      }
      this._injectedElements = null;
    }
  }
}

// Export singleton
export const HUDAugmentation = new HUDAugmentationService();

// Also export for global access
window.HUDAugmentation = HUDAugmentation;