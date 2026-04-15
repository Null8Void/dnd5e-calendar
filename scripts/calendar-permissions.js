export class CalendarPermissions {
  static GM_ROLES = {
    PLAYER: 0,
    TRUSTED: 1,
    ASSISTANT: 2,
    GAMEMASTER: 3
  };

  static canView() {
    return true;
  }

  static canEdit() {
    if (!game.user) return false;
    return game.user.role >= this.GM_ROLES.ASSISTANT;
  }

  static canSubmitHolidays(settings) {
    if (!game.user) return false;
    if (!settings?.playersCanSubmitHolidays) return false;
    return true;
  }

  static canViewPendingHolidays(settings) {
    if (!game.user) return false;
    if (!settings?.playersCanViewPendingHolidays) return false;
    return game.user.role >= this.GM_ROLES.TRUSTED;
  }

  static canApproveHolidays() {
    return this.canEdit();
  }

  static isGM() {
    return game.user?.role >= this.GM_ROLES.GAMEMASTER;
  }

  static checkPermission(action = "view") {
    switch (action) {
      case "view":
        return this.canView();
      case "edit":
        return this.canEdit();
      case "submitHoliday":
        return this.canSubmitHolidays();
      case "viewPendingHolidays":
        return this.canViewPendingHolidays();
      case "approveHolidays":
        return this.canApproveHolidays();
      default:
        return false;
    }
  }
}
