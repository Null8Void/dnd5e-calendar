import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

export class CalendarData {
  static getDefaultCalendar() {
    const cal = JSON.parse(JSON.stringify(CALENDAR_CONSTANTS.DEFAULT_CALENDARS.primary));
    cal.months = JSON.parse(JSON.stringify(CALENDAR_CONSTANTS.DEFAULT_MONTHS));
    cal.weekdays = JSON.parse(JSON.stringify(CALENDAR_CONSTANTS.DEFAULT_WEEKDAYS));
    return cal;
  }

  static getDefaultTime() {
    return {
      hour: CALENDAR_CONSTANTS.TIME.DEFAULT_START_HOUR,
      minute: CALENDAR_CONSTANTS.TIME.DEFAULT_START_MINUTE,
      second: 0
    };
  }

  static getDefaultSeason() {
    return {
      current: "spring",
      autoTrack: CALENDAR_CONSTANTS.DEFAULT_SETTINGS.autoTrackSeasons,
      monthRanges: {
        spring: CALENDAR_CONSTANTS.SEASONS.SPRING_MONTHS,
        summer: CALENDAR_CONSTANTS.SEASONS.SUMMER_MONTHS,
        fall: CALENDAR_CONSTANTS.SEASONS.FALL_MONTHS,
        winter: CALENDAR_CONSTANTS.SEASONS.WINTER_MONTHS
      }
    };
  }

  static getDefaultMoon() {
    return {
      cycleDays: CALENDAR_CONSTANTS.MOON.DEFAULT_CYCLE_DAYS,
      currentPhase: 0,
      currentDay: 0,
      enabled: true
    };
  }

  static getDefaultWeather() {
    return {
      current: "Clear skies",
      gmNotes: ""
    };
  }

  static getDefaultSettings() {
    return JSON.parse(JSON.stringify(CALENDAR_CONSTANTS.DEFAULT_SETTINGS));
  }

  static getDefaultDayNight() {
    return {
      isDay: true,
      dayStartHour: CALENDAR_CONSTANTS.DAY_NIGHT.DAY_START_HOUR,
      nightStartHour: CALENDAR_CONSTANTS.DAY_NIGHT.NIGHT_START_HOUR
    };
  }

  static getDefaultData() {
    return {
      version: CALENDAR_CONSTANTS.VERSION,
      activeCalendarId: "primary",
      calendars: {
        primary: this.getDefaultCalendar(),
        secondary: this.getDefaultCalendar()
      },
      time: this.getDefaultTime(),
      season: this.getDefaultSeason(),
      moon: this.getDefaultMoon(),
      weather: this.getDefaultWeather(),
      dayNight: this.getDefaultDayNight(),
      dayCount: 0
    };
  }

  static async load() {
    let data = game.settings.get("world", CALENDAR_CONSTANTS.SETTINGS_KEY);

    if (!data || Object.keys(data).length === 0) {
      data = this.getDefaultData();
      await this.save(data);
    }

    return data;
  }

  static async save(data) {
    await game.settings.set("world", CALENDAR_CONSTANTS.SETTINGS_KEY, data);
    return data;
  }

  static async update(path, value) {
    const data = await this.load();

    const keys = path.split(".");
    let current = data;

    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    await this.save(data);
    return data;
  }

  static async get(path) {
    const data = await this.load();
    const keys = path.split(".");
    let current = data;

    for (const key of keys) {
      if (current === undefined) return null;
      current = current[key];
    }

    return current;
  }

  static async loadSettings() {
    let settings = game.settings.get("world", CALENDAR_CONSTANTS.SETTINGS_CONFIG_KEY);

    if (!settings || Object.keys(settings).length === 0) {
      settings = this.getDefaultSettings();
      await this.saveSettings(settings);
    }

    return settings;
  }

  static async saveSettings(settings) {
    await game.settings.set("world", CALENDAR_CONSTANTS.SETTINGS_CONFIG_KEY, settings);
    return settings;
  }

  static async updateSettings(path, value) {
    const settings = await this.loadSettings();
    const keys = path.split(".");
    let current = settings;

    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    await this.saveSettings(settings);
    return settings;
  }

  static async loadHolidays() {
    let holidays = game.settings.get("world", CALENDAR_CONSTANTS.HOLIDAYS_KEY);

    if (!holidays) {
      holidays = {
        approved: [],
        pending: [],
        rejected: []
      };
      await this.saveHolidays(holidays);
    }

    return holidays;
  }

  static async saveHolidays(holidays) {
    await game.settings.set("world", CALENDAR_CONSTANTS.HOLIDAYS_KEY, holidays);
    return holidays;
  }

  static async addHoliday(holiday, status = "pending") {
    const holidays = await this.loadHolidays();
    holiday.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    holiday.submittedBy = game.users.current?.name ?? "Unknown User";
    holiday.submittedAt = new Date().toISOString();
    holiday.status = status;

    holidays[status].push(holiday);
    await this.saveHolidays(holidays);
    return holiday;
  }

  static async updateHoliday(id, updates) {
    const holidays = await this.loadHolidays();
    const allHolidays = [...holidays.approved, ...holidays.pending, ...holidays.rejected];
    const index = allHolidays.findIndex(h => h.id === id);

    if (index === -1) return null;

    let targetArray;
    if (holidays.approved.some(h => h.id === id)) targetArray = holidays.approved;
    else if (holidays.pending.some(h => h.id === id)) targetArray = holidays.pending;
    else targetArray = holidays.rejected;

    const localIndex = targetArray.findIndex(h => h.id === id);
    targetArray[localIndex] = { ...targetArray[localIndex], ...updates };

    await this.saveHolidays(holidays);
    return targetArray[localIndex];
  }

  static async approveHoliday(id) {
    const holidays = await this.loadHolidays();
    const pendingIndex = holidays.pending.findIndex(h => h.id === id);

    if (pendingIndex === -1) return null;

    const holiday = holidays.pending.splice(pendingIndex, 1)[0];
    holiday.status = "approved";
    holiday.approvedBy = game.users.current?.name ?? "Unknown User";
    holiday.approvedAt = new Date().toISOString();
    holidays.approved.push(holiday);

    await this.saveHolidays(holidays);
    return holiday;
  }

  static async rejectHoliday(id, reason = "") {
    const holidays = await this.loadHolidays();
    const pendingIndex = holidays.pending.findIndex(h => h.id === id);

    if (pendingIndex === -1) return null;

    const holiday = holidays.pending.splice(pendingIndex, 1)[0];
    holiday.status = "rejected";
    holiday.rejectedBy = game.users.current?.name ?? "Unknown User";
    holiday.rejectedAt = new Date().toISOString();
    holiday.rejectionReason = reason;
    holidays.rejected.push(holiday);

    await this.saveHolidays(holidays);
    return holiday;
  }
}
