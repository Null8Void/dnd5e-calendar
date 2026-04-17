export class CalendarAPI {
  getCalendar() {
    return DnD5eCalendar?.getCalendar() ?? null;
  }

  getDate() {
    return DnD5eCalendar?.getDate() ?? null;
  }

  getTime() {
    return DnD5eCalendar?.getTime() ?? null;
  }

  getSeason() {
    return DnD5eCalendar?.seasonManager?.getCurrentSeason() ?? null;
  }

  getWeather() {
    return DnD5eCalendar?.weatherManager?.getWeather() ?? null;
  }

  getMoonPhase() {
    return DnD5eCalendar?.moonManager?.getPhase() ?? null;
  }

  getDayNightStatus() {
    const time = this.getTime();
    if (!time) return null;
    return {
      isDay: time.hour >= 6 && time.hour < 18,
      period: time.hour >= 6 && time.hour < 18 ? "day" : "night"
    };
  }

  async setDate(day, month, year) {
    if (!game.dnd5e?.time) return null;
    return await game.dnd5e.time.setDate(day, month, year);
  }

  async setTime(hour, minute) {
    if (!game.dnd5e?.time) return null;
    const currentTime = this.getTime();
    const minutesDiff = (hour - (currentTime?.hour ?? 0)) * 60 + (minute - (currentTime?.minute ?? 0));
    return await game.dnd5e.time.advance(minutesDiff);
  }

  async advanceTime(minutes = 1) {
    if (!game.dnd5e?.time) return null;
    return await game.dnd5e.time.advance(minutes);
  }

  setWeather(weather) {
    return DnD5eCalendar?.weatherManager?.setWeather(weather) ?? null;
  }

  setSeason(season) {
    return DnD5eCalendar?.seasonManager?.setSeason(season) ?? null;
  }

  rollWeather(season = null) {
    return DnD5eCalendar?.seasonManager?.rollWeatherForDay(season) ?? null;
  }

  async submitHoliday(name, date, description = "") {
    return await DnD5eCalendar?.holidayManager?.submitHoliday(name, date, description) ?? null;
  }

  onDateChange(callback) {
    Hooks.on("dnd5e-calendar:dateChange", callback);
  }

  onDayChange(callback) {
    Hooks.on("dnd5e-calendar:dayChange", callback);
  }

  onTimeChange(callback) {
    Hooks.on("dnd5e-calendar:timeChange", callback);
  }

  onSeasonChange(callback) {
    Hooks.on("dnd5e-calendar:seasonChange", callback);
  }

  onWeatherChange(callback) {
    Hooks.on("dnd5e-calendar:weatherChange", callback);
  }

  onAutoWeatherRoll(callback) {
    Hooks.on("dnd5e-calendar:autoWeatherRoll", callback);
  }

  onMoonPhaseChange(callback) {
    Hooks.on("dnd5e-calendar:moonPhaseChange", callback);
  }

  onDayNightChange(callback) {
    Hooks.on("dnd5e-calendar:dayNightChange", callback);
  }

  onHolidaySubmitted(callback) {
    Hooks.on("dnd5e-calendar:holidaySubmitted", callback);
  }

  onHolidayApproved(callback) {
    Hooks.on("dnd5e-calendar:holidayApproved", callback);
  }
}

window.DnD5eCalendarAPI = new CalendarAPI();
