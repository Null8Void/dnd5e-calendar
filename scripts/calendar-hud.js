import { CalendarUtils } from "./calendar-utils.js";
import { CalendarPermissions } from "./calendar-permissions.js";
import { DnD5eCalendarAPI } from "./calendar-api.js";
import { CalendarData } from "./calendar-data.js";

const defaultOptions = {
  id: "dnd5e-calendar-hud",
  classes: ["dnd5e-calendar-hud"],
  template: "modules/dnd5e-calendar/templates/calendar-hud.html",
  popOut: false,
  width: "100%",
  height: 48,
  resizable: false,
  draggable: false
};

export class CalendarHUD extends Application {
  constructor(options = {}) {
    console.log("[DnD5e-Calendar] DEBUG: CalendarHUD constructor fired");
    super(options);
    this.data = null;
    this.settings = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, defaultOptions);
  }

  async getData(options = {}) {
    return await this._getData();
  }

async _getData() {
    if (!DnD5eCalendar.dnd5eCalendar) {
      return this._getDefaultData();
    }

    const date = DnD5eCalendar.getDate();
    const time = DnD5eCalendar.getTime();
    const calendar = DnD5eCalendar.getCalendar();

    const dayOfWeek = CalendarUtils.getDayOfWeek(
      date.day,
      date.month,
      date.year,
      calendar
    );

    const moonPhase = DnD5eCalendar.moonManager.getPhase();
    const weather = DnD5eCalendar.weatherManager.getWeather();
    const weatherIcon = DnD5eCalendar.weatherManager.getWeatherIcon();
    const season = DnD5eCalendar.seasonManager.getCurrentSeason();
    const seasonName = DnD5eCalendar.seasonManager.getCurrentSeasonName();
    const seasonIcon = DnD5eCalendar.seasonManager.getCurrentSeasonIcon();

    const isDay = time.hour >= 6 && time.hour < 18;
    const periodIcon = isDay ? "fa-sun" : "fa-moon";
    const progress = { isDay, progress: (time.hour * 60 + time.minute) / 1440 };
    const settings = await CalendarData.loadSettings();
    const showGradient = settings?.enableGradientBar ?? true;
    const showIcon = settings?.enableIconToggle ?? false;

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
      false
    );

    const calendarName = DnD5eCalendar.getCalendarName();
    const calendars = [{ id: "primary", name: calendarName, isActive: true }];

    const currentDate = DnD5eCalendar.getDate();
    const currentHoliday = DnD5eCalendar.holidayManager?.getHolidayOnDate(
      currentDate.day,
      currentDate.month,
      currentDate.year,
      "primary"
    );

    return {
      formattedDate,
      formattedTime,
      dayOfWeek: dayOfWeek?.name || game.i18n.localize("DNDCAL.Weekdays.Starday"),
      dayAbbr: dayOfWeek?.abbr || game.i18n.localize("DNDCAL.Weekdays.StardayAbbr"),
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
      showGradient,
      showIcon,
      calendars,
      canEdit: CalendarPermissions.canEdit(),
      calendarsCount: calendars.length,
      currentHoliday: currentHoliday ? currentHoliday.name : null,
      hasHoliday: !!currentHoliday,
      isHoliday: !!currentHoliday,
      holidays: currentHoliday ? [currentHoliday] : []
    };
  }

  _getDefaultData() {
    return {
      formattedDate: game.i18n.localize("DNDCAL.HUD.Loading"),
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
      calendars: [{ id: "primary", name: game.i18n.localize("DNDCAL.HUD.PrimaryCalendar"), isActive: true }],
      canEdit: false,
      calendarsCount: 1,
      isHoliday: false,
      holidays: [],
      hasHoliday: false,
      currentHoliday: ""
    };
  }

  async render(force = false, options = {}) {
    this.data = await this._getData();
    return super.render(force, options);
  }

  async close() {
    const hud = document.getElementById("dnd5e-calendar-hud");
    if (hud) {
      hud.remove();
    }
    return super.close();
  }

  _injectHTML(html) {
    const existingHud = document.getElementById("dnd5e-calendar-hud");
    if (existingHud) {
      existingHud.remove();
    }
    document.body.appendChild(html);
    html.style.display = "none";
    requestAnimationFrame(() => {
      html.style.display = "";
      html.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html[0];

    el.querySelector(".dnd5e-calendar-hud-date")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        window.DnD5eCalendarConfig?.render(true);
      }
    });

    el.querySelector(".dnd5e-calendar-hud-time")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showTimeEditor();
      }
    });

    el.querySelector(".dnd5e-calendar-selector")?.addEventListener("change", (e) => {
      e.preventDefault();
      const calendarId = e.currentTarget.value;
      this.switchCalendar(calendarId);
    });

    el.querySelector(".dnd5e-calendar-hud-season")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showSeasonSelector();
      }
    });

    el.querySelector(".dnd5e-calendar-hud-weather")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showWeatherSelector();
      }
    });
  }

  async showTimeEditor() {
    const currentTime = DnD5eCalendarAPI.getTime();
    const dialog = new TimeEditorDialog(currentTime, {
      callback: async (hour, minute) => {
        await DnD5eCalendarAPI.setTime(hour, minute);
        await this.render();
      }
    });
    dialog.render(true);
  }

  async showSeasonSelector() {
    const currentSeason = DnD5eCalendarAPI.getSeason();
    const dialog = new SeasonSelectorDialog(currentSeason, {
      callback: async (season) => {
        DnD5eCalendarAPI.setSeason(season);
        await this.render();
      }
    });
    dialog.render(true);
  }

  async showWeatherSelector() {
    const currentWeather = DnD5eCalendar.weatherManager.getWeather();
    const weatherMode = DnD5eCalendar.weatherManager.getMode();
    const gmNotes = DnD5eCalendar.customData?.weather?.gmNotes || "";
    const dialog = new WeatherSelectorDialog(currentWeather, weatherMode, {
      gmNotes,
      callback: async (data) => {
        await DnD5eCalendarAPI.setWeatherMode(data.mode);
        if (data.mode === "manual") {
          await DnD5eCalendarAPI.setWeather(data.weather);
        }
        if (data.gmNotes !== undefined) {
          DnD5eCalendar.customData.weather.gmNotes = data.gmNotes;
          await DnD5eCalendar.saveCustomData();
        }
        await this.render();
      }
    });
    dialog.render(true);
  }

  async switchCalendar(calendarId) {
    ui.notifications.warn("Calendar switching is handled by dnd5e system settings");
  }

  updateWeatherEffect() {
    const container = document.getElementById("dnd5e-calendar-weather-effect");
    if (!container || !DnD5eCalendar.weatherManager) return;

    const weatherEffect = DnD5eCalendar.weatherManager.getWeatherEffect();

    container.className = "weather-effect-container";

    if (weatherEffect) {
      container.classList.add("active");
      container.classList.add(weatherEffect);
    }
  }
}

const timeEditorDialogProps = {
  id: "dnd5e-time-editor",
  classes: ["dnd5e-calendar-dialog"],
  title: game.i18n.localize("DNDCAL.Time.CurrentTime"),
  template: "modules/dnd5e-calendar/templates/time-editor-dialog.html",
  width: 350,
  height: "auto"
};

class TimeEditorDialog extends Application {
  constructor(currentTime, options = {}) {
    super({ ...timeEditorDialogProps, ...options });
    this.currentTime = currentTime;
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, timeEditorDialogProps);
  }

  async getData() {
    return {
      hour: this.currentTime.hour,
      minute: this.currentTime.minute
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const form = html[0].querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const hour = parseInt(form.hour.value);
      const minute = parseInt(form.minute.value);
      if (this.callback) await this.callback(hour, minute);
      this.close();
    });

    const cancelBtn = html[0].querySelector(".cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }
  }
}

const seasonSelectorDialogProps = {
  id: "dnd5e-season-selector",
  classes: ["dnd5e-calendar-dialog"],
  title: game.i18n.localize("DNDCAL.Season.CurrentSeason"),
  template: "modules/dnd5e-calendar/templates/season-selector-dialog.html",
  width: 300,
  height: "auto"
};

class SeasonSelectorDialog extends Application {
  constructor(currentSeason, options = {}) {
    super({ ...seasonSelectorDialogProps, ...options });
    this.currentSeason = currentSeason;
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, seasonSelectorDialogProps);
  }

  async getData() {
    const seasons = [
      { key: "spring", name: game.i18n.localize("DNDCAL.Season.Spring"), icon: CalendarUtils.getSeasonIcon("spring") },
      { key: "summer", name: game.i18n.localize("DNDCAL.Season.Summer"), icon: CalendarUtils.getSeasonIcon("summer") },
      { key: "fall", name: game.i18n.localize("DNDCAL.Season.Fall"), icon: CalendarUtils.getSeasonIcon("fall") },
      { key: "winter", name: game.i18n.localize("DNDCAL.Season.Winter"), icon: CalendarUtils.getSeasonIcon("winter") }
    ];
    return { seasons, currentSeason: this.currentSeason };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const form = html[0].querySelector("form");
    if (!form) return;

    const buttons = form.querySelectorAll(".season-btn");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const activeBtn = form.querySelector(".season-btn.active");
      if (activeBtn && this.callback) {
        await this.callback(activeBtn.dataset.season);
      }
      this.close();
    });

    const cancelBtn = html[0].querySelector(".cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }
  }
}

const weatherSelectorDialogProps = {
  id: "dnd5e-weather-selector",
  classes: ["dnd5e-calendar-dialog"],
  title: game.i18n.localize("DNDCAL.Weather.CurrentWeather"),
  template: "modules/dnd5e-calendar/templates/weather-selector-dialog.html",
  width: 350,
  height: "auto"
};

class WeatherSelectorDialog extends Application {
  constructor(currentWeather, weatherMode, options = {}) {
    super({ ...weatherSelectorDialogProps, ...options });
    this.currentWeather = currentWeather;
    this.weatherMode = weatherMode;
    this.gmNotes = options.gmNotes || "";
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, weatherSelectorDialogProps);
  }

  async getData() {
    const weatherTypes = [
      { key: "Clear skies", label: game.i18n.localize("DNDCAL.Weather.ClearSkies") },
      { key: "Partly cloudy", label: game.i18n.localize("DNDCAL.Weather.PartlyCloudy") },
      { key: "Overcast", label: game.i18n.localize("DNDCAL.Weather.Overcast") },
      { key: "Light rain", label: game.i18n.localize("DNDCAL.Weather.LightRain") },
      { key: "Heavy rain", label: game.i18n.localize("DNDCAL.Weather.HeavyRain") },
      { key: "Thunderstorm", label: game.i18n.localize("DNDCAL.Weather.Thunderstorm") },
      { key: "Light snow", label: game.i18n.localize("DNDCAL.Weather.LightSnow") },
      { key: "Heavy snow", label: game.i18n.localize("DNDCAL.Weather.HeavySnow") },
      { key: "Foggy", label: game.i18n.localize("DNDCAL.Weather.Foggy") },
      { key: "Windy", label: game.i18n.localize("DNDCAL.Weather.Windy") },
      { key: "Hot", label: game.i18n.localize("DNDCAL.Weather.Hot") },
      { key: "Cold", label: game.i18n.localize("DNDCAL.Weather.Cold") },
      { key: "Blizzard", label: game.i18n.localize("DNDCAL.Weather.Blizzard") },
      { key: "Hail", label: game.i18n.localize("DNDCAL.Weather.Hail") }
    ];
    return {
      weatherTypes,
      currentWeather: this.currentWeather,
      weatherMode: this.weatherMode,
      gmNotes: this.gmNotes || ""
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const form = html[0].querySelector("form");
    if (!form) return;

    const weatherModeCb = form.querySelector('input[name="weatherMode"]');
    const weatherSelectGroup = form.querySelector(".weather-select-group");
    if (weatherModeCb && weatherSelectGroup) {
      weatherModeCb.addEventListener("change", () => {
        weatherSelectGroup.style.display = weatherModeCb.checked ? "none" : "";
      });
    }

    const rollBtn = form.querySelector(".roll-weather-btn");
    if (rollBtn && weatherModeCb) {
      weatherModeCb.addEventListener("change", () => {
        rollBtn.disabled = !weatherModeCb.checked;
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const mode = weatherModeCb?.checked ? "auto" : "manual";
      const weather = form.weather?.value || this.currentWeather;
      const gmNotes = form.gmNotes?.value || "";
      if (this.callback) {
        await this.callback({ mode, weather, gmNotes });
      }
      this.close();
    });

    const cancelBtn = html[0].querySelector(".cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }
  }
}
