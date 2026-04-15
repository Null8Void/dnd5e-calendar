import { CalendarUtils } from "./calendar-utils.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

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
    return CalendarUtils.getSeasonName(season);
  }

  getCurrentSeasonIcon() {
    const season = this.getCurrentSeason();
    return CalendarUtils.getSeasonIcon(season);
  }

  setSeason(season) {
    this.data.current = season;
    this.data.autoTrack = false;

    Hooks.callAll("dnd5e-calendar:seasonChange", {
      season,
      name: CalendarUtils.getSeasonName(season)
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
        name: CalendarUtils.getSeasonName(season),
        auto: true
      });
    }

    return this.data;
  }

  setMonthRanges(ranges) {
    this.data.monthRanges = ranges;
    return this.data;
  }
}
