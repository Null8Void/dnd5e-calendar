import { CalendarUtils } from "./calendar-utils.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

console.log("[DnD5e-Calendar] DEBUG: season-manager.js LOADED");

export class SeasonManager {
  constructor(manager) {
    this.manager = manager;
    this.data = null;
  }

  initialize(data) {
    this.data = data;
  }

  getCurrentSeason() {
    if (!this.data.autoTrack) {
      return this.data.current;
    }

    const month = this.manager.getDate().month;
    return CalendarUtils.getSeasonFromMonth(month, this.data.monthRanges);
  }

  getCurrentSeasonName() {
    const season = this.getCurrentSeason();
    if (this.data.seasonNames && this.data.seasonNames[season]) {
      return this.data.seasonNames[season];
    }
    return CalendarUtils.getSeasonName(season);
  }

  getCurrentSeasonIcon() {
    const season = this.getCurrentSeason();
    return CalendarUtils.getSeasonIcon(season);
  }

  setSeason(season) {
    const oldSeason = this.data.current;
    this.data.current = season;
    this.data.autoTrack = false;

    Hooks.callAll("dnd5e-calendar:seasonChange", {
      season,
      name: this.getCurrentSeasonName(),
      oldSeason
    });

    return this.data.current;
  }

  enableAutoTrack(enabled) {
    this.data.autoTrack = enabled;

    if (enabled) {
      const season = this.getCurrentSeason();
      this.data.current = season;
      Hooks.callAll("dnd5e-calendar:seasonChange", {
        season,
        name: this.getCurrentSeasonName(),
        auto: true
      });
    }

    return this.data;
  }

  setMonthRanges(ranges) {
    this.data.monthRanges = ranges;
    return this.data;
  }

  setSeasonNames(names) {
    this.data.seasonNames = {
      spring: names.spring || "Spring",
      summer: names.summer || "Summer",
      fall: names.fall || "Fall",
      winter: names.winter || "Winter"
    };
    Hooks.callAll("dnd5e-calendar:seasonNamesChange", {
      names: this.data.seasonNames
    });
    return this.data.seasonNames;
  }

  getSeasonNames() {
    return {
      spring: this.data.seasonNames?.spring || "Spring",
      summer: this.data.seasonNames?.summer || "Summer",
      fall: this.data.seasonNames?.fall || "Fall",
      winter: this.data.seasonNames?.winter || "Winter"
    };
  }

  onDayChange(oldDate, newDate) {
    const oldSeason = this.getCurrentSeason();

    if (this.data.autoTrack) {
      const newSeason = CalendarUtils.getSeasonFromMonth(newDate.month, this.data.monthRanges);
      if (newSeason !== oldSeason) {
        this.data.current = newSeason;
        Hooks.callAll("dnd5e-calendar:seasonChange", {
          season: newSeason,
          name: this.getCurrentSeasonName(),
          oldSeason,
          auto: true
        });
      }
    }

    if (this.data.autoWeatherRoll) {
      this.rollWeatherForDay(newDate);
    }

    Hooks.callAll("dnd5e-calendar:dayChange", {
      oldDate,
      newDate,
      season: this.getCurrentSeason(),
      seasonName: this.getCurrentSeasonName()
    });
  }

  rollWeatherForDay(date = null) {
    if (!this.manager?.weatherManager) return null;

    const season = this.getCurrentSeason();
    const weather = this.manager.weatherManager.rollAndSetWeather(season);

    Hooks.callAll("dnd5e-calendar:autoWeatherRoll", {
      weather,
      season,
      date: date || this.manager.getDate()
    });

    return weather;
  }

  enableAutoWeatherRoll(enabled) {
    this.data.autoWeatherRoll = enabled;
    return this.data.autoWeatherRoll;
  }

  isAutoWeatherRollEnabled() {
    return this.data.autoWeatherRoll || false;
  }
}
