import { CalendarData } from "./calendar-data.js";
import { CalendarUtils } from "./calendar-utils.js";
import { CalendarPermissions } from "./calendar-permissions.js";

export class CalendarHUD extends Application {
  constructor(options = {}) {
    super(options);
    this.data = null;
    this.settings = null;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "dnd5e-calendar-hud",
      classes: ["dnd5e-calendar-hud"],
      template: "modules/dnd5e-calendar/templates/calendar-hud.html",
      popOut: false,
      width: "100%",
      height: 48,
      resizable: false,
      draggable: false
    });
  }

  getData(options = {}) {
    return this._getData();
  }

  async _getData() {
    if (!DnD5eCalendar.manager) {
      return this._getDefaultData();
    }

    const manager = DnD5eCalendar.manager;
    const settings = await CalendarData.loadSettings();
    const date = manager.getDate();
    const time = manager.getTime();
    const calendar = manager.getActiveCalendar();

    const dayOfWeek = CalendarUtils.getDayOfWeek(
      date.day,
      date.month,
      date.year,
      calendar
    );

    const moonPhase = manager.moonManager.getPhase();
    const weather = manager.weatherManager.getWeather();
    const weatherIcon = manager.weatherManager.getWeatherIcon();
    const season = manager.seasonManager.getCurrentSeason();
    const seasonName = manager.seasonManager.getCurrentSeasonName();
    const seasonIcon = manager.seasonManager.getCurrentSeasonIcon();

    const isDay = manager.dayNightManager.isDay();
    const periodIcon = manager.dayNightManager.getPeriodIcon();
    const progress = manager.dayNightManager.getProgress();

    const formattedDate = CalendarUtils.formatDate(
      date.day,
      date.month,
      date.year,
      calendar,
      true
    );

    const formattedTime = CalendarUtils.formatTime(
      time.hour,
      time.minute,
      0,
      settings.showSeconds
    );

    const calendars = Object.entries(manager.data.calendars).map(([id, cal]) => ({
      id,
      name: cal.name,
      shortName: cal.shortName,
      isActive: id === manager.data.activeCalendarId
    }));

    return {
      formattedDate,
      formattedTime,
      dayOfWeek: dayOfWeek?.name || "Starday",
      dayAbbr: dayOfWeek?.abbr || "St",
      moonPhase: moonPhase.name,
      moonIcon: CalendarUtils.getMoonPhaseIcon(moonPhase.key),
      weather,
      weatherIcon,
      season,
      seasonName,
      seasonIcon,
      isDay,
      periodIcon,
      progress,
      showGradient: settings.enableGradientBar,
      showIcon: settings.enableIconToggle,
      calendars,
      canEdit: CalendarPermissions.canEdit(),
      calendarsCount: calendars.length
    };
  }

  _getDefaultData() {
    return {
      formattedDate: "Loading...",
      formattedTime: "--:--",
      dayOfWeek: "---",
      dayAbbr: "--",
      moonPhase: "---",
      moonIcon: "fa-moon",
      weather: "---",
      weatherIcon: "fa-cloud",
      season: "---",
      seasonName: "---",
      seasonIcon: "fa-calendar",
      isDay: true,
      periodIcon: "fa-sun",
      progress: { isDay: true, progress: 0.5 },
      showGradient: true,
      showIcon: false,
      calendars: [{ id: "primary", name: "Primary Calendar", isActive: true }],
      canEdit: false,
      calendarsCount: 1
    };
  }

  async render(force = false, options = {}) {
    this.data = await this._getData();
    return super.render(force, options);
  }

  _injectHTML(html) {
    $("body").append(html);
    html.hide().fadeIn(200);
  }

  _replaceHTML(html) {
    const existingHud = $("#dnd5e-calendar-hud");
    if (existingHud.length) {
      existingHud.remove();
    }
    $("body").append(html);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".dnd5e-calendar-hud-date").click((e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        DnD5eCalendar.config.render(true);
      }
    });

    html.find(".dnd5e-calendar-hud-time").click((e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showTimeEditor(html);
      }
    });

    html.find(".dnd5e-calendar-selector").change((e) => {
      e.preventDefault();
      const calendarId = $(e.target).val();
      this.switchCalendar(calendarId);
    });

    html.find(".dnd5e-calendar-hud-season").click((e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showSeasonSelector(html);
      }
    });

    html.find(".dnd5e-calendar-hud-weather").click((e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showWeatherSelector(html);
      }
    });
  }

  showTimeEditor(html) {
    const currentTime = DnD5eCalendar.manager.getTime();
    const content = `
      <div class="dnd5e-calendar-time-editor">
        <h3>Adjust Time</h3>
        <div class="form-group">
          <label>Hour</label>
          <input type="number" name="hour" min="0" max="23" value="${currentTime.hour}">
        </div>
        <div class="form-group">
          <label>Minute</label>
          <input type="number" name="minute" min="0" max="59" value="${currentTime.minute}">
        </div>
        <div class="form-group">
          <button class="time-advance" data-minutes="1">+1 Min</button>
          <button class="time-advance" data-minutes="15">+15 Min</button>
          <button class="time-advance" data-minutes="60">+1 Hour</button>
        </div>
      </div>
    `;

    Dialog.prompt({
      title: "Adjust Time",
      content,
      callback: async (html) => {
        const hour = parseInt(html.find('input[name="hour"]').val());
        const minute = parseInt(html.find('input[name="minute"]').val());
        await DnD5eCalendar.manager.setTime(hour, minute);
        this.render();
      },
      rejectClose: true
    });
  }

  showSeasonSelector(html) {
    const currentSeason = DnD5eCalendar.manager.seasonManager.getCurrentSeason();
    const seasons = [
      { key: "spring", name: "Spring" },
      { key: "summer", name: "Summer" },
      { key: "fall", name: "Fall" },
      { key: "winter", name: "Winter" }
    ];

    let content = '<div class="dnd5e-calendar-season-selector"><h3>Select Season</h3><div class="season-buttons">';
    for (const season of seasons) {
      content += `<button class="season-btn ${season.key === currentSeason ? 'active' : ''}" data-season="${season.key}">
        <i class="fas ${CalendarUtils.getSeasonIcon(season.key)}"></i> ${season.name}
      </button>`;
    }
    content += '</div></div>';

    Dialog.prompt({
      title: "Set Season",
      content,
      callback: async (html) => {
        const season = html.find(".season-btn.active").data("season");
        if (season) {
          await DnD5eCalendar.manager.seasonManager.setSeason(season);
          this.render();
        }
      },
      rejectClose: true
    });
  }

  showWeatherSelector(html) {
    const currentWeather = DnD5eCalendar.manager.weatherManager.getWeather();
    const weatherTypes = [
      "Clear skies",
      "Partly cloudy",
      "Overcast",
      "Light rain",
      "Heavy rain",
      "Thunderstorm",
      "Light snow",
      "Heavy snow",
      "Foggy",
      "Windy",
      "Hot",
      "Cold",
      "Blizzard",
      "Hail"
    ];

    let content = '<div class="dnd5e-calendar-weather-selector"><h3>Set Weather</h3><select name="weather">';
    for (const weather of weatherTypes) {
      content += `<option value="${weather}" ${weather === currentWeather ? 'selected' : ''}>${weather}</option>`;
    }
    content += '</select></div>';

    Dialog.prompt({
      title: "Set Weather",
      content,
      callback: async (html) => {
        const weather = html.find('select[name="weather"]').val();
        await DnD5eCalendar.manager.weatherManager.setWeather(weather);
        this.render();
      },
      rejectClose: true
    });
  }

  async switchCalendar(calendarId) {
    DnD5eCalendar.manager.data.activeCalendarId = calendarId;
    await CalendarData.save(DnD5eCalendar.manager.data);
    this.render();
    Hooks.callAll("dnd5e-calendar:calendarChange", calendarId);
  }
}
