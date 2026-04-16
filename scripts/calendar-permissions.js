console.log("[DnD5e-Calendar] DEBUG: calendar-permissions.js LOADED");

export class CalendarPermissions {
  static canView() {
    const result = true;
    CalendarDebug.feature("permissions", `canView: ALLOWED`);
    return result;
  }

  static canEdit() {
    if (!game.users.current) {
      CalendarDebug.feature("permissions", `canEdit: DENIED (no game.users.current)`);
      return false;
    }
    const result = game.users.current.role >= CONST.USER_ROLES.ASSISTANT;
    CalendarDebug.feature("permissions", `canEdit: ${result ? "ALLOWED" : "DENIED"} (role: ${game.users.current.role}, required: ${CONST.USER_ROLES.ASSISTANT})`, {
      user: game.users.current.name,
      role: game.users.current.role
    });
    return result;
  }

  static canSubmitHolidays(settings) {
    if (!game.users.current) {
      CalendarDebug.feature("permissions", `canSubmitHolidays: DENIED (no game.users.current)`);
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
    if (!game.users.current) {
      CalendarDebug.feature("permissions", `canViewPendingHolidays: DENIED (no game.users.current)`);
      return false;
    }
    if (!settings?.playersCanViewPendingHolidays) {
      CalendarDebug.feature("permissions", `canViewPendingHolidays: DENIED (setting disabled)`);
      return false;
    }
    const result = game.users.current.role >= CONST.USER_ROLES.TRUSTED;
    CalendarDebug.feature("permissions", `canViewPendingHolidays: ${result ? "ALLOWED" : "DENIED"} (role: ${game.users.current.role})`);
    return result;
  }

  static canApproveHolidays() {
    return this.canEdit();
  }

  static isGM() {
    const result = game.users.current?.role >= CONST.USER_ROLES.GAMEMASTER;
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
