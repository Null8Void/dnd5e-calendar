import { CalendarUtils } from "./calendar-utils.js";
import { CalendarPermissions } from "./calendar-permissions.js";

export class CalendarHUD extends Application {
  constructor(options = {}) {
    console.log("[DnD5e-Calendar] DEBUG: CalendarHUD constructor fired");
    super(options);
    this.data = null;
    this.settings = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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

  async getData(options = {}) {
    return await this._getData();
  }

async _getData() {
    if (!DnD5eCalendar.dnd5eCalendar) {
      return this._getDefaultData();
    }

    // Use centralized state for data-driven HUD
    const state = DnD5eCalendar.getState();
    const date = state.date;
    const time = state.time;
    const calendar = DnD5eCalendar.getCalendar();

    const dayOfWeek = CalendarUtils.getDayOfWeek(
      date.day,
      date.month,
      date.year,
      calendar
    );

    const isDay = state.isDay;
    const periodIcon = isDay ? "fa-sun" : "fa-moon";
    const progress = { isDay, progress: (time.hour * 60 + time.minute) / 1440 };

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

    return {
      formattedDate,
      formattedTime,
      dayOfWeek: state.dayOfWeek || dayOfWeek?.name || game.i18n.localize("DNDCAL.Weekdays.Starday"),
      dayAbbr: dayOfWeek?.abbr || game.i18n.localize("DNDCAL.Weekdays.StardayAbbr"),
      moonPhase: state.moonPhase?.name || "New Moon",
      moonIcon: state.moonIcon || "fa-moon",
      weather: state.weather || "Clear skies",
      weatherIcon: state.weatherIcon || "fa-sun",
      season: state.season || "spring",
      seasonName: state.seasonName || "Spring",
      seasonIcon: state.seasonIcon || "fa-leaf",
      isDay: state.isDay,
      periodIcon,
      progress,
      showGradient: true,
      showIcon: true,
      calendars,
      canEdit: CalendarPermissions.canEdit(),
      calendarsCount: calendars.length,
      // Holiday data from centralized state
      isHoliday: state.isHoliday,
      holidays: state.holidays || [],
      hasHoliday: state.isHoliday,
      currentHoliday: state.holidays?.[0]?.name || ""
    };
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
      showGradient: true,
      showIcon: true,
      calendars,
      canEdit: CalendarPermissions.canEdit(),
      calendarsCount: calendars.length,
      currentHoliday: currentHoliday ? currentHoliday.name : null,
      hasHoliday: !!currentHoliday
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

  _renderInner(data) {
    const html = document.createElement("div");
    html.innerHTML = `<template>${this.template}</template>`;
    const template = html.querySelector("template");
    if (template) {
      return this._renderTemplate(this.template, data);
    }
    return super._renderInner(data);
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

  _replaceHTML(html) {
    const existingHud = document.getElementById("dnd5e-calendar-hud");
    if (existingHud) {
      existingHud.remove();
    }
    document.body.appendChild(html);
  }

  _onClose() {
    const hud = document.getElementById("dnd5e-calendar-hud");
    if (hud) {
      hud.remove();
    }
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".dnd5e-calendar-hud-date").on("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        window.DnD5eCalendarConfig?.render(true);
      }
    });

    html.find(".dnd5e-calendar-hud-time").on("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showTimeEditor();
      }
    });

    html.find(".dnd5e-calendar-selector").on("change", (e) => {
      e.preventDefault();
      const calendarId = e.currentTarget.value;
      this.switchCalendar(calendarId);
    });

    html.find(".dnd5e-calendar-hud-season").on("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showSeasonSelector();
      }
    });

    html.find(".dnd5e-calendar-hud-weather").on("click", (e) => {
      e.preventDefault();
      if (CalendarPermissions.canEdit()) {
        this.showWeatherSelector();
      }
    });
  }

  async showTimeEditor() {
    const currentTime = DnD5eCalendar.getTime();
    const content = `
      <form>
        <div class="dnd5e-calendar-time-editor">
          <h3>${game.i18n.localize("DNDCAL.Time.AdjustTime")}</h3>
          <div class="form-group">
            <label>${game.i18n.localize("DNDCAL.Time.Hour")}</label>
            <input type="number" name="hour" min="0" max="23" value="${currentTime.hour}">
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("DNDCAL.Time.Minute")}</label>
            <input type="number" name="minute" min="0" max="59" value="${currentTime.minute}">
          </div>
          <div class="form-group">
            <button type="button" class="time-advance" data-minutes="1">${game.i18n.localize("DNDCAL.Time.AddMinute")}</button>
            <button type="button" class="time-advance" data-minutes="15">${game.i18n.localize("DNDCAL.Time.Add15Minutes")}</button>
            <button type="button" class="time-advance" data-minutes="60">${game.i18n.localize("DNDCAL.Time.AddHour")}</button>
          </div>
        </div>
      </form>
    `;

    await Dialog.prompt({
      title: game.i18n.localize("DNDCAL.Time.CurrentTime"),
      content,
      label: game.i18n.localize("DNDCAL.Config.Save"),
      callback: async (html) => {
        const hour = parseInt(html.find('input[name="hour"]').val());
        const minute = parseInt(html.find('input[name="minute"]').val());
        if (game.dnd5e?.time) {
          const minutesDiff = (hour - currentTime.hour) * 60 + (minute - currentTime.minute);
          await game.dnd5e.time.advance(minutesDiff);
        }
        await this.render();
      },
      rejectClose: false
    });
  }

  async showSeasonSelector() {
    const currentSeason = DnD5eCalendar.seasonManager.getCurrentSeason();
    const seasons = [
      { key: "spring", name: game.i18n.localize("DNDCAL.Season.Spring") },
      { key: "summer", name: game.i18n.localize("DNDCAL.Season.Summer") },
      { key: "fall", name: game.i18n.localize("DNDCAL.Season.Fall") },
      { key: "winter", name: game.i18n.localize("DNDCAL.Season.Winter") }
    ];

    let content = `<form><div class="dnd5e-calendar-season-selector"><h3>${game.i18n.localize("DNDCAL.Config.SelectSeason")}</h3><div class="season-buttons">`;
    for (const season of seasons) {
      content += `<button type="button" class="season-btn ${season.key === currentSeason ? 'active' : ''}" data-season="${season.key}">
        <i class="fas ${CalendarUtils.getSeasonIcon(season.key)}"></i> ${season.name}
      </button>`;
    }
    content += '</div></div></form>';

    await Dialog.prompt({
      title: game.i18n.localize("DNDCAL.Season.CurrentSeason"),
      content,
      label: game.i18n.localize("DNDCAL.Config.Save"),
      callback: async (html) => {
        const season = html.find(".season-btn.active").data("season");
        if (season) {
          DnD5eCalendar.seasonManager.setSeason(season);
          await this.render();
        }
      },
      rejectClose: false
    });
  }

  async showWeatherSelector() {
    const currentWeather = DnD5eCalendar.weatherManager.getWeather();
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

    let content = `<form><div class="dnd5e-calendar-weather-selector"><h3>${game.i18n.localize("DNDCAL.Weather.SetWeather")}</h3><select name="weather">`;
    for (const weather of weatherTypes) {
      content += `<option value="${weather.key}" ${weather.key === currentWeather ? 'selected' : ''}>${weather.label}</option>`;
    }
    content += '</select></div></form>';

    await Dialog.prompt({
      title: game.i18n.localize("DNDCAL.Weather.CurrentWeather"),
      content,
      label: game.i18n.localize("DNDCAL.Config.Save"),
      callback: async (html) => {
        const weather = html.find('select[name="weather"]').val();
        DnD5eCalendar.weatherManager.setWeather(weather);
        await this.render();
      },
      rejectClose: false
    });
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
