import { CalendarData } from "./calendar-data.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarUtils } from "./calendar-utils.js";

export class HolidaySubmitDialog extends Application {
  constructor(options = {}) {
    console.log("[DnD5e-Calendar] DEBUG: HolidaySubmitDialog constructor fired");
    super(options);
    this.selectedDate = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dnd5e-holiday-submit",
      classes: ["dnd5e-holiday-submit"],
      title: game.i18n.localize("DNDCAL.Holidays.SubmitTitle"),
      template: "modules/dnd5e-calendar/templates/holiday-submit-dialog.html",
      width: 400,
      height: 350,
      resizable: false
    });
  }

  async getData(options = {}) {
    const settings = await CalendarData.loadSettings();
    const date = DnD5eCalendar.getDate();
    const calendar = DnD5eCalendar.getCalendar();

    return {
      day: date.day,
      month: date.month,
      year: date.year,
      calendarName: calendar?.name || "Campaign Calendar",
      canSubmit: CalendarPermissions.canSubmitHolidays(settings),
      maxChars: 400
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];

    el.querySelector(".submit-btn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      await this.submitHoliday(el);
    });

    el.querySelector(".cancel-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.close();
    });

    el.querySelector(".description-input")?.addEventListener("input", (e) => {
      const len = e.target.value.length;
      const remaining = 400 - len;
      const charCountEl = el.querySelector(".char-count");
      if (charCountEl) {
        charCountEl.textContent = `${remaining} ${game.i18n.localize("DNDCAL.Holidays.CharactersRemaining")}`;
        if (remaining < 0) {
          charCountEl.classList.add("over-limit");
        } else {
          charCountEl.classList.remove("over-limit");
        }
      }
    });
  }

  async submitHoliday(el) {
    const name = el.querySelector('input[name="holidayName"]')?.value.trim() || "";
    const day = parseInt(el.querySelector('input[name="day"]')?.value) || 1;
    const month = parseInt(el.querySelector('input[name="month"]')?.value) || 0;
    const year = parseInt(el.querySelector('input[name="year"]')?.value) || 0;
    const description = el.querySelector(".description-input")?.value.trim() || "";

    if (!name) {
      ui.notifications.error(game.i18n.localize("DNDCAL.Notifications.EnterHolidayName"));
      return;
    }

    if (description.length > 400) {
      ui.notifications.error(game.i18n.localize("DNDCAL.Notifications.InvalidDescription"));
      return;
    }

    try {
      await DnD5eCalendar.holidayManager.submitHoliday(name, { day, month, year }, description);
      ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.HolidaySubmitted"));
      this.close();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }
}
