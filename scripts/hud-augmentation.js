/**
 * HUD Augmentation Service
 * 
 * Injects additional elements into the existing dnd5e calendar HUD.
 * Preserves original layout and functionality.
 * 
 * Technical approach:
 * - Uses Hooks.on("render<ApplicationName>") to inject HTML
 * - Appends elements cleanly without DOM hacks
 * - Handles re-renders safely
 * 
 * Injected elements:
 * - Secondary calendar display
 * - Season indicator
 * - Weather indicator  
 * - Moon phase display
 */

import { CalendarIntegration } from "./calendar-integration-service.js";
import { TimeTracking } from "./time-tracking-service.js";

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
    
    // Try to find and augment dnd5e's calendar HUD
    this._findAndAugmentHUD();
    
    // Also listen for render events
    this._registerHooks();
    
    console.log("[DnD5e-Calendar] HUD augmentation ready");
  }

  /**
   * Register hooks for HUD rendering
   */
  _registerHooks() {
    // Hook into dnd5e's MainHUD if available
    if (typeof MainHUD !== "undefined") {
      Hooks.on("renderMainHUD", (app, html, options) => {
        this._injectIntoHUD(html, app);
      });
    }
    
    // Hook into dnd5e calendar application
    Hooks.on("renderApplication", (app, html, options) => {
      if (app.constructor.name === "MainHUD" || 
          app.constructor.name === "Dnd5eHUD" ||
          app.id?.includes("dnd5e")) {
        this._injectIntoHUD(html, app);
      }
    });
    
    // Generic fallback - check for dnd5e calendar elements
    Hooks.on("renderChatLog", (app, html, options) => {
      // Only inject if we haven't found the HUD yet
      if (!this._injectedElements) {
        this._findAndAugmentHUD();
      }
    });
    
    // Listen for calendar updates to refresh injection
    Hooks.on("dnd5e-calendar:dateChange", () => this._updateInjection());
    Hooks.on("dnd5e-calendar:timeChange", () => this._updateInjection());
    Hooks.on("dnd5e-calendar:seasonChange", () => this._updateInjection());
    Hooks.on("dnd5e-calendar:weatherChange", () => this._updateInjection());
    Hooks.on("dnd5e-calendar:moonPhaseChange", () => this._updateInjection());
    
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
    
    return name.includes("HUD") || 
           name.includes("Calendar") ||
           id.includes("dnd5e") ||
           id.includes("calendar") ||
           id.includes("Dnd");
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
   * @returns {string} HTML string
   */
  _createAdditionalElements() {
    // Get current data from services
    const secondaryCal = CalendarIntegration.getSecondaryCalendar();
    const timeOffset = CalendarIntegration.getTimeOffset();
    const allCals = CalendarIntegration.getAllCalendars();
    const timeConfig = TimeTracking.getConfig();
    
    return `
      <div class="dnd5e-calendar-additional" data-augmented="true">
        <div class="additional-calendar">
          <span class="label">Alt:</span>
          <span class="value">${secondaryCal?.currentMonth + 1}/${secondaryCal?.currentDay}/${secondaryCal?.currentYear}</span>
          ${timeOffset !== 0 ? `<span class="offset">(${timeOffset > 0 ? '+' : ''}${timeOffset}d)</span>` : ''}
        </div>
        ${this._createWeatherElement()}
        ${this._createSeasonElement()}
        ${this._createMoonElement()}
      </div>
    `;
  }

  /**
   * Create weather element HTML
   */
  _createWeatherElement() {
    const weather = DnD5eCalendar?.weatherManager?.getWeather() || "Clear";
    return `
      <div class="weather-indicator" data-tooltip="${weather}">
        <i class="fas fa-${this._getWeatherIcon(weather)}"></i>
      </div>
    `;
  }

  /**
   * Create season element HTML
   */
  _createSeasonElement() {
    const season = DnD5eCalendar?.seasonManager?.getCurrentSeasonName() || "Spring";
    const icon = this._getSeasonIcon(season);
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
    const moon = DnD5eCalendar?.moonManager?.getPhaseName() || "New Moon";
    const icon = this._getMoonIcon(moon);
    return `
      <div class="moon-indicator">
        <i class="fas fa-${icon}"></i>
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