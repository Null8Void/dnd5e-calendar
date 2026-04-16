import { CalendarData } from "./calendar-data.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarUtils } from "./calendar-utils.js";

export class CalendarApprovalPanel extends Application {
  constructor(options = {}) {
    super(options);
    this.activeTab = "pending";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dnd5e-holiday-approval",
      classes: ["dnd5e-holiday-approval"],
      title: game.i18n.localize("DNDCAL.Holidays.ViewHolidays"),
      template: "modules/dnd5e-calendar/templates/holiday-approval-panel.html",
      width: 600,
      height: 500,
      resizable: true,
      tabs: [
        { navSelector: ".tabs", contentSelector: ".tab-content" }
      ]
    });
  }

  async getData(options = {}) {
    const holidays = await CalendarData.loadHolidays();

    const pending = holidays.pending.map(h => this.formatHoliday(h));
    const approved = holidays.approved.map(h => this.formatHoliday(h));
    const rejected = holidays.rejected.map(h => this.formatHoliday(h));

    return {
      pending,
      approved,
      rejected,
      canApprove: CalendarPermissions.canApproveHolidays()
    };
  }

  formatHoliday(holiday) {
    const truncated = CalendarUtils.truncateDescription(holiday.description, 100);
    return {
      ...holiday,
      truncatedDescription: truncated,
      formattedDate: `${holiday.month + 1}/${holiday.day}/${holiday.year}`,
      submittedAt: new Date(holiday.submittedAt).toLocaleDateString()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".approve-btn").click(async (e) => {
      const id = $(e.currentTarget).data("id");
      await this.approveHoliday(id);
    });

    html.find(".reject-btn").click(async (e) => {
      const id = $(e.currentTarget).data("id");
      await this.rejectHoliday(id);
    });

    html.find(".delete-btn").click(async (e) => {
      const id = $(e.currentTarget).data("id");
      await this.deleteHoliday(id);
    });
  }

  async approveHoliday(id) {
    try {
      await DnD5eCalendar.manager.holidayManager.approveHoliday(id);
      ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.HolidayApproved"));
      this.render();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  async rejectHoliday(id) {
    const reason = await Dialog.prompt({
      title: game.i18n.localize("DNDCAL.Holidays.Reject"),
      content: `<label>${game.i18n.localize("DNDCAL.Holidays.RejectionReason")}:</label><textarea name="reason" rows="3"></textarea>`,
      callback: (html) => html.find('textarea[name="reason"]').val()
    });

    try {
      await DnD5eCalendar.manager.holidayManager.rejectHoliday(id, reason || "");
      ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.HolidayRejected"));
      this.render();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  async deleteHoliday(id) {
    try {
      await DnD5eCalendar.manager.holidayManager.deleteHoliday(id);
      ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.HolidayDeleted"));
      this.render();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }
}
