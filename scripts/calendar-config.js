import { CalendarData } from "./calendar-data.js";
import { CalendarUtils } from "./calendar-utils.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarApprovalPanel } from "./holiday-approval-panel.js";
import { HolidaySubmitDialog } from "./holiday-submit-dialog.js";
import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

console.log("[DnD5e-Calendar] DEBUG: calendar-config.js LOADED");

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
      resizable: true,
      tabs: [
        { navSelector: ".tabs", contentSelector: ".tab-content" }
      ]
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

    html.find(".save-btn").click((e) => {
      this.saveAll(html);
    });

    html.find(".cancel-btn").click((e) => {
      this.close();
    });

    html.find(".time-control button").click((e) => {
      const action = $(e.currentTarget).data("action");
      const amount = parseInt($(e.currentTarget).data("amount")) || 1;
      this.adjustTime(action, amount);
    });

    html.find(".add-month-btn").click(() => {
      this.addMonth();
    });

    html.find(".remove-month-btn").click((e) => {
      const index = $(e.currentTarget).data("index");
      this.removeMonth(index);
    });

    html.find(".add-weekday-btn").click(() => {
      this.addWeekday();
    });

    html.find(".remove-weekday-btn").click((e) => {
      const index = $(e.currentTarget).data("index");
      this.removeWeekday(index);
    });

    html.find(".view-holidays-btn").click(() => {
      new CalendarApprovalPanel().render(true);
    });

    html.find(".submit-holiday-btn").click(() => {
      new HolidaySubmitDialog().render(true);
    });

    html.find(".season-auto-toggle").change((e) => {
      const enabled = $(e.target).prop("checked");
      this.settings.autoTrackSeasons = enabled;
    });
  }

  async saveAll(html) {
    const formData = new FormData(html.find("form")[0]);
    const data = this.getData();

    const calendarId = data.activeCalendarId;
    const calendar = data.calendars[calendarId];

    calendar.epoch = html.find('input[name="epoch"]').val() || "";
    calendar.yearZero = parseInt(html.find('input[name="yearZero"]').val()) || 0;

    const selectedCalendar = html.find('select[name="activeCalendar"]').val();
    if (selectedCalendar !== calendarId) {
      this.data.activeCalendarId = selectedCalendar;
    }

    const months = [];
    html.find(".month-row").each((i, row) => {
      months.push({
        name: $(row).find('input[name="monthName"]').val(),
        abbr: $(row).find('input[name="monthAbbr"]').val(),
        days: parseInt($(row).find('input[name="monthDays"]').val()) || 30
      });
    });
    calendar.months = months;

    const weekdays = [];
    html.find(".weekday-row").each((i, row) => {
      weekdays.push({
        name: $(row).find('input[name="weekdayName"]').val(),
        abbr: $(row).find('input[name="weekdayAbbr"]').val()
      });
    });
    calendar.weekdays = weekdays;

    this.settings.enableGradientBar = html.find('input[name="enableGradient"]').prop("checked");
    this.settings.enableIconToggle = html.find('input[name="enableIconToggle"]').prop("checked");
    this.settings.playersCanSubmitHolidays = html.find('input[name="playersCanSubmit"]').prop("checked");
    this.settings.playersCanViewPendingHolidays = html.find('input[name="playersCanViewPending"]').prop("checked");
    this.settings.autoTrackSeasons = html.find('input[name="autoTrackSeasons"]').prop("checked");
    this.settings.autoWeatherRoll = html.find('input[name="autoWeatherRoll"]').prop("checked");
    this.settings.showSeconds = html.find('input[name="showSeconds"]').prop("checked");

    this.settings.seasonNames = {
      spring: html.find('input[name="seasonNameSpring"]').val() || "Spring",
      summer: html.find('input[name="seasonNameSummer"]').val() || "Summer",
      fall: html.find('input[name="seasonNameFall"]').val() || "Fall",
      winter: html.find('input[name="seasonNameWinter"]').val() || "Winter"
    };

    await CalendarData.save(this.data);
    await CalendarData.saveSettings(this.settings);

    if (DnD5eCalendar.manager) {
      DnD5eCalendar.manager.settings = this.settings;
      DnD5eCalendar.manager.seasonManager.setSeasonNames(this.settings.seasonNames);
      DnD5eCalendar.manager.seasonManager.enableAutoWeatherRoll(this.settings.autoWeatherRoll);
    }

    ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.SettingsSaved"));
    this.close();
  }

  async adjustTime(action, amount) {
    switch (action) {
      case "addMinute":
        await DnD5eCalendar.manager.advanceTime(amount);
        break;
      case "addHour":
        await DnD5eCalendar.manager.advanceTime(amount * 60);
        break;
      case "addDay":
        for (let i = 0; i < amount; i++) {
          await DnD5eCalendar.manager.advanceTime(24 * 60);
        }
        break;
    }

    this.render();
    DnD5eCalendar.hud.render();
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
