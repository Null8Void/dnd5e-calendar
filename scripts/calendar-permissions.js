export class CalendarPermissions {
  static GM_ROLES = {
    PLAYER: 0,
    TRUSTED: 1,
    ASSISTANT: 2,
    GAMEMASTER: 3
  };

  static canView() {
    const result = true;
    CalendarDebug.feature("permissions", `canView: ALLOWED`);
    return result;
  }

  static canEdit() {
    if (!game.user) {
      CalendarDebug.feature("permissions", `canEdit: DENIED (no game.user)`);
      return false;
    }
    const result = game.user.role >= this.GM_ROLES.ASSISTANT;
    CalendarDebug.feature("permissions", `canEdit: ${result ? "ALLOWED" : "DENIED"} (role: ${game.user.role}, required: ${this.GM_ROLES.ASSISTANT})`, {
      user: game.user.name,
      role: game.user.role
    });
    return result;
  }

  static canSubmitHolidays(settings) {
    if (!game.user) {
      CalendarDebug.feature("permissions", `canSubmitHolidays: DENIED (no game.user)`);
      return false;
    }
    if (!settings?.playersCanSubmitHolidays) {
      CalendarDebug.feature("permissions", `canSubmitHolidays: DENIED (setting disabled)`);
      return false;
    }
    CalendarDebug.feature("permissions", `canSubmitHolidays: ALLOWED`);
    return true;
  }

  static canViewPendingHolidays(settings) {
    if (!game.user) {
      CalendarDebug.feature("permissions", `canViewPendingHolidays: DENIED (no game.user)`);
      return false;
    }
    if (!settings?.playersCanViewPendingHolidays) {
      CalendarDebug.feature("permissions", `canViewPendingHolidays: DENIED (setting disabled)`);
      return false;
    }
    const result = game.user.role >= this.GM_ROLES.TRUSTED;
    CalendarDebug.feature("permissions", `canViewPendingHolidays: ${result ? "ALLOWED" : "DENIED"} (role: ${game.user.role})`);
    return result;
  }

  static canApproveHolidays() {
    return this.canEdit();
  }

  static isGM() {
    const result = game.user?.role >= this.GM_ROLES.GAMEMASTER;
    CalendarDebug.feature("permissions", `isGM: ${result ? "TRUE" : "FALSE"}`);
    return result;
  }

  static checkPermission(action = "view") {
    CalendarDebug.feature("permissions", `checkPermission: ${action}`);

    let result;
    switch (action) {
      case "view":
        result = this.canView();
        break;
      case "edit":
        result = this.canEdit();
        break;
      case "submitHoliday":
        result = this.canSubmitHolidays();
        break;
      case "viewPendingHolidays":
        result = this.canViewPendingHolidays();
        break;
      case "approveHolidays":
        result = this.canApproveHolidays();
        break;
      default:
        result = false;
    }

    CalendarDebug.feature("permissions", `checkPermission [${action}]: ${result ? "GRANTED" : "DENIED"}`);
    return result;
  }
}
