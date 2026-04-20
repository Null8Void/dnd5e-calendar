/**
 * Multi-Calendar Manager
 * 
 * Manages Primary and Secondary calendars with independent time tracking.
 * Syncs with Foundry's game.time for the active calendar.
 * 
 * Data Structure:
 * {
 *   calendars: {
 *     primary: CalendarData,
 *     secondary: CalendarData
 *   },
 *   activeCalendarId: "primary" | "secondary",
 *   linkedToGameTime: boolean
 * }
 * 
 * Each CalendarData:
 * {
 *   id: string,
 *   name: string,
 *   currentDay, currentMonth, currentYear,
 *   currentHour, currentMinute,
 *   dayCount: number,
 *   epoch: string,
 *   yearZero: number,
 *   yearName: string,
 *   months: Month[],
 *   weekdays: Weekday[],
 *   intercalaryDays: number
 * }
 */

import { CalendarData } from "./calendar-data.js";
import { CalendarUtils } from "./calendar-utils.js";
import { MoonPhaseManager } from "./moon-phase-manager.js";
import { WeatherManager } from "./weather-manager.js";
import { SeasonManager } from "./season-manager.js";
import { DayNightManager } from "./day-night-manager.js";
import { HolidayManager } from "./holiday-manager.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

/**
 * MultiCalendarManager - Manages multiple calendars
 * 
 * Features:
 * - Primary + Secondary calendar support
 * - Independent time tracking per calendar
 * - Seamless switching between calendars
 * - Sync with Foundry game.time
 * - Shared UI display
 */
export class MultiCalendarManager {
  constructor() {
    console.log("[DnD5e-Calendar] DEBUG: MultiCalendarManager constructor fired");
    
    this.calendars = {
      primary: null,
      secondary: null
    };
    
    this.activeCalendarId = "primary";
    this.linkedToGameTime = true;
    
    // Managers for active calendar
    this.moonManager = null;
    this.weatherManager = null;
    this.seasonManager = null;
    this.dayNightManager = null;
    this.holidayManager = null;
    
    this._state = {
      isInitialized: false,
      lastWorldTime: 0
    };
  }

  /**
   * Initialize the multi-calendar system
   * Loads calendars and sets up managers
   */
  async initialize() {
    console.log("[DnD5e-Calendar] Initializing MultiCalendarManager");
    
    // Load module data
    const moduleData = await CalendarData.load();
    
    // Initialize calendars with data
    this.calendars.primary = this._createCalendarData(
      moduleData.calendars?.primary || CalendarData.createDefaultCalendar("primary")
    );
    
    this.calendars.secondary = this._createCalendarData(
      moduleData.calendars?.secondary || CalendarData.createDefaultCalendar("secondary")
    );
    
    // Set active calendar
    this.activeCalendarId = moduleData.activeCalendarId || "primary";
    
    // Initialize managers for active calendar
    this._initializeManagers();
    
    // Set up game time sync
    this._setupGameTimeSync();
    
    this._state.isInitialized = true;
    console.log("[DnD5e-Calendar] MultiCalendarManager initialized", {
      active: this.activeCalendarId,
      calendars: Object.keys(this.calendars)
    });
    
    return this;
  }

  /**
   * Create calendar data structure from loaded data
   */
  _createCalendarData(calData) {
    return {
      id: calData.id,
      name: calData.name,
      shortName: calData.shortName || calData.id.toUpperCase().slice(0, 2),
      currentDay: calData.currentDay || 1,
      currentMonth: calData.currentMonth || 0,
      currentYear: calData.currentYear || 0,
      currentHour: 6,
      currentMinute: 0,
      dayCount: 0,
      epoch: calData.epoch || "",
      yearZero: calData.yearZero || 0,
      yearName: calData.yearName || "",
      months: calData.months || CalendarUtils.getDefaultMonths(),
      weekdays: calData.weekdays || CalendarUtils.getDefaultWeekdays(),
      intercalaryDays: calData.intercalaryDays || 0,
      intercalaryMonth: calData.intercalaryMonth || null
    };
  }

  /**
   * Initialize managers for active calendar
   */
  _initializeManagers() {
    const cal = this.getActiveCalendar();
    
    // Create managers with calendar data
    this.moonManager = new MoonPhaseManager(this);
    this.weatherManager = new WeatherManager(this);
    this.seasonManager = new SeasonManager(this);
    this.dayNightManager = new DayNightManager(this);
    this.holidayManager = new HolidayManager(this);
    
    // Initialize with loaded data
    const moduleData = CalendarData.load(); // Sync call
    this.moonManager.initialize(moduleData.moon);
    this.weatherManager.initialize(moduleData.weather);
    this.seasonManager.initialize(moduleData.season);
    this.dayNightManager.initialize(moduleData.dayNight, cal);
    this.holidayManager.initialize();
  }

  /**
   * Set up sync with Foundry's game.time
   */
  _setupGameTimeSync() {
    if (this.linkedToGameTime) {
      // Listen to world time updates
      Hooks.on("updateWorldTime", (worldTime, delta, options) => {
        this._onWorldTimeUpdate(worldTime, delta, options);
      });
    }
  }

  /**
   * Handle world time updates from Foundry
   * Updates the primary calendar (synced to game time)
   * Secondary calendar remains independent
   */
  _onWorldTimeUpdate(worldTime, delta, options) {
    if (!this.linkedToGameTime) return;
    
    const cal = this.getCalendar("primary");
    if (!cal) return;
    
    // Calculate time advancement
    const totalMinutes = Math.floor(delta / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // Update calendar time
    cal.currentHour = (cal.currentHour + hours) % 24;
    cal.currentMinute = (cal.currentMinute + minutes) % 60;
    
    // Check for day boundary
    let dayAdvance = Math.floor((cal.currentHour + hours) / 24);
    cal.currentHour = cal.currentHour % 24;
    
    // Advance days if needed
    if (dayAdvance > 0 || delta >= 86400) {
      const midnights = options?.dnd5e?.deltas?.midnights || Math.floor(delta / 86400);
      this._advanceDays("primary", 1 + midnights);
    }
    
    // Sync secondary calendar (add delta but keep independent)
    const secondaryCal = this.getCalendar("secondary");
    if (secondaryCal) {
      this._advanceIndependentTime(secondaryCal, delta);
    }
    
    // Trigger updates
    Hooks.callAll("dnd5e-calendar:timeChange", {
      calendar: this.activeCalendarId,
      time: this.getTime(),
      date: this.getDate()
    });
  }

  /**
   * Advance days for a calendar
   */
  _advanceDays(calendarId, days) {
    const cal = this.getCalendar(calendarId);
    if (!cal) return;
    
    // Calculate new date
    let newDay = cal.currentDay + days;
    let newMonth = cal.currentMonth;
    let newYear = cal.currentYear;
    
    while (newDay > this._getMonthDays(newMonth, cal)) {
      newDay -= this._getMonthDays(newMonth, cal);
      newMonth++;
      if (newMonth >= cal.months.length) {
        newMonth = 0;
        newYear++;
      }
    }
    
    cal.currentDay = newDay;
    cal.currentMonth = newMonth;
    cal.currentYear = newYear;
    cal.dayCount += days;
    
    // Trigger day change event
    Hooks.callAll("dnd5e-calendar:dateChange", {
      calendar: calendarId,
      date: this.getDate(calendarId)
    });
  }

  /**
   * Advance time for independent calendar
   */
  _advanceIndependentTime(calendar, delta) {
    const totalMinutes = Math.floor(delta / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    calendar.currentHour = (calendar.currentHour + hours) % 24;
    calendar.currentMinute = (calendar.currentMinute + minutes) % 60;
    
    if ((calendar.currentHour + hours) >= 24) {
      this._advanceDays(calendar.id, 1);
    }
  }

  /**
   * Get number of days in a month
   */
  _getMonthDays(monthIndex, calendar) {
    const month = calendar.months[monthIndex];
    return month?.days || 30;
  }

  // ============== Calendar Access ==============

  /**
   * Get active calendar data
   */
  getActiveCalendar() {
    return this.calendars[this.activeCalendarId];
  }

  /**
   * Get calendar by ID
   */
  getCalendar(id) {
    return this.calendars[id];
  }

  /**
   * Get all calendars
   */
  getAllCalendars() {
    return Object.entries(this.calendars).map(([id, cal]) => ({
      id,
      name: cal.name,
      shortName: cal.shortName,
      isActive: id === this.activeCalendarId
    }));
  }

  /**
   * Switch active calendar
   */
  async switchCalendar(id) {
    if (!this.calendars[id]) {
      console.warn(`[DnD5e-Calendar] Calendar not found: ${id}`);
      return false;
    }
    
    const oldId = this.activeCalendarId;
    this.activeCalendarId = id;
    
    // Save preference
    await CalendarData.update("activeCalendarId", id);
    
    // Re-initialize managers with new calendar's data
    this._initializeManagers();
    
    // Trigger switch event
    Hooks.callAll("dnd5e-calendar:calendarSwitch", {
      from: oldId,
      to: id,
      calendar: this.getCalendar(id)
    });
    
    console.log(`[DnD5e-Calendar] Switched calendar: ${oldId} -> ${id}`);
    return true;
  }

  // ============== Date/Time Getters ==============

  /**
   * Get current date for active or specific calendar
   */
  getDate(calendarId = null) {
    const cal = calendarId ? this.calendars[calendarId] : this.getActiveCalendar();
    if (!cal) return { day: 1, month: 0, year: 0 };
    
    return {
      day: cal.currentDay,
      month: cal.currentMonth,
      year: cal.currentYear
    };
  }

  /**
   * Get current time for active or specific calendar
   */
  getTime(calendarId = null) {
    const cal = calendarId ? this.calendars[calendarId] : this.getActiveCalendar();
    if (!cal) return { hour: 0, minute: 0 };
    
    return {
      hour: cal.currentHour,
      minute: cal.currentMinute
    };
  }

  /**
   * Get formatted date string
   */
  getFormattedDate(calendarId = null) {
    const cal = calendarId ? this.calendars[calendarId] : this.getActiveCalendar();
    if (!cal) return "";
    
    return CalendarUtils.formatDate(
      cal.currentDay,
      cal.currentMonth,
      cal.currentYear,
      cal,
      true
    );
  }

  /**
   * Get formatted time string
   */
  getFormattedTime(calendarId = null) {
    const cal = calendarId ? this.calendars[calendarId] : this.getActiveCalendar();
    if (!cal) return "";
    
    return CalendarUtils.formatTime(
      cal.currentHour,
      cal.currentMinute,
      0,
      false
    );
  }

  /**
   * Get day of week for date
   */
  getDayOfWeek(calendarId = null) {
    const cal = calendarId ? this.calendars[calendarId] : this.getActiveCalendar();
    if (!cal) return null;
    
    return CalendarUtils.getDayOfWeek(
      cal.currentDay,
      cal.currentMonth,
      cal.currentYear,
      cal
    );
  }

  // ============== Date/Time Setters ==============

  /**
   * Set date for active calendar
   */
  async setDate(day, month, year, calendarId = null) {
    const cal = calendarId ? this.calendars[calendarId] : this.getActiveCalendar();
    if (!cal) return;
    
    cal.currentDay = day;
    cal.currentMonth = month;
    cal.currentYear = year;
    cal.dayCount = this._calculateDayCount(cal);
    
    await this._saveCalendar(calendarId || this.activeCalendarId);
    
    Hooks.callAll("dnd5e-calendar:dateChange", {
      calendar: calendarId || this.activeCalendarId,
      date: this.getDate(calendarId)
    });
  }

  /**
   * Set time for active calendar
   */
  async setTime(hour, minute, calendarId = null) {
    const cal = calendarId ? this.calendars[calendarId] : this.getActiveCalendar();
    if (!cal) return;
    
    cal.currentHour = hour;
    cal.currentMinute = minute;
    
    await this._saveCalendar(calendarId || this.activeCalendarId);
    
    Hooks.callAll("dnd5e-calendar:timeChange", {
      calendar: calendarId || this.activeCalendarId,
      time: this.getTime(calendarId)
    });
  }

  /**
   * Advance time by minutes
   */
  async advanceTime(minutes, calendarId = null) {
    calendarId = calendarId || this.activeCalendarId;
    const cal = this.calendars[calendarId];
    if (!cal) return;
    
    const totalMinutes = (cal.currentHour * 60 + cal.currentMinute) + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    
    let dayAdvance = Math.floor(newHours / 24);
    cal.currentHour = newHours % 24;
    cal.currentMinute = newMinutes;
    
    if (dayAdvance > 0) {
      this._advanceDays(calendarId, dayAdvance);
    }
    
    // Sync with game time if primary
    if (calendarId === "primary" && game.dnd5e?.time) {
      await game.dnd5e.time.advance(minutes);
    }
    
    await this._saveCalendar(calendarId);
    
    Hooks.callAll("dnd5e-calendar:timeChange", {
      calendar: calendarId,
      time: this.getTime(calendarId),
      delta: minutes
    });
  }

  /**
   * Calculate day count from date
   */
  _calculateDayCount(calendar) {
    let days = calendar.currentDay;
    for (let m = 0; m < calendar.currentMonth; m++) {
      days += calendar.months[m]?.days || 30;
    }
    days += calendar.currentYear * calendar.months.reduce((sum, m) => sum + (m?.days || 30), 0);
    return days;
  }

  /**
   * Save calendar data
   */
  async _saveCalendar(calendarId) {
    const cal = this.calendars[calendarId];
    if (!cal) return;
    
    await CalendarData.update(`calendars.${calendarId}`, {
      currentDay: cal.currentDay,
      currentMonth: cal.currentMonth,
      currentYear: cal.currentYear,
      currentHour: cal.currentHour,
      currentMinute: cal.currentMinute,
      dayCount: cal.dayCount
    });
  }

  // ============== Independent Time (Secondary Calendar) ==============

  /**
   * Get independent time offset between calendars
   * Returns difference in days between primary and secondary
   */
  getTimeOffset() {
    const primary = this.calendars.primary;
    const secondary = this.calendars.secondary;
    
    if (!primary || !secondary) return 0;
    
    return secondary.dayCount - primary.dayCount;
  }

  /**
   * Sync secondary calendar to primary
   * Makes secondary calendar match primary's date
   */
  async syncSecondaryToPrimary() {
    const primary = this.calendars.primary;
    const secondary = this.calendars.secondary;
    
    if (!primary || !secondary) return;
    
    secondary.currentDay = primary.currentDay;
    secondary.currentMonth = primary.currentMonth;
    secondary.currentYear = primary.currentYear;
    secondary.currentHour = primary.currentHour;
    secondary.currentMinute = primary.currentMinute;
    secondary.dayCount = primary.dayCount;
    
    await this._saveCalendar("secondary");
    
    Hooks.callAll("dnd5e-calendar:calendarSync", {
      syncedTo: "primary",
      from: "secondary"
    });
  }

  /**
   * Link/unlink secondary calendar from game time
   */
  setLinkedToGameTime(linked) {
    this.linkedToGameTime = linked;
    console.log(`[DnD5e-Calendar] Secondary calendar linked to game.time: ${linked}`);
  }
}

// Export singleton
export const MultiCalendar = new MultiCalendarManager();

// Export for global access
window.MultiCalendar = MultiCalendar;