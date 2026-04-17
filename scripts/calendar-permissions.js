export class CalendarPermissions {
  static getCurrentUser() {
    return game.users?.current ?? game.users?.activeUser;
  }

  static canView() {
    return true;
  }

  static canEdit() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.role >= CONST.USER_ROLES.ASSISTANT;
  }

  static canSubmitHolidays(settings) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (!settings?.playersCanSubmitHolidays) return false;
    return true;
  }

  static canViewPendingHolidays(settings) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (!settings?.playersCanViewPendingHolidays) return false;
    return user.role >= CONST.USER_ROLES.TRUSTED;
  }

  static canApproveHolidays() {
    return this.canEdit();
  }

  static isGM() {
    const user = this.getCurrentUser();
    return user?.role >= CONST.USER_ROLES.GAMEMASTER;
  }

  static checkPermission(action = "view") {
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
    return result;
  }
}
