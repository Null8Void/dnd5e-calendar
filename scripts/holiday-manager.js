import { CalendarData } from "./calendar-data.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarUtils } from "./calendar-utils.js";

export class HolidayManager {
  constructor(manager = null) {
    console.log("[DnD5e-Calendar] DEBUG: HolidayManager class instantiated");
    this.manager = manager;
    this.data = null;
  }

  async initialize() {
    this.data = await CalendarData.loadHolidays();
  }

  getApprovedHolidays() {
    return this.data.approved;
  }

  getPendingHolidays() {
    const settings = this.manager?.settings || {};
    if (!CalendarPermissions.canViewPendingHolidays(settings)) {
      return [];
    }
    return this.data.pending;
  }

  getRejectedHolidays() {
    const settings = this.manager?.settings || {};
    if (!CalendarPermissions.canViewPendingHolidays(settings)) {
      return [];
    }
    return this.data.rejected;
  }

  isHoliday(day, month, year, calendarId) {
    return this.data.approved.some(h =>
      h.day === day && h.month === month && h.year === year && h.calendarId === calendarId
    );
  }

  getHolidayOnDate(day, month, year, calendarId) {
    return this.data.approved.find(h =>
      h.day === day && h.month === month && h.year === year && h.calendarId === calendarId
    );
  }

  async submitHoliday(name, date, description = "") {
    const settings = this.manager?.settings || {};
    if (!CalendarPermissions.canSubmitHolidays(settings)) {
      throw new Error("User does not have permission to submit holidays");
    }

    if (!CalendarUtils.validateHolidayDescription(description)) {
      throw new Error("Description exceeds 400 character limit");
    }

    const holiday = {
      name,
      day: date.day,
      month: date.month,
      year: date.year,
      calendarId: this.manager.data.activeCalendarId,
      description
    };

    const saved = await CalendarData.addHoliday(holiday, "pending");

    Hooks.callAll("dnd5e-calendar:holidaySubmitted", saved);

    return saved;
  }

  async approveHoliday(id) {
    if (!CalendarPermissions.canApproveHolidays()) {
      throw new Error("User does not have permission to approve holidays");
    }

    const approved = await CalendarData.approveHoliday(id);

    if (approved) {
      Hooks.callAll("dnd5e-calendar:holidayApproved", approved);
    }

    return approved;
  }

  async rejectHoliday(id, reason = "") {
    if (!CalendarPermissions.canApproveHolidays()) {
      throw new Error("User does not have permission to reject holidays");
    }

    const rejected = await CalendarData.rejectHoliday(id, reason);

    if (rejected) {
      Hooks.callAll("dnd5e-calendar:holidayRejected", rejected);
    }

    return rejected;
  }

  async deleteHoliday(id) {
    if (!CalendarPermissions.canApproveHolidays()) {
      throw new Error("User does not have permission to delete holidays");
    }

    const holidays = await CalendarData.loadHolidays();

    let deleted = false;
    const arrays = ["approved", "pending", "rejected"];

    for (const arr of arrays) {
      const index = holidays[arr].findIndex(h => h.id === id);
      if (index !== -1) {
        holidays[arr].splice(index, 1);
        deleted = true;
        break;
      }
    }

    if (deleted) {
      await CalendarData.saveHolidays(holidays);
    }

    return deleted;
  }

  async addApprovedHoliday(name, day, month, year, description = "", calendarId = null) {
    if (!CalendarPermissions.canApproveHolidays()) {
      throw new Error("User does not have permission to add holidays");
    }

    const holiday = {
      name,
      day,
      month,
      year,
      calendarId: calendarId || this.manager.data.activeCalendarId,
      description
    };

    return await CalendarData.addHoliday(holiday, "approved");
  }
}
