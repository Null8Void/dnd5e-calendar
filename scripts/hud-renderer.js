/**
 * HUDRenderer - Centralized HUD Injection System
 * 
 * Responsibilities:
 * - Single render pipeline for all calendar HUD elements
 * - Gather data from all services (Calendar, Season, Weather, Moon, Holiday)
 * - Template-based rendering with Handlebars
 * - Injection lifecycle management
 * 
 * Data Sources:
 * - CalendarIntegration: Secondary calendar data
 * - SeasonService: Current season
 * - WeatherManagerService: Current weather
 * - MoonPhaseService: Moon phase
 * - HolidayManager: Approved holidays for current date
 */

import { CalendarIntegration } from "./calendar-integration-service.js";

const HUD_TEMPLATE = `
{{#if showCalendar}}
<div class="dnd5e-calendar-additional" data-augmented="true" data-version="14">
  {{#if showSecondary}}
  <div class="additional-calendar">
    <span class="label">Alt:</span>
    <span class="value">{{secondaryDate}}</span>
    {{#if timeOffset}}
    <span class="offset">({{timeOffset}}d)</span>
    {{/if}}
  </div>
  {{/if}}

  {{#if showWeather}}
  <div class="weather-indicator" data-tooltip="{{weather.name}}">
    <i class="fas fa-{{weather.icon}}"></i>
  </div>
  {{/if}}

  {{#if showSeason}}
  <div class="season-indicator">
    <i class="fas fa-{{season.icon}}"></i>
    <span class="season-name">{{season.name}}</span>
  </div>
  {{/if}}

  {{#if showMoon}}
  <div class="moon-indicator" data-tooltip="{{moon.name}}">
    <i class="fas fa-{{moon.icon}}"></i>
  </div>
  {{/if}}

  {{#if showHoliday}}
  <div class="holiday-indicator" data-tooltip="{{holiday.name}}{{holiday.description}}">
    <i class="fas fa-glass-cheers"></i>
    <span class="holiday-name">{{holiday.name}}</span>
  </div>
  {{/if}}
</div>
{{/if}}
`;

class HUDRenderer {
  constructor() {
    this._initialized = false;
    this._injected = false;
    this._containerSelector = ".dnd5e-calendar-additional[data-augmented='true']";
    this._hooksRegistered = false;
    
    this._settings = {
      showSecondary: true,
      showWeather: true,
      showSeason: true,
      showMoon: true,
      showHoliday: true
    };
    
    this._registerHandlebars();
  }

  /**
   * Initialize the HUD renderer
   */
  initialize(settings = {}) {
    if (this._initialized) return;
    
    console.log("[DnD5e-Calendar] Initializing HUDRenderer");
    
    Object.assign(this._settings, settings);
    this._registerHooks();
    this._initialized = true;
    
    console.log("[DnD5e-Calendar] HUDRenderer ready");
  }

  /**
   * Register Handlebars partial
   */
  _registerHandlebars() {
    if (Handlebars?.templates?.has("dnd5e-calendar-hud")) return;
    
    Handlebars.registerHelper("dnd5e-calendar-hud", (context, options) => {
      return new Handlebars.SafeString(this.render());
    });
  }

  /**
   * Register render hooks
   */
  _registerHooks() {
    if (this._hooksRegistered) return;

    Hooks.on("renderApplication", (app, html, options) => {
      if (this._isDnd5eHUD(app) && !this._injected) {
        this._inject(html);
      }
    }, { priority: 50 });

    const refreshCallback = () => {
      if (this._injected) {
        this.refresh();
      }
    };

    Hooks.on("dnd5e-calendar:dateChange", refreshCallback);
    Hooks.on("dnd5e-calendar:timeChange", refreshCallback);
    Hooks.on("dnd5e-calendar:seasonChange", refreshCallback);
    Hooks.on("dnd5e-calendar:weatherChange", refreshCallback);
    Hooks.on("dnd5e-calendar:moonPhaseChange", refreshCallback);
    Hooks.on("dnd5e-calendar:holidayApproved", refreshCallback);
    Hooks.on("dnd5e-calendar:calendarSwitch", refreshCallback);

    this._hooksRegistered = true;
  }

  /**
   * Check if app is dnd5e Calendar HUD (v5.2+)
   * Handles: CalendarHUD, BaseCalendarHUD, or any dnd5e calendar app
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
   * Find insertion point in HUD
   */
  _findInsertionPoint(html) {
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
    
    const flex = html.querySelector('[style*="flex"], .flex, .row');
    if (flex) return flex;
    
    return html.firstElementChild;
  }

  // ============== Data Gathering Pipeline ==============

  /**
   * Gather all data for HUD rendering
   * Centralized data collection point
   */
  gatherData() {
    return {
      showCalendar: true,
      showSecondary: this._settings.showSecondary,
      showWeather: this._settings.showWeather,
      showSeason: this._settings.showSeason,
      showMoon: this._settings.showMoon,
      showHoliday: this._settings.showHoliday,
      ...this._gatherCalendarData(),
      ...this._gatherSeasonData(),
      ...this._gatherWeatherData(),
      ...this._gatherMoonData(),
      ...this._gatherHolidayData()
    };
  }

  /**
   * Gather calendar data
   */
  _gatherCalendarData() {
    try {
      const secondaryCal = CalendarIntegration?.getSecondaryCalendar();
      const timeOffset = CalendarIntegration?.getTimeOffset() || 0;
      
      return {
        secondaryDate: secondaryCal 
          ? `${(secondaryCal.currentMonth || 0) + 1}/${secondaryCal.currentDay || 1}/${secondaryCal.currentYear || 0}`
          : "",
        timeOffset: timeOffset !== 0 ? `${timeOffset > 0 ? '+' : ''}${timeOffset}` : null
      };
    } catch (e) {
      return { secondaryDate: "", timeOffset: null };
    }
  }

  /**
   * Gather season data
   */
  _gatherSeasonData() {
    try {
      const seasonService = window.SeasonService;
      const seasonData = seasonService?.getCurrentSeason?.();
      
      if (seasonData) {
        return {
          season: {
            name: seasonData.name || "Spring",
            icon: this._getSeasonIcon(seasonData.key || seasonData.name?.toLowerCase())
          }
        };
      }
      
      const fallback = DnD5eCalendar?.seasonManager?.getCurrentSeasonName?.();
      return {
        season: {
          name: fallback || "Spring",
          icon: this._getSeasonIcon(fallback?.toLowerCase())
        }
      };
    } catch (e) {
      return { season: { name: "Spring", icon: "leaf" } };
    }
  }

  /**
   * Gather weather data
   */
  _gatherWeatherData() {
    try {
      const weatherService = window.WeatherManagerService;
      const weatherName = weatherService?.getWeather?.() || 
                         DnD5eCalendar?.weatherManager?.getWeather?.() || 
                         "Clear skies";
      const weatherIcon = weatherService?.getWeatherIcon?.() || 
                         this._getWeatherIcon(weatherName);
      
      return {
        weather: { name: weatherName, icon: weatherIcon }
      };
    } catch (e) {
      return { weather: { name: "Clear skies", icon: "sun" } };
    }
  }

  /**
   * Gather moon phase data
   */
  _gatherMoonData() {
    try {
      const moonService = window.MoonPhaseService;
      const moonData = moonService?.getHUDDisplay?.();
      
      if (moonData) {
        return {
          moon: {
            name: moonData.name || "New Moon",
            icon: moonData.icon || "moon"
          }
        };
      }
      
      return { moon: { name: "New Moon", icon: "moon" } };
    } catch (e) {
      return { moon: { name: "New Moon", icon: "moon" } };
    }
  }

  /**
   * Gather holiday data for current date
   */
  _gatherHolidayData() {
    try {
      const currentDate = CalendarIntegration?.getCurrentDate?.() || { day: 1, month: 0, year: 0 };
      const activeCalId = CalendarIntegration?.getActiveCalendarId?.() || "primary";
      
      const holiday = DnD5eCalendar?.holidayManager?.getHolidayOnDate?.(
        currentDate.day,
        currentDate.month,
        currentDate.year,
        activeCalId
      );
      
      if (holiday) {
        return {
          holiday: {
            name: holiday.name,
            description: holiday.description ? ` - ${holiday.description}` : ""
          }
        };
      }
      
      return { holiday: null };
    } catch (e) {
      return { holiday: null };
    }
  }

  // ============== Rendering ==============

  /**
   * Render HUD elements using gathered data
   */
  render() {
    const data = this.gatherData();
    return this._renderTemplate(data);
  }

  /**
   * Render template with data
   */
  _renderTemplate(data) {
    try {
      const template = Handlebars?.templates?.["dnd5e-calendar-hud"];
      if (template) {
        return template(data);
      }
      
      return this._compileTemplate(data);
    } catch (e) {
      console.warn("[DnD5e-Calendar] Template render failed, using fallback:", e);
      return this._renderFallback(data);
    }
  }

  /**
   * Compile and render template
   */
  _compileTemplate(data) {
    const compiled = Handlebars?.compile(HUD_TEMPLATE);
    if (compiled) {
      return compiled(data);
    }
    return this._renderFallback(data);
  }

  /**
   * Fallback renderer for when Handlebars unavailable
   */
  _renderFallback(data) {
    let html = `<div class="dnd5e-calendar-additional" data-augmented="true" data-version="14">`;
    
    if (data.showSecondary && data.secondaryDate) {
      html += `<div class="additional-calendar">
        <span class="label">Alt:</span>
        <span class="value">${data.secondaryDate}</span>
        ${data.timeOffset ? `<span class="offset">(${data.timeOffset}d)</span>` : ''}
      </div>`;
    }
    
    if (data.showWeather) {
      html += `<div class="weather-indicator" data-tooltip="${data.weather.name}">
        <i class="fas fa-${data.weather.icon}"></i>
      </div>`;
    }
    
    if (data.showSeason) {
      html += `<div class="season-indicator">
        <i class="fas fa-${data.season.icon}"></i>
        <span class="season-name">${data.season.name}</span>
      </div>`;
    }
    
    if (data.showMoon) {
      html += `<div class="moon-indicator" data-tooltip="${data.moon.name}">
        <i class="fas fa-${data.moon.icon}"></i>
      </div>`;
    }
    
    if (data.showHoliday && data.holiday) {
      html += `<div class="holiday-indicator" data-tooltip="${data.holiday.name}${data.holiday.description}">
        <i class="fas fa-glass-cheers"></i>
        <span class="holiday-name">${data.holiday.name}</span>
      </div>`;
    }
    
    html += `</div>`;
    return html;
  }

  // ============== Injection Lifecycle ==============

  /**
   * Inject elements into rendered HUD
   */
  _inject(html) {
    if (this._injected) return;
    
    const insertionPoint = this._findInsertionPoint(html);
    if (!insertionPoint) return;
    
    const elements = this.render();
    insertionPoint.insertAdjacentHTML("afterend", elements);
    
    this._injected = true;
    console.log("[DnD5e-Calendar] HUD elements injected via HUDRenderer");
  }

  /**
   * Refresh injected elements (on data changes)
   */
  refresh() {
    const container = document.querySelector(this._containerSelector);
    if (!container) {
      this._injected = false;
      return;
    }
    
    container.outerHTML = this.render();
  }

  /**
   * Force re-injection
   */
  reinject() {
    this._injected = false;
    
    const container = document.querySelector(this._containerSelector);
    if (container) {
      container.remove();
    }
    
    const hud = document.querySelector(".dnd5e-hud, #dnd5e-hud, [id*='dnd5e']");
    if (hud) {
      this._inject(hud);
    }
  }

  // ============== Configuration ==============

  /**
   * Update settings
   */
  updateSettings(settings) {
    Object.assign(this._settings, settings);
    this.refresh();
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this._settings };
  }

  // ============== Icon Helpers ==============

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

  _getSeasonIcon(season) {
    const icons = {
      "spring": "leaf",
      "summer": "sun",
      "fall": "leaf-maple",
      "winter": "snowflake"
    };
    return icons[season?.toLowerCase()] || "calendar";
  }
}

export const HUDRenderer = new HUDRenderer();
window.HUDRenderer = HUDRenderer;