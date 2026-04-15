import { CalendarData } from "./calendar-data.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarUtils } from "./calendar-utils.js";

export class HolidaySubmitDialog extends Application {
  constructor(options = {}) {
    super(options);
    this.selectedDate = null;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "dnd5e-holiday-submit",
      classes: ["dnd5e-holiday-submit"],
      title: "Submit Holiday",
      template: "modules/dnd5e-calendar/templates/holiday-submit-dialog.html",
      width: 400,
      height: 350,
      resizable: false
    });
  }

  async getData(options = {}) {
    const settings = await CalendarData.loadSettings();
    const manager = DnD5eCalendar.manager;
    const date = manager.getDate();
    const calendar = manager.getActiveCalendar();

    return {
      day: date.day,
      month: date.month,
      year: date.year,
      calendarName: calendar.name,
      canSubmit: CalendarPermissions.canSubmitHolidays(settings),
      maxChars: 400
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".submit-btn").click(async () => {
      await this.submitHoliday(html);
    });

    html.find(".cancel-btn").click(() => {
      this.close();
    });

    html.find(".description-input").on("input", (e) => {
      const len = $(e.target).val().length;
      const remaining = 400 - len;
      html.find(".char-count").text(`${remaining} characters remaining`);
      if (remaining < 0) {
        html.find(".char-count").addClass("over-limit");
      } else {
        html.find(".char-count").removeClass("over-limit");
      }
    });
  }

  async submitHoliday(html) {
    const name = html.find('input[name="holidayName"]').val().trim();
    const day = parseInt(html.find('input[name="day"]').val());
    const month = parseInt(html.find('input[name="month"]').val());
    const year = parseInt(html.find('input[name="year"]').val());
    const description = html.find(".description-input").val().trim();

    if (!name) {
      ui.notifications.error("Please enter a holiday name.");
      return;
    }

    if (description.length > 400) {
      ui.notifications.error("Description exceeds 400 character limit.");
      return;
    }

    try {
      await DnD5eCalendar.manager.holidayManager.submitHoliday(name, { day, month, year }, description);
      ui.notifications.info("Holiday submitted for GM approval.");
      this.close();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }
}
