import { CalendarData } from "./calendar-data.js";
import { CalendarUtils } from "./calendar-utils.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarApprovalPanel } from "./holiday-approval-panel.js";
import { HolidaySubmitDialog } from "./holiday-submit-dialog.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

/**
 * CalendarConfig - Configuration panel for calendar settings
 * 
 * FoundryVTT v14 Compliance Updates:
 * - Uses Application base class with proper async getData
 * - Implements reactive context object for state
 * - Native DOM event handling
 * - Form submission pattern via submit event
 * 
 * @extends Application
 */
export class CalendarConfig extends Application {
  constructor(options = {}) {
    console.log("[DnD5e-Calendar] DEBUG: CalendarConfig constructor fired");
    super(options);
    
    // Track active tab for UI state
    this.activeTab = "calendar";
    
    // Cache for data - used in _prepareContext
    this._cache = {
      data: null,
      settings: null,
      lastUpdate: 0
    };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dnd5e-calendar-config",
      classes: ["dnd5e-calendar-config"],
      title: game.i18n.localize("DNDCAL.Config.Title"),
      template: "modules/dnd5e-calendar/templates/calendar-config.html",
      width: 700,
      height: 600,
      resizable: true
    });
  }

  /**
   * Get context data for template
   * In v14, returns plain object with all template variables
   */
  async getData(options = {}) {
    // Use cache if fresh (within 5 seconds)
    const now = Date.now();
    if (this._cache.data && (now - this._cache.lastUpdate) < 5000) {
      return {
        ...this._cache.data,
        settings: this._cache.settings
      };
    }

    // Load fresh data
    const data = await CalendarData.load();
    const settings = await CalendarData.loadSettings();
    
    // Update cache
    this._cache = {
      data,
      settings,
      lastUpdate: now
    };

    return {
      ...data,
      settings,
      constants: CALENDAR_CONSTANTS
    };
  }

  /**
   * Prepare context data (alias for getData in v14 pattern)
   * @deprecated Use getData() directly
   */
  async _prepareContext() {
    return this.getData();
  }

  /**
   * Render with permission check
   * Only GMs/Assistants can configure calendar
   */
  async render(force = false, options = {}) {
    if (!CalendarPermissions.canEdit()) {
      ui.notifications.warn(game.i18n.localize("DNDCAL.Permissions.GMOnly"));
      return;
    }

    if (!game.settings.get("dnd5e-calendar", "enabled")) {
      ui.notifications.warn("DnD5e Calendar is currently disabled");
      return;
    }

    // Refresh data before render
    this.context = await this.getData();
    return super.render(force, options);
  }

  /**
   * Activate event listeners
   * Uses native DOM API (v14 standard)
   */
  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];

    // Save button
    el.querySelector(".save-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.saveAll(el);
    });

    // Cancel button
    el.querySelector(".cancel-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.close();
    });

    // Time control buttons
    el.querySelectorAll(".time-control button").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        const amount = parseInt(e.currentTarget.dataset.amount) || 1;
        this.adjustTime(action, amount);
      });
    });

    // Add month button
    el.querySelector(".add-month-btn")?.addEventListener("click", () => {
      this.addMonth();
    });

    // Remove month buttons
    el.querySelectorAll(".remove-month-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.removeMonth(index);
      });
    });

    // Add weekday button
    el.querySelector(".add-weekday-btn")?.addEventListener("click", () => {
      this.addWeekday();
    });

    // Remove weekday buttons
    el.querySelectorAll(".remove-weekday-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.removeWeekday(index);
      });
    });

    // View holidays button
    el.querySelector(".view-holidays-btn")?.addEventListener("click", () => {
      new CalendarApprovalPanel().render(true);
    });

    // Submit holiday button
    el.querySelector(".submit-holiday-btn")?.addEventListener("click", () => {
      new HolidaySubmitDialog().render(true);
    });

    // Season auto-toggle
    el.querySelector(".season-auto-toggle")?.addEventListener("change", (e) => {
      this._cache.settings.autoTrackSeasons = e.target.checked;
    });
  }

  /**
   * Save all configuration data
   * Reads form values and persists settings
   * 
   * @param {HTMLElement} el - Form element
   */
  async saveAll(el) {
    // Get fresh data reference
    const data = await CalendarData.load();
    const settings = await CalendarData.loadSettings();

    const calendarId = data.activeCalendarId;
    const calendar = data.calendars[calendarId];

    // Calendar settings
    calendar.epoch = el.querySelector('input[name="epoch"]')?.value || "";
    calendar.yearZero = parseInt(el.querySelector('input[name="yearZero"]')?.value) || 0;
    calendar.yearName = el.querySelector('input[name="yearName"]')?.value || "";
    calendar.intercalaryDays = parseInt(el.querySelector('input[name="intercalaryDays"]')?.value) || 0;

    // Calendar selector
    const selectedCalendar = el.querySelector('select[name="activeCalendar"]')?.value;
    if (selectedCalendar !== calendarId) {
      data.activeCalendarId = selectedCalendar;
    }

    // Months - gather all month rows
    const months = [];
    el.querySelectorAll(".month-row").forEach(row => {
      months.push({
        name: row.querySelector('input[name="monthName"]')?.value || "",
        abbr: row.querySelector('input[name="monthAbbr"]')?.value || "",
        days: parseInt(row.querySelector('input[name="monthDays"]')?.value) || 30
      });
    });
    calendar.months = months;

    // Weekdays - gather all weekday rows
    const weekdays = [];
    el.querySelectorAll(".weekday-row").forEach(row => {
      weekdays.push({
        name: row.querySelector('input[name="weekdayName"]')?.value || "",
        abbr: row.querySelector('input[name="weekdayAbbr"]')?.value || ""
      });
    });
    calendar.weekdays = weekdays;

    // Settings checkboxes
    settings.enableGradientBar = el.querySelector('input[name="enableGradient"]')?.checked || false;
    settings.enableIconToggle = el.querySelector('input[name="enableIconToggle"]')?.checked || false;
    settings.playersCanSubmitHolidays = el.querySelector('input[name="playersCanSubmit"]')?.checked || false;
    settings.playersCanViewPendingHolidays = el.querySelector('input[name="playersCanViewPending"]')?.checked || false;
    settings.autoTrackSeasons = el.querySelector('input[name="autoTrackSeasons"]')?.checked || false;
    settings.autoWeatherRoll = el.querySelector('input[name="autoWeatherRoll"]')?.checked || false;
    settings.showSeconds = el.querySelector('input[name="showSeconds"]')?.checked || false;

    // Season names
    settings.seasonNames = {
      spring: el.querySelector('input[name="seasonNameSpring"]')?.value || "Spring",
      summer: el.querySelector('input[name="seasonNameSummer"]')?.value || "Summer",
      fall: el.querySelector('input[name="seasonNameFall"]')?.value || "Fall",
      winter: el.querySelector('input[name="seasonNameWinter"]')?.value || "Winter"
    };

    // Save to game settings
    await CalendarData.save(data);
    await CalendarData.saveSettings(settings);

    // Update calendar managers
    if (DnD5eCalendar.seasonManager) {
      DnD5eCalendar.seasonManager.setSeasonNames(settings.seasonNames);
      DnD5eCalendar.seasonManager.enableAutoTrack(settings.autoTrackSeasons);
      DnD5eCalendar.seasonManager.enableAutoWeatherRoll(settings.autoWeatherRoll);
    }

    ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.SettingsSaved"));
    this.close();
  }

  /**
   * Adjust game time
   * Uses dnd5e time API
   * 
   * @param {string} action - Time action (addMinute, addHour, addDay)
   * @param {number} amount - Amount to add
   */
  async adjustTime(action, amount) {
    if (!game.dnd5e?.time) {
      ui.notifications.warn("Time advancement requires dnd5e system");
      return;
    }

    switch (action) {
      case "addMinute":
        await game.dnd5e.time.advance(amount);
        break;
      case "addHour":
        await game.dnd5e.time.advance(amount * 60);
        break;
      case "addDay":
        await game.dnd5e.time.advance(amount * 24 * 60);
        break;
    }

    this.render();
  }

  /**
   * Add new month to calendar
   */
  addMonth() {
    const defaultMonth = { name: "New Month", abbr: "NM", days: 30 };
    this._cache.data.calendars[this._cache.data.activeCalendarId].months.push(defaultMonth);
    this.render();
  }

  /**
   * Remove month from calendar
   * @param {number} index - Month index to remove
   */
  removeMonth(index) {
    this._cache.data.calendars[this._cache.data.activeCalendarId].months.splice(index, 1);
    this.render();
  }

  /**
   * Add new weekday to calendar
   */
  addWeekday() {
    const defaultWeekday = { name: "New Day", abbr: "ND" };
    this._cache.data.calendars[this._cache.data.activeCalendarId].weekdays.push(defaultWeekday);
    this.render();
  }

  /**
   * Remove weekday from calendar
   * @param {number} index - Weekday index to remove
   */
  removeWeekday(index) {
    this._cache.data.calendars[this._cache.data.activeCalendarId].weekdays.splice(index, 1);
    this.render();
  }
}