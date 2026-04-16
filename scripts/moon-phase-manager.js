import { CalendarUtils } from "./calendar-utils.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

export class MoonPhaseManager {
  constructor() {
    console.log("[DnD5e-Calendar] DEBUG: MoonPhaseManager class instantiated");
  }
  constructor(manager) {
    this.manager = manager;
    this.data = null;
  }

  initialize(data) {
    this.data = data;
  }

  getPhase() {
    return CalendarUtils.getMoonPhase(this.data.currentDay, this.data.cycleDays);
  }

  getPhaseName() {
    const phase = this.getPhase();
    return phase.name;
  }

  getPhaseIcon() {
    const phase = this.getPhase();
    return CalendarUtils.getMoonPhaseIcon(phase.key);
  }

  getCycleDay() {
    return this.data.currentDay % this.data.cycleDays;
  }

  getDaysUntilFull() {
    const cycleDay = this.getCycleDay();
    const fullMoonDay = Math.floor(this.data.cycleDays / 2);
    let daysUntil = fullMoonDay - cycleDay;
    if (daysUntil <= 0) daysUntil += this.data.cycleDays;
    return daysUntil;
  }

  getDaysUntilNew() {
    const cycleDay = this.getCycleDay();
    let daysUntil = this.data.cycleDays - cycleDay;
    if (daysUntil === this.data.cycleDays) daysUntil = 0;
    return daysUntil;
  }

  updateMoonPhase(dayCount) {
    const oldPhase = this.data.currentDay % this.data.cycleDays;
    const newPhase = dayCount % this.data.cycleDays;

    if (oldPhase !== newPhase) {
      this.data.currentDay = dayCount;
      Hooks.callAll("dnd5e-calendar:moonPhaseChange", {
        day: newPhase,
        phase: this.getPhase()
      });
    }

    return this.getPhase();
  }

  setCycleDays(days) {
    this.data.cycleDays = days;
    return this.data;
  }

  enable(enabled) {
    this.data.enabled = enabled;
    return this.data;
  }
}
