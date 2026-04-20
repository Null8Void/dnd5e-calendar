import { CalendarData } from "./calendar-data.js";
import { CalendarUtils } from "./calendar-utils.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarApprovalPanel } from "./holiday-approval-panel.js";
import { HolidaySubmitDialog } from "./holiday-submit-dialog.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

export class CalendarConfig extends Application {
  constructor(options = {}) {
    console.log("[DnD5e-Calendar] DEBUG: CalendarConfig constructor fired");
    super(options);
    this.activeTab = "calendar";
    this.data = null;
    this.settings = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dnd5e-calendar-config",
      classes: ["dnd5e-calendar-config"],
      title: game.i18n.localize("DNDCAL.Config.Title"),
      template: "modules/dnd5e-calendar/templates/calendar-config.html",
      width: 700,
      height: 600,
      resizable: true
    });
  }

  async getData(options = {}) {
    this.data = await CalendarData.load();
    this.settings = await CalendarData.loadSettings();

    return {
      ...this.data,
      settings: this.settings,
      constants: CALENDAR_CONSTANTS
    };
  }

  async render(force = false, options = {}) {
    if (!CalendarPermissions.canEdit()) {
      ui.notifications.warn(game.i18n.localize("DNDCAL.Permissions.GMOnly"));
      return;
    }
    return super.render(force, options);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];

    el.querySelector(".save-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.saveAll(el);
    });

    el.querySelector(".cancel-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.close();
    });

    el.querySelectorAll(".time-control button").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        const amount = parseInt(e.currentTarget.dataset.amount) || 1;
        this.adjustTime(action, amount);
      });
    });

    el.querySelector(".add-month-btn")?.addEventListener("click", () => {
      this.addMonth();
    });

    el.querySelectorAll(".remove-month-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.removeMonth(index);
      });
    });

    el.querySelector(".add-weekday-btn")?.addEventListener("click", () => {
      this.addWeekday();
    });

    el.querySelectorAll(".remove-weekday-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.removeWeekday(index);
      });
    });

    el.querySelector(".view-holidays-btn")?.addEventListener("click", () => {
      new CalendarApprovalPanel().render(true);
    });

    el.querySelector(".submit-holiday-btn")?.addEventListener("click", () => {
      new HolidaySubmitDialog().render(true);
    });

    el.querySelector(".season-auto-toggle")?.addEventListener("change", (e) => {
      this.settings.autoTrackSeasons = e.target.checked;
    });
  }

  async saveAll(el) {
    const formEl = el.querySelector("form");
    const formData = formEl ? new FormData(formEl) : null;
    const data = this.getData();

    const calendarId = data.activeCalendarId;
    const calendar = data.calendars[calendarId];

    calendar.epoch = el.querySelector('input[name="epoch"]')?.value || "";
    calendar.yearZero = parseInt(el.querySelector('input[name="yearZero"]')?.value) || 0;
    calendar.yearName = el.querySelector('input[name="yearName"]')?.value || "";
    calendar.intercalaryDays = parseInt(el.querySelector('input[name="intercalaryDays"]')?.value) || 0;

    const selectedCalendar = el.querySelector('select[name="activeCalendar"]')?.value;
    if (selectedCalendar !== calendarId) {
      this.data.activeCalendarId = selectedCalendar;
    }

    const months = [];
    el.querySelectorAll(".month-row").forEach(row => {
      months.push({
        name: row.querySelector('input[name="monthName"]')?.value || "",
        abbr: row.querySelector('input[name="monthAbbr"]')?.value || "",
        days: parseInt(row.querySelector('input[name="monthDays"]')?.value) || 30
      });
    });
    calendar.months = months;

    const weekdays = [];
    el.querySelectorAll(".weekday-row").forEach(row => {
      weekdays.push({
        name: row.querySelector('input[name="weekdayName"]')?.value || "",
        abbr: row.querySelector('input[name="weekdayAbbr"]')?.value || ""
      });
    });
    calendar.weekdays = weekdays;

    this.settings.enableGradientBar = el.querySelector('input[name="enableGradient"]')?.checked || false;
    this.settings.enableIconToggle = el.querySelector('input[name="enableIconToggle"]')?.checked || false;
    this.settings.playersCanSubmitHolidays = el.querySelector('input[name="playersCanSubmit"]')?.checked || false;
    this.settings.playersCanViewPendingHolidays = el.querySelector('input[name="playersCanViewPending"]')?.checked || false;
    this.settings.autoTrackSeasons = el.querySelector('input[name="autoTrackSeasons"]')?.checked || false;
    this.settings.autoWeatherRoll = el.querySelector('input[name="autoWeatherRoll"]')?.checked || false;
    this.settings.showSeconds = el.querySelector('input[name="showSeconds"]')?.checked || false;

    this.settings.seasonNames = {
      spring: el.querySelector('input[name="seasonNameSpring"]')?.value || "Spring",
      summer: el.querySelector('input[name="seasonNameSummer"]')?.value || "Summer",
      fall: el.querySelector('input[name="seasonNameFall"]')?.value || "Fall",
      winter: el.querySelector('input[name="seasonNameWinter"]')?.value || "Winter"
    };

    await CalendarData.saveSettings(this.settings);

    if (DnD5eCalendar.seasonManager) {
      DnD5eCalendar.seasonManager.setSeasonNames(this.settings.seasonNames);
      DnD5eCalendar.seasonManager.enableAutoWeatherRoll(this.settings.autoWeatherRoll);
    }

    ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.SettingsSaved"));
    this.close();
  }

  async adjustTime(action, amount) {
    if (!game.dnd5e?.time) {
      ui.notifications.warn("Time advancement requires dnd5e system");
      return;
    }

    switch (action) {
      case "addMinute":
        await game.dnd5e.time.advance(amount);
        break;
      case "addHour":
        await game.dnd5e.time.advance(amount * 60);
        break;
      case "addDay":
        await game.dnd5e.time.advance(amount * 24 * 60);
        break;
    }

    this.render();
  }

  addMonth() {
    const defaultMonth = { name: "New Month", abbr: "NM", days: 30 };
    this.data.calendars[this.data.activeCalendarId].months.push(defaultMonth);
    this.render();
  }

  removeMonth(index) {
    this.data.calendars[this.data.activeCalendarId].months.splice(index, 1);
    this.render();
  }

  addWeekday() {
    const defaultWeekday = { name: "New Day", abbr: "ND" };
    this.data.calendars[this.data.activeCalendarId].weekdays.push(defaultWeekday);
    this.render();
  }

  removeWeekday(index) {
    this.data.calendars[this.data.activeCalendarId].weekdays.splice(index, 1);
    this.render();
  }
}
