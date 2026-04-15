import { CalendarUtils } from "./calendar-utils.js";

export class WeatherManager {
  constructor(manager) {
    this.manager = manager;
    this.data = null;
  }

  initialize(data) {
    this.data = data;
  }

  getWeather() {
    return this.data.current;
  }

  getWeatherIcon() {
    return CalendarUtils.getWeatherIcon(this.data.current);
  }

  getGmNotes() {
    return this.data.gmNotes;
  }

  setWeather(weather) {
    const oldWeather = this.data.current;
    this.data.current = weather;

    if (oldWeather !== weather) {
      Hooks.callAll("dnd5e-calendar:weatherChange", {
        old: oldWeather,
        new: weather
      });
    }

    return this.data.current;
  }

  setGmNotes(notes) {
    this.data.gmNotes = notes;
    return this.data.gmNotes;
  }
}
