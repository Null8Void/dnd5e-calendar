import { CalendarData } from "./calendar-data.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { CalendarUtils } from "./calendar-utils.js";

/**
 * CalendarApprovalPanel - Holiday management panel
 * 
 * FoundryVTT v14 Compliance Updates:
 * - Uses Application base class
 * - Native DOM event handling
 * - Reactive data loading pattern
 * - Event delegation for list items
 * 
 * @extends Application
 */
export class CalendarApprovalPanel extends Application {
  constructor(options = {}) {
    console.log("[DnD5e-Calendar] DEBUG: CalendarApprovalPanel constructor fired");
    super(options);
    
    // Active tab for UI state
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
      resizable: true
    });
  }

  /**
   * Get context data for template
   */
  async getData(options = {}) {
    const holidays = await CalendarData.loadHolidays();

    // Format holidays for display
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

  /**
   * Format holiday data for display
   * Truncates description and formats date
   * 
   * @param {Object} holiday - Holiday data
   * @returns {Object} Formatted holiday
   */
  formatHoliday(holiday) {
    const truncated = CalendarUtils.truncateDescription(holiday.description, 100);
    return {
      ...holiday,
      truncatedDescription: truncated,
      formattedDate: `${holiday.month + 1}/${holiday.day}/${holiday.year}`,
      submittedAt: new Date(holiday.submittedAt).toLocaleDateString()
    };
  }

  /**
   * Activate event listeners
   * Uses native DOM API - event delegation for efficiency
   * 
   * @param {HTMLElement} html - Rendered HTML
   */
  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];

    // Approve buttons - using querySelectorAll + forEach
    el.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        await this.approveHoliday(id);
      });
    });

    // Reject buttons
    el.querySelectorAll(".reject-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        await this.rejectHoliday(id);
      });
    });

    // Delete buttons
    el.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        await this.deleteHoliday(id);
      });
    });
  }

  /**
   * Approve a holiday
   * 
   * @param {string} id - Holiday ID
   */
  async approveHoliday(id) {
    try {
      await DnD5eCalendar.holidayManager.approveHoliday(id);
      ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.HolidayApproved"));
      this.render();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  /**
   * Reject a holiday
   * Opens rejection reason dialog
   * 
   * @param {string} id - Holiday ID
   */
  async rejectHoliday(id) {
    const dialog = new RejectReasonDialog({
      callback: async (reason) => {
        try {
          await DnD5eCalendar.holidayManager.rejectHoliday(id, reason || "");
          ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.HolidayRejected"));
          this.render();
        } catch (error) {
          ui.notifications.error(error.message);
        }
      }
    });
    dialog.render(true);
  }

  /**
   * Delete a holiday
   * 
   * @param {string} id - Holiday ID
   */
  async deleteHoliday(id) {
    try {
      await DnD5eCalendar.holidayManager.deleteHoliday(id);
      ui.notifications.info(game.i18n.localize("DNDCAL.Notifications.HolidayDeleted"));
      this.render();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }
}

/**
 * RejectReasonDialog - Rejection reason input dialog
 * 
 * Modal dialog for entering rejection reason
 * Part of approval workflow
 * 
 * @extends Application
 */
const rejectReasonDialogProps = {
  id: "dnd5e-reject-reason",
  classes: ["dnd5e-calendar-dialog"],
  title: game.i18n.localize("DNDCAL.Holidays.Reject"),
  template: "modules/dnd5e-calendar/templates/reject-reason-dialog.html",
  width: 350,
  height: "auto"
};

class RejectReasonDialog extends Application {
  constructor(options = {}) {
    super({ ...rejectReasonDialogProps, ...options });
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, rejectReasonDialogProps);
  }

  /**
   * Get context data for template
   */
  async getData() {
    return {
      reasonLabel: game.i18n.localize("DNDCAL.Holidays.RejectionReason")
    };
  }

  /**
   * Activate event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);
    const form = html[0].querySelector("form");
    if (!form) return;

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const reason = form.reason?.value || "";
      if (this.callback) {
        await this.callback(reason);
      }
      this.close();
    });

    // Cancel button
    html[0].querySelector(".cancel-btn")?.addEventListener("click", () => this.close());
  }
}