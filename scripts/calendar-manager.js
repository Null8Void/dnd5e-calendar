import { CalendarData } from "./calendar-data.js";
import { CalendarUtils } from "./calendar-utils.js";
import { MoonPhaseManager } from "./moon-phase-manager.js";
import { WeatherManager } from "./weather-manager.js";
import { SeasonManager } from "./season-manager.js";
import { DayNightManager } from "./day-night-manager.js";
import { HolidayManager } from "./holiday-manager.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

export class CalendarManager {
  constructor() {
    console.log("[DnD5e-Calendar] DEBUG: CalendarManager constructor fired");
    this.data = null;
    this.settings = null;
    this.moonManager = new MoonPhaseManager(this);
    this.weatherManager = new WeatherManager(this);
    this.seasonManager = new SeasonManager(this);
    this.dayNightManager = new DayNightManager(this);
    this.holidayManager = new HolidayManager(this);
    this.timeInterval = null;
  }

  async initialize() {
    CalendarDebug.feature("calendar", "Initializing CalendarManager");
    this.data = await CalendarData.load();

    CalendarDebug.feature("data", "Calendar data loaded", {
      activeCalendar: this.data.activeCalendarId,
      dayCount: this.data.dayCount,
      time: this.data.time
    });

    this.moonManager.initialize(this.data.moon);
    this.weatherManager.initialize(this.data.weather);
    this.seasonManager.initialize(this.data.season);
    this.dayNightManager.initialize(this.data.dayNight, this.data.time);
    this.holidayManager.initialize();

    this.settings = await CalendarData.loadSettings();
    CalendarDebug.feature("calendar", "Settings loaded", this.settings);

    if (this.settings.timeFlowEnabled) {
      this.startTimeFlow(this.settings.realSecondsPerGameHour);
      CalendarDebug.feature("time", "Time flow started", { interval: this.settings.realSecondsPerGameHour });
    }

    if (this.settings.autoWeatherRoll) {
      this.seasonManager.enableAutoWeatherRoll(true);
    }

    console.log("DnD5e Calendar | CalendarManager initialized");
  }

  getActiveCalendar() {
    return this.data.calendars[this.data.activeCalendarId];
  }

  getTime() {
    return this.data.time;
  }

  getDate() {
    const cal = this.data?.calendars?.[this.data?.activeCalendarId];
    if (!cal) {
      return { day: 1, month: 0, year: 0 };
    }
    return {
      day: cal.currentDay || 1,
      month: cal.currentMonth ?? 0,
      year: cal.currentYear || 0
    };
  }

  getDayCount() {
    return this.data.dayCount || 0;
  }

  async advanceTime(minutes = 1) {
    const timeConfig = {
      minutesPerHour: CALENDAR_CONSTANTS.TIME.MINUTES_PER_HOUR,
      hoursPerDay: CALENDAR_CONSTANTS.TIME.HOURS_PER_DAY
    };

    const newTime = CalendarUtils.advanceTime(this.data.time, minutes, timeConfig);
    const oldTime = { ...this.data.time };
    this.data.time = newTime;

    CalendarDebug.feature("time", "Time advanced", { oldTime, newTime, minutes });

    let dayChanged = false;

    if (newTime.hour < oldTime.hour || (newTime.hour === 0 && oldTime.hour !== 0)) {
      const oldDate = this.getDate();
      const newDate = CalendarUtils.advanceDay(oldDate, this.getActiveCalendar());
      CalendarDebug.feature("time", "Day changed", { oldDate, newDate });

      this.data.calendars[this.data.activeCalendarId].currentDay = newDate.day;
      this.data.calendars[this.data.activeCalendarId].currentMonth = newDate.month;
      this.data.calendars[this.data.activeCalendarId].currentYear = newDate.year;
      this.data.dayCount++;
      dayChanged = true;

      if (dayChanged) {
        this.seasonManager.onDayChange(oldDate, newDate);
      }
    }

    await CalendarData.save(this.data);

    this.dayNightManager.update(newTime);
    this.moonManager.updateMoonPhase(this.data.dayCount);

    Hooks.callAll("dnd5e-calendar:timeChange", { oldTime, newTime, dayChanged });

    if (dayChanged) {
      Hooks.callAll("dnd5e-calendar:dateChange", this.getDate());
    }

    return { time: newTime, dayChanged };
  }

  async setDate(day, month, year) {
    CalendarDebug.feature("calendar", "Setting date", { day, month, year });

    const oldDate = this.getDate();
    this.data.calendars[this.data.activeCalendarId].currentDay = day;
    this.data.calendars[this.data.activeCalendarId].currentMonth = month;
    this.data.calendars[this.data.activeCalendarId].currentYear = year;

    this.data.dayCount = CalendarUtils.getTotalDaysPassed(
      day, month, year,
      this.data.calendars[this.data.activeCalendarId]
    );

    await CalendarData.save(this.data);
    CalendarDebug.feature("calendar", "Date saved", { oldDate, newDate: { day, month, year }, dayCount: this.data.dayCount });

    Hooks.callAll("dnd5e-calendar:dateChange", { day, month, year });

    return this.getDate();
  }

  async setTime(hour, minute) {
    const oldTime = { ...this.data.time };
    this.data.time = { hour, minute, second: 0 };

    CalendarDebug.feature("time", "Setting time", { oldTime, newTime: this.data.time });

    await CalendarData.save(this.data);
    this.dayNightManager.update(this.data.time);

    Hooks.callAll("dnd5e-calendar:timeChange", { oldTime, newTime: this.data.time, dayChanged: false });

    return this.data.time;
  }

  startTimeFlow(realSecondsPerGameHour) {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }

    const gameMinutesPerInterval = 1;
    const realMsPerInterval = (realSecondsPerGameHour * 1000) / 60;

    this.timeInterval = setInterval(() => {
      this.advanceTime(gameMinutesPerInterval);
    }, realMsPerInterval);

    CalendarDebug.feature("time", "Time flow interval started", { realMsPerInterval });
  }

  stopTimeFlow() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
      CalendarDebug.feature("time", "Time flow stopped");
    }
  }

  handleSocketUpdate(data) {
    CalendarDebug.feature("sockets", "Socket update received", data);
    this.data = data;
    Hooks.callAll("dnd5e-calendar:sync", data);
  }

  broadcastUpdate() {
    if (game.socket) {
      CalendarDebug.feature("sockets", "Broadcasting update");
      game.socket.emit("dnd5e-calendar:update", this.data);
    }
  }
}
