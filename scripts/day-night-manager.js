import { CalendarUtils } from "./calendar-utils.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

export class DayNightManager {
  constructor(manager = null) {
    console.log("[DnD5e-Calendar] DEBUG: DayNightManager class instantiated");
    this.manager = manager;
    this.data = null;
    this.time = null;
  }

  initialize(data, time) {
    this.data = data;
    this.time = time;
  }

  isDay() {
    return CalendarUtils.isDayTime(
      this.time.hour,
      this.data.dayStartHour,
      this.data.nightStartHour
    );
  }

  getPeriod() {
    return this.isDay() ? "day" : "night";
  }

  getPeriodIcon() {
    return CalendarUtils.getTimePeriodIcon(
      this.time.hour,
      this.data.dayStartHour,
      this.data.nightStartHour
    );
  }

  getProgress() {
    return CalendarUtils.getDayNightProgress(
      this.time.hour,
      this.data.dayStartHour,
      this.data.nightStartHour,
      CALENDAR_CONSTANTS.TIME.HOURS_PER_DAY
    );
  }

  getDayStartHour() {
    return this.data.dayStartHour;
  }

  getNightStartHour() {
    return this.data.nightStartHour;
  }

  setDayStartHour(hour) {
    this.data.dayStartHour = hour;
    return this.data;
  }

  setNightStartHour(hour) {
    this.data.nightStartHour = hour;
    return this.data;
  }

  update(time) {
    const wasDay = this.isDay();
    this.time = time;
    const isDay = this.isDay();

    if (wasDay !== isDay) {
      Hooks.callAll("dnd5e-calendar:dayNightChange", {
        period: this.getPeriod(),
        isDay,
        icon: this.getPeriodIcon()
      });
    }
  }

  setHours(hoursPerDay) {
    const midPoint = Math.floor(hoursPerDay / 2);
    this.data.dayStartHour = 0;
    this.data.nightStartHour = midPoint;
    return this.data;
  }
}
