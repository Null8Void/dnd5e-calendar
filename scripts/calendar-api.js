export class CalendarAPI {
  constructor() {
    console.log("[DnD5e-Calendar] DEBUG: CalendarAPI class instantiated");
  }
  getCalendar() {
    if (!DnD5eCalendar.manager) return null;
    return DnD5eCalendar.manager.getActiveCalendar();
  }

  getDate() {
    if (!DnD5eCalendar.manager) return null;
    return DnD5eCalendar.manager.getDate();
  }

  getTime() {
    if (!DnD5eCalendar.manager) return null;
    return DnD5eCalendar.manager.getTime();
  }

  getSeason() {
    if (!DnD5eCalendar.manager) return null;
    return DnD5eCalendar.manager.seasonManager.getCurrentSeason();
  }

  getWeather() {
    if (!DnD5eCalendar.manager) return null;
    return DnD5eCalendar.manager.weatherManager.getWeather();
  }

  getMoonPhase() {
    if (!DnD5eCalendar.manager) return null;
    return DnD5eCalendar.manager.moonManager.getPhase();
  }

  getDayNightStatus() {
    if (!DnD5eCalendar.manager) return null;
    return {
      isDay: DnD5eCalendar.manager.dayNightManager.isDay(),
      period: DnD5eCalendar.manager.dayNightManager.getPeriod()
    };
  }

  async setDate(day, month, year) {
    if (!DnD5eCalendar.manager) return null;
    return await DnD5eCalendar.manager.setDate(day, month, year);
  }

  async setTime(hour, minute) {
    if (!DnD5eCalendar.manager) return null;
    return await DnD5eCalendar.manager.setTime(hour, minute);
  }

  async advanceTime(minutes = 1) {
    if (!DnD5eCalendar.manager) return null;
    return await DnD5eCalendar.manager.advanceTime(minutes);
  }

  async setWeather(weather) {
    if (!DnD5eCalendar.manager) return null;
    return await DnD5eCalendar.manager.weatherManager.setWeather(weather);
  }

  async setSeason(season) {
    if (!DnD5eCalendar.manager) return null;
    return await DnD5eCalendar.manager.seasonManager.setSeason(season);
  }

  rollWeather(season = null) {
    if (!DnD5eCalendar.manager) return null;
    return DnD5eCalendar.manager.seasonManager.rollWeatherForDay(season);
  }

  async submitHoliday(name, date, description = "") {
    if (!DnD5eCalendar.manager) return null;
    return await DnD5eCalendar.manager.holidayManager.submitHoliday(name, date, description);
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
