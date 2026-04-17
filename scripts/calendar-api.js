import { CalendarState } from "./calendar-data.js";

export class CalendarAPI {
  getCalendar() {
    return DnD5eCalendar?.getCalendar() ?? null;
  }

  getDate() {
    const state = CalendarState.get();
    return state?.date ?? { day: 1, month: 0, year: 1492 };
  }

  getTime() {
    const state = CalendarState.get();
    return state?.time ?? { hour: 6, minute: 0 };
  }

  getState() {
    return CalendarState.get();
  }

  getSeason() {
    const state = CalendarState.get();
    return state?.season?.current ?? "spring";
  }

  getWeather() {
    const state = CalendarState.get();
    return state?.weather?.current ?? "Clear skies";
  }

  getWeatherMode() {
    const state = CalendarState.get();
    return state?.weather?.mode ?? "manual";
  }

  getMoonPhase() {
    const state = CalendarState.get();
    return state?.moon?.phase ?? { name: "New Moon", key: "new", index: 0 };
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
    const result = await game.dnd5e.time.setDate(day, month, year);
    const state = CalendarState.get();
    state.date = { day, month, year };
    await CalendarState.set(state);
    Hooks.callAll("dnd5e-calendar:dateChange", state.date);
    return result;
  }

  async setTime(hour, minute) {
    if (!game.dnd5e?.time) return null;
    const currentTime = this.getTime();
    const minutesDiff = (hour - (currentTime?.hour ?? 0)) * 60 + (minute - (currentTime?.minute ?? 0));
    const result = await game.dnd5e.time.advance(minutesDiff);
    const state = CalendarState.get();
    state.time = { hour, minute };
    await CalendarState.set(state);
    Hooks.callAll("dnd5e-calendar:timeChange", state.time);
    return result;
  }

  async advanceTime(minutes = 1) {
    if (!game.dnd5e?.time) return null;
    const result = await game.dnd5e.time.advance(minutes);
    return result;
  }

  async setWeather(weather) {
    if (!DnD5eCalendar?.weatherManager) return null;
    const oldWeather = this.getWeather();
    const result = DnD5eCalendar.weatherManager.setWeather(weather);
    const state = CalendarState.get();
    state.weather.current = weather;
    state.weather.mode = "manual";
    await CalendarState.set(state);
    Hooks.callAll("dnd5e-calendar:weatherChange", { old: oldWeather, new: weather });
    return result;
  }

  async setWeatherMode(mode) {
    if (!DnD5eCalendar?.weatherManager) return null;
    const result = DnD5eCalendar.weatherManager.setMode(mode);
    const state = CalendarState.get();
    state.weather.mode = mode;
    await CalendarState.set(state);
    Hooks.callAll("dnd5e-calendar:weatherModeChange", { mode });
    return result;
  }

  setSeason(season) {
    if (!DnD5eCalendar?.seasonManager) return null;
    const oldSeason = this.getSeason();
    const result = DnD5eCalendar.seasonManager.setSeason(season);
    const state = CalendarState.get();
    state.season.current = season;
    CalendarState.set(state);
    Hooks.callAll("dnd5e-calendar:seasonChange", { season, oldSeason });
    return result;
  }

  async rollWeather(season = null) {
    if (!DnD5eCalendar?.seasonManager) return null;
    const oldWeather = this.getWeather();
    const weather = DnD5eCalendar.seasonManager.rollWeatherForDay(season);
    const state = CalendarState.get();
    state.weather.current = weather;
    state.weather.mode = "auto";
    await CalendarState.set(state);
    Hooks.callAll("dnd5e-calendar:autoWeatherRoll", { weather, season });
    return weather;
  }

  async submitHoliday(name, date, description = "") {
    return await DnD5eCalendar?.holidayManager?.submitHoliday(name, date, description) ?? null;
  }

  async approveHoliday(id) {
    return await DnD5eCalendar?.holidayManager?.approveHoliday(id) ?? null;
  }

  async rejectHoliday(id, reason = "") {
    return await DnD5eCalendar?.holidayManager?.rejectHoliday(id, reason) ?? null;
  }

  getPendingHolidays() {
    return DnD5eCalendar?.holidayManager?.getPendingHolidays() ?? [];
  }

  getApprovedHolidays() {
    return DnD5eCalendar?.holidayManager?.getApprovedHolidays() ?? [];
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
