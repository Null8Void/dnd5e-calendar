import { CalendarUtils } from "./calendar-utils.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { DnD5eCalendarAPI } from "./calendar-api.js";
import { CalendarData } from "./calendar-data.js";

/**
 * CalendarHUD - Top-screen HUD display
 * 
 * FoundryVTT v14 Compliance Updates:
 * - Uses Application base class (works for both v13-v14)
 * - Implements reactive state object for efficient re-rendering
 * - Uses proper async data loading pattern
 * - Maintains DOM injection for HUD overlay behavior
 * 
 * @extends Application
 */
const defaultOptions = {
  id: "dnd5e-calendar-hud",
  classes: ["dnd5e-calendar-hud"],
  template: "modules/dnd5e-calendar/templates/calendar-hud.html",
  popOut: false,  // HUD is always visible overlay
  width: "100%",
  height: 48,
  resizable: false,
  draggable: false
};

export class CalendarHUD extends Application {
  constructor(options = {}) {
    console.log("[DnD5e-Calendar] DEBUG: CalendarHUD constructor fired");
    super(options);
    
    // Reactive state object - stores current data for comparison
    // Used to determine if re-render is needed (reduce DOM operations)
    this._state = {
      date: null,
      time: null,
      weather: null,
      season: null,
      moonPhase: null,
      isDay: true
    };
    
    this.settings = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, defaultOptions);
  }

  /**
   * Get data for rendering - Called by Application.render()
   * In v14, this returns a plain object with all context data
   */
  async getData(options = {}) {
    return await this._prepareContext();
  }

  /**
   * Prepare context data for template rendering
   * Loads all calendar data and returns context object
   * 
   * @returns {Promise<Object>} Context data for template
   */
  async _prepareContext() {
    // Use CalendarIntegrationService if available
    if (window.CalendarIntegration && window.CalendarIntegration.getCurrentDate) {
      return await this._prepareFromCalendarIntegration();
    }
    
    // Fallback to DnD5eCalendar integration
    if (!DnD5eCalendar.dnd5eCalendar) {
      return this._getDefaultData();
    }

    // Get current state from dnd5e calendar
    const date = DnD5eCalendar.getDate();
    const time = DnD5eCalendar.getTime();
    const calendar = DnD5eCalendar.getCalendar();

    // Calculate derived values
    const dayOfWeek = CalendarUtils.getDayOfWeek(date.day, date.month, date.year, calendar);
    const moonPhase = DnD5eCalendar.moonManager.getPhase();
    const weather = DnD5eCalendar.weatherManager.getWeather();
    const weatherIcon = DnD5eCalendar.weatherManager.getWeatherIcon();
    const season = DnD5eCalendar.seasonManager.getCurrentSeason();
    const seasonName = DnD5eCalendar.seasonManager.getCurrentSeasonName();
    const seasonIcon = DnD5eCalendar.seasonManager.getCurrentSeasonIcon();

    // Day/night cycle calculations
    const isDay = time.hour >= 6 && time.hour < 18;
    const periodIcon = isDay ? "fa-sun" : "fa-moon";
    const progress = { isDay, progress: (time.hour * 60 + time.minute) / 1440 };
    
    // Load settings for display options
    const settings = await CalendarData.loadSettings();
    const showGradient = settings?.enableGradientBar ?? true;
    const showIcon = settings?.enableIconToggle ?? false;

    // Format display strings
    const formattedDate = CalendarUtils.formatDate(date.day, date.month, date.year, calendar, true);
    const formattedTime = CalendarUtils.formatTime(time.hour, time.minute, 0, false);
    const calendarName = DnD5eCalendar.getCalendarName();
    const calendars = [{ id: "primary", name: calendarName, isActive: true }];

    // Check for holidays
    const currentHoliday = DnD5eCalendar.holidayManager?.getHolidayOnDate(
      date.day, date.month, date.year, "primary"
    );

    // Update reactive state for next render comparison
    this._state = {
      date: `${date.day}/${date.month}/${date.year}`,
      time: `${time.hour}:${time.minute}`,
      weather,
      season,
      moonPhase: moonPhase.key,
      isDay
    };

    // Return context object for template
    return {
      formattedDate,
      formattedTime,
      dayOfWeek: dayOfWeek?.name || game.i18n.localize("DNDCAL.Weekdays.Starday"),
      dayAbbr: dayOfWeek?.abbr || game.i18n.localize("DNDCAL.Weekdays.StardayAbbr"),
      moonPhase: moonPhase.name,
      moonIcon: CalendarUtils.getMoonPhaseIcon(moonPhase.key),
      weather,
      weatherIcon,
      season,
      seasonName,
      seasonIcon,
      isDay,
      periodIcon,
      progress,
      showGradient,
      showIcon,
      calendars,
      canEdit: CalendarPermissions.canEdit(),
      calendarsCount: calendars.length,
      currentHoliday: currentHoliday ? currentHoliday.name : null,
      hasHoliday: !!currentHoliday,
      isHoliday: !!currentHoliday,
      holidays: currentHoliday ? [currentHoliday] : []
    };
  }

  /**
   * Prepare context from CalendarIntegrationService
   * Uses API for cross-calendar support
   */
  async _prepareFromCalendarIntegration() {
    const ci = window.CalendarIntegration;
    const settings = await CalendarData.loadSettings();
    
    // Get active calendar
    const allCals = ci.getAllCalendars();
    const activeCal = allCals.find(c => c.isActive) || allCals[0];
    
    const date = ci.getCurrentDate(activeCal?.id);
    const time = ci.getTime(activeCal?.id);
    
    // Get day of week
    const cal = activeCal?.id === "secondary" ? ci.getSecondaryCalendar() : null;
    const dayOfWeek = cal 
      ? CalendarUtils.getDayOfWeek(date.day, date.month, date.year, cal)
      : null;
    
    // Managers from DnD5e integration
    const moonPhase = DnD5eCalendar?.moonManager?.getPhase() || { name: "Unknown", key: "new" };
    const weather = DnD5eCalendar?.weatherManager?.getWeather() || "Clear skies";
    const weatherIcon = DnD5eCalendar?.weatherManager?.getWeatherIcon() || "fa-cloud";
    const season = DnD5eCalendar?.seasonManager?.getCurrentSeason() || "spring";
    const seasonName = DnD5eCalendar?.seasonManager?.getCurrentSeasonName() || "Spring";
    const seasonIcon = DnD5eCalendar?.seasonManager?.getCurrentSeasonIcon() || "fa-leaf";
    
    // Day/night cycle
    const isDay = time.hour >= 6 && time.hour < 18;
    const periodIcon = isDay ? "fa-sun" : "fa-moon";
    const progress = { isDay, progress: (time.hour * 60 + time.minute) / 1440 };
    
    // Settings
    const showGradient = settings?.enableGradientBar ?? true;
    const showIcon = settings?.enableIconToggle ?? false;
    
    // Format strings
    const formattedDate = `${date.month + 1}/${date.day}/${date.year}`;
    const formattedTime = `${time.hour}:${time.minute}`;
    
    return {
      formattedDate,
      formattedTime,
      dayOfWeek: dayOfWeek?.name || game.i18n.localize("DNDCAL.Weekdays.Starday"),
      dayAbbr: dayOfWeek?.abbr || game.i18n.localize("DNDCAL.Weekdays.StardayAbbr"),
      moonPhase: moonPhase.name,
      moonIcon: CalendarUtils.getMoonPhaseIcon(moonPhase.key),
      weather,
      weatherIcon,
      season,
      seasonName,
      seasonIcon,
      isDay,
      periodIcon,
      progress,
      showGradient,
      showIcon,
      calendars: allCals,
      activeCalendarId: activeCal?.id,
      canEdit: CalendarPermissions.canEdit(),
      calendarsCount: allCals.length,
      currentHoliday: null,
      hasHoliday: false,
      isHoliday: false,
      holidays: []
    };
  }

  /**
   * Get default data when calendar not initialized
   * Used during initial load or if dnd5e system not ready
   */
  _getDefaultData() {
    return {
      formattedDate: game.i18n.localize("DNDCAL.HUD.Loading"),
      formattedTime: "--:--",
      dayOfWeek: "---",
      dayAbbr: "--",
      moonPhase: "---",
      moonIcon: "fa-moon",
      weather: "---",
      weatherIcon: "fa-cloud",
      season: "---",
      seasonName: "---",
      seasonIcon: "fa-calendar",
      isDay: true,
      periodIcon: "fa-sun",
      progress: { isDay: true, progress: 0.5 },
      showGradient: true,
      showIcon: false,
      calendars: [{ id: "primary", name: game.i18n.localize("DNDCAL.HUD.PrimaryCalendar"), isActive: true }],
      canEdit: false,
      calendarsCount: 1,
      isHoliday: false,
      holidays: [],
      hasHoliday: false,
      currentHoliday: ""
    };
  }

  /**
   * Render the HUD
   * Overrides base to fetch data before render
   * 
   * @param {boolean} force - Force re-render
   * @param {Object} options - Render options
   */
  async render(force = false, options = {}) {
    // In v14, we can use the context property for reactive updates
    // But fetch data manually for compatibility
    this.context = await this._prepareContext();
    return super.render(force, options);
  }

  /**
   * Close the HUD - Clean up DOM element
   * Required because HUD injects into body, not a window
   */
  async close() {
    const hud = document.getElementById("dnd5e-calendar-hud");
    if (hud) {
      hud.remove();
    }
    return super.close();
  }

  /**
   * Inject HTML into document body
   * This is required for HUD overlay (popOut: false)
   * Custom implementation to ensure proper placement
   * 
   * @param {HTMLElement} html - The rendered HTML element
   */
  _injectHTML(html) {
    // Remove existing HUD if present
    const existingHud = document.getElementById("dnd5e-calendar-hud");
    if (existingHud) {
      existingHud.remove();
    }
    
    // Append to body for HUD positioning
    document.body.appendChild(html);
    
    // Apply fade-in animation
    html.style.display = "none";
    requestAnimationFrame(() => {
      html.style.display = "";
      html.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    });
  }

  /**
   * Activate event listeners on the rendered element
   * Uses native DOM API (v14 standard)
   * 
   * @param {HTMLElement} html - The rendered HTML element
   */
  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];

    // Date click - open config
    el.querySelector(".dnd5e-calendar-hud-date")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        window.DnD5eCalendarConfig?.render(true);
      }
    });

    // Time click - open time editor
    el.querySelector(".dnd5e-calendar-hud-time")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showTimeEditor();
      }
    });

    // Calendar selector change - Use CalendarIntegration if available
    el.querySelector(".dnd5e-calendar-selector")?.addEventListener("change", async (e) => {
      e.preventDefault();
      const calendarId = e.currentTarget.value;
      
      // Use CalendarIntegration if available
      if (window.CalendarIntegration && window.CalendarIntegration.switchCalendar) {
        await window.CalendarIntegration.switchCalendar(calendarId);
        await this.render();
        return;
      }
      
      // Fallback
      this.switchCalendar(calendarId);
    });

    // Season click - open season selector
    el.querySelector(".dnd5e-calendar-hud-season")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showSeasonSelector();
      }
    });

    // Weather click - open weather selector
    el.querySelector(".dnd5e-calendar-hud-weather")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showWeatherSelector();
      }
    });
  }

  /**
   * Check if data has changed since last render
   * Used for reactive optimization
   * 
   * @param {Object} newData - New context data
   * @returns {boolean} True if data changed
   */
  _hasDataChanged(newData) {
    const s = this._state;
    return !s.date || 
      s.date !== `${newData.formattedDate}` ||
      s.time !== newData.formattedTime ||
      s.weather !== newData.weather ||
      s.season !== newData.season ||
      s.moonPhase !== newData.moonPhase.key ||
      s.isDay !== newData.isDay;
  }

  // ============== Dialog Methods ==============

  /**
   * Show time editor dialog
   * Opens modal for time adjustment
   */
  async showTimeEditor() {
    const currentTime = DnD5eCalendarAPI.getTime();
    const dialog = new TimeEditorDialog(currentTime, {
      callback: async (hour, minute) => {
        await DnD5eCalendarAPI.setTime(hour, minute);
        await this.render();
      }
    });
    dialog.render(true);
  }

  /**
   * Show season selector dialog
   * Opens modal for season selection
   */
  async showSeasonSelector() {
    const currentSeason = DnD5eCalendarAPI.getSeason();
    const dialog = new SeasonSelectorDialog(currentSeason, {
      callback: async (season) => {
        DnD5eCalendarAPI.setSeason(season);
        await this.render();
      }
    });
    dialog.render(true);
  }

  /**
   * Show weather selector dialog
   * Opens modal for weather selection with GM notes
   */
  async showWeatherSelector() {
    const currentWeather = DnD5eCalendar.weatherManager.getWeather();
    const weatherMode = DnD5eCalendar.weatherManager.getMode();
    const gmNotes = DnD5eCalendar.customData?.weather?.gmNotes || "";
    const dialog = new WeatherSelectorDialog(currentWeather, weatherMode, {
      gmNotes,
      callback: async (data) => {
        await DnD5eCalendarAPI.setWeatherMode(data.mode);
        if (data.mode === "manual") {
          await DnD5eCalendarAPI.setWeather(data.weather);
        }
        if (data.gmNotes !== undefined) {
          DnD5eCalendar.customData.weather.gmNotes = data.gmNotes;
          await DnD5eCalendar.saveCustomData();
        }
        await this.render();
      }
    });
    dialog.render(true);
  }

  /**
   * Switch between calendars
   * Uses CalendarIntegration if available, otherwise dnd5e system
   * @param {string} calendarId - Calendar identifier
   */
  async switchCalendar(calendarId) {
    // Use CalendarIntegration if available
    if (window.CalendarIntegration && window.CalendarIntegration.switchCalendar) {
      await window.CalendarIntegration.switchCalendar(calendarId);
      await this.render();
      ui.notifications.info(`Switched to ${calendarId} calendar`);
      return;
    }
    
    // Fallback to dnd5e system (no custom switching)
    ui.notifications.warn("Calendar switching is handled by dnd5e system settings");
  }

  /**
   * Update weather visual effect overlay
   * Applies CSS classes for weather effects
   */
  updateWeatherEffect() {
    const container = document.getElementById("dnd5e-calendar-weather-effect");
    if (!container || !DnD5eCalendar.weatherManager) return;

    const weatherEffect = DnD5eCalendar.weatherManager.getWeatherEffect();
    container.className = "weather-effect-container";

    if (weatherEffect) {
      container.classList.add("active");
      container.classList.add(weatherEffect);
    }
  }
}

// ============== Dialog Classes ==============

/**
 * TimeEditorDialog - Edit time modal
 * 
 * Modal dialog for adjusting game time
 * Uses ApplicationV2 pattern with native DOM events
 */
const timeEditorDialogProps = {
  id: "dnd5e-time-editor",
  classes: ["dnd5e-calendar-dialog"],
  title: game.i18n.localize("DNDCAL.Time.CurrentTime"),
  template: "modules/dnd5e-calendar/templates/time-editor-dialog.html",
  width: 350,
  height: "auto"
};

class TimeEditorDialog extends Application {
  constructor(currentTime, options = {}) {
    super({ ...timeEditorDialogProps, ...options });
    this.currentTime = currentTime;
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, timeEditorDialogProps);
  }

  /**
   * Get context data for template
   */
  async getData() {
    return {
      hour: this.currentTime.hour,
      minute: this.currentTime.minute
    };
  }

  /**
   * Set up event listeners
   * Uses native DOM event API (v14 standard)
   */
  activateListeners(html) {
    super.activateListeners(html);
    const form = html[0].querySelector("form");
    if (!form) return;

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const hour = parseInt(form.hour.value);
      const minute = parseInt(form.minute.value);
      if (this.callback) await this.callback(hour, minute);
      this.close();
    });

    // Cancel button
    html[0].querySelector(".cancel-btn")?.addEventListener("click", () => this.close());
  }
}

/**
 * SeasonSelectorDialog - Select season modal
 * 
 * Modal dialog for selecting current season
 */
const seasonSelectorDialogProps = {
  id: "dnd5e-season-selector",
  classes: ["dnd5e-calendar-dialog"],
  title: game.i18n.localize("DNDCAL.Season.CurrentSeason"),
  template: "modules/dnd5e-calendar/templates/season-selector-dialog.html",
  width: 300,
  height: "auto"
};

class SeasonSelectorDialog extends Application {
  constructor(currentSeason, options = {}) {
    super({ ...seasonSelectorDialogProps, ...options });
    this.currentSeason = currentSeason;
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, seasonSelectorDialogProps);
  }

  /**
   * Get context data for template
   */
  async getData() {
    const seasons = [
      { key: "spring", name: game.i18n.localize("DNDCAL.Season.Spring"), icon: CalendarUtils.getSeasonIcon("spring") },
      { key: "summer", name: game.i18n.localize("DNDCAL.Season.Summer"), icon: CalendarUtils.getSeasonIcon("summer") },
      { key: "fall", name: game.i18n.localize("DNDCAL.Season.Fall"), icon: CalendarUtils.getSeasonIcon("fall") },
      { key: "winter", name: game.i18n.localize("DNDCAL.Season.Winter"), icon: CalendarUtils.getSeasonIcon("winter") }
    ];
    return { seasons, currentSeason: this.currentSeason };
  }

  /**
   * Set up event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);
    const form = html[0].querySelector("form");
    if (!form) return;

    // Season button selection
    const buttons = form.querySelectorAll(".season-btn");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const activeBtn = form.querySelector(".season-btn.active");
      if (activeBtn && this.callback) {
        await this.callback(activeBtn.dataset.season);
      }
      this.close();
    });

    // Cancel button
    html[0].querySelector(".cancel-btn")?.addEventListener("click", () => this.close());
  }
}

/**
 * WeatherSelectorDialog - Select weather modal
 * 
 * Modal dialog for selecting weather and GM notes
 */
const weatherSelectorDialogProps = {
  id: "dnd5e-weather-selector",
  classes: ["dnd5e-calendar-dialog"],
  title: game.i18n.localize("DNDCAL.Weather.CurrentWeather"),
  template: "modules/dnd5e-calendar/templates/weather-selector-dialog.html",
  width: 350,
  height: "auto"
};

class WeatherSelectorDialog extends Application {
  constructor(currentWeather, weatherMode, options = {}) {
    super({ ...weatherSelectorDialogProps, ...options });
    this.currentWeather = currentWeather;
    this.weatherMode = weatherMode;
    this.gmNotes = options.gmNotes || "";
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, weatherSelectorDialogProps);
  }

  /**
   * Get context data for template
   */
  async getData() {
    const weatherTypes = [
      { key: "Clear skies", label: game.i18n.localize("DNDCAL.Weather.ClearSkies") },
      { key: "Partly cloudy", label: game.i18n.localize("DNDCAL.Weather.PartlyCloudy") },
      { key: "Overcast", label: game.i18n.localize("DNDCAL.Weather.Overcast") },
      { key: "Light rain", label: game.i18n.localize("DNDCAL.Weather.LightRain") },
      { key: "Heavy rain", label: game.i18n.localize("DNDCAL.Weather.HeavyRain") },
      { key: "Thunderstorm", label: game.i18n.localize("DNDCAL.Weather.Thunderstorm") },
      { key: "Light snow", label: game.i18n.localize("DNDCAL.Weather.LightSnow") },
      { key: "Heavy snow", label: game.i18n.localize("DNDCAL.Weather.HeavySnow") },
      { key: "Foggy", label: game.i18n.localize("DNDCAL.Weather.Foggy") },
      { key: "Windy", label: game.i18n.localize("DNDCAL.Weather.Windy") },
      { key: "Hot", label: game.i18n.localize("DNDCAL.Weather.Hot") },
      { key: "Cold", label: game.i18n.localize("DNDCAL.Weather.Cold") },
      { key: "Blizzard", label: game.i18n.localize("DNDCAL.Weather.Blizzard") },
      { key: "Hail", label: game.i18n.localize("DNDCAL.Weather.Hail") }
    ];
    return {
      weatherTypes,
      currentWeather: this.currentWeather,
      weatherMode: this.weatherMode,
      gmNotes: this.gmNotes
    };
  }

  /**
   * Set up event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);
    const form = html[0].querySelector("form");
    if (!form) return;

    const weatherModeCb = form.querySelector('input[name="weatherMode"]');
    const weatherSelectGroup = form.querySelector(".weather-select-group");
    const rollBtn = form.querySelector(".roll-weather-btn");

    // Toggle weather mode
    weatherModeCb?.addEventListener("change", () => {
      weatherSelectGroup.style.display = weatherModeCb.checked ? "none" : "";
      if (rollBtn) rollBtn.disabled = !weatherModeCb.checked;
    });

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const mode = weatherModeCb?.checked ? "auto" : "manual";
      const weather = form.weather?.value || this.currentWeather;
      const gmNotes = form.gmNotes?.value || "";
      if (this.callback) {
        await this.callback({ mode, weather, gmNotes });
      }
      this.close();
    });

    // Cancel button
    html[0].querySelector(".cancel-btn")?.addEventListener("click", () => this.close());
  }
}