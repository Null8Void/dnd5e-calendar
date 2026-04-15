import { CALENDAR_CONSTANTS } from "./calendar-constants.js";

export class CalendarUtils {
  static formatTime(hour, minute, second = 0, showSeconds = false) {
    const h = hour.toString().padStart(2, "0");
    const m = minute.toString().padStart(2, "0");

    if (showSeconds) {
      const s = second.toString().padStart(2, "0");
      return `${h}:${m}:${s}`;
    }

    return `${h}:${m}`;
  }

  static formatDate(day, monthIndex, year, calendar, useYearName = true) {
    const month = calendar.months[monthIndex];
    if (!month) return `${day}/${monthIndex + 1}/${year}`;

    const yearPrefix = useYearName ? `${calendar.epoch || "Year"} ` : "";
    return `${month.name} ${day}, ${yearPrefix}${year}`;
  }

  static formatDateShort(day, monthAbbr, year) {
    return `${monthAbbr} ${day}, ${year}`;
  }

  static getDayOfWeek(day, monthIndex, year, calendar) {
    let totalDays = 0;

    for (let m = 0; m < monthIndex; m++) {
      totalDays += calendar.months[m]?.days || 30;
    }

    totalDays += day - 1;
    totalDays += year * calendar.months.reduce((sum, m) => sum + (m?.days || 30), 0);

    const weekdayIndex = totalDays % calendar.weekdays.length;
    return calendar.weekdays[weekdayIndex] || calendar.weekdays[0];
  }

  static getTotalDaysPassed(day, monthIndex, year, calendar) {
    let totalDays = 0;

    for (let m = 0; m < monthIndex; m++) {
      totalDays += calendar.months[m]?.days || 30;
    }

    totalDays += day - 1;

    totalDays += year * calendar.months.reduce((sum, m) => sum + (m?.days || 30), 0);

    return totalDays;
  }

  static advanceTime(time, minutesToAdd, timeConfig) {
    let hour = time.hour;
    let minute = time.minute;
    let second = time.second || 0;

    minute += minutesToAdd;

    while (minute >= timeConfig.minutesPerHour) {
      minute -= timeConfig.minutesPerHour;
      hour++;
    }

    while (hour >= timeConfig.hoursPerDay) {
      hour -= timeConfig.hoursPerDay;
    }

    return { hour, minute, second };
  }

  static advanceDay(date, calendar) {
    let day = date.day;
    let month = date.month;
    let year = date.year;

    day++;

    if (day > (calendar.months[month]?.days || 30)) {
      day = 1;
      month++;

      if (month >= calendar.months.length) {
        month = 0;
        year++;
      }
    }

    return { day, month, year };
  }

  static isDayTime(hour, dayStartHour, nightStartHour) {
    return hour >= dayStartHour && hour < nightStartHour;
  }

  static getDayNightProgress(hour, dayStartHour, nightStartHour, hoursPerDay) {
    if (this.isDayTime(hour, dayStartHour, nightStartHour)) {
      const dayHours = nightStartHour - dayStartHour;
      const progress = hour - dayStartHour;
      return { isDay: true, progress: progress / dayHours };
    } else {
      const nightHours = hoursPerDay - nightStartHour + dayStartHour;
      let nightProgress = hour >= nightStartHour ? hour - nightStartHour : hour + hoursPerDay - nightStartHour;
      return { isDay: false, progress: nightProgress / nightHours };
    }
  }

  static getMoonPhase(dayOfCycle, totalPhases = 8) {
    const phaseSize = totalPhases;
    const phaseIndex = Math.floor((dayOfCycle / CALENDAR_CONSTANTS.MOON.DEFAULT_CYCLE_DAYS) * phaseSize) % phaseSize;
    return {
      index: phaseIndex,
      name: CALENDAR_CONSTANTS.MOON.PHASE_NAMES[phaseIndex],
      key: CALENDAR_CONSTANTS.MOON.PHASES[phaseIndex]
    };
  }

  static getSeasonFromMonth(month, monthRanges) {
    for (const [season, months] of Object.entries(monthRanges)) {
      if (months.includes(month)) {
        return season;
      }
    }
    return "spring";
  }

  static getSeasonName(seasonKey) {
    return CALENDAR_CONSTANTS.SEASONS.NAMES[seasonKey] || seasonKey;
  }

  static getSeasonIcon(seasonKey) {
    const icons = {
      spring: "fa-leaf",
      summer: "fa-sun",
      fall: "fa-leaf-maple",
      winter: "fa-snowflake"
    };
    return icons[seasonKey] || "fa-calendar";
  }

  static getWeatherIcon(weather) {
    const iconMap = {
      "Clear skies": "fa-sun",
      "Partly cloudy": "fa-cloud-sun",
      "Overcast": "fa-cloud",
      "Light rain": "fa-cloud-rain",
      "Heavy rain": "fa-cloud-showers-heavy",
      "Thunderstorm": "fa-bolt",
      "Light snow": "fa-snowflake",
      "Heavy snow": "fa-snowflakes",
      "Foggy": "fa-smog",
      "Windy": "fa-wind",
      "Hot": "fa-temperature-high",
      "Cold": "fa-temperature-low",
      "Blizzard": "fa-blizzard",
      "Hail": "fa-cloud-hail"
    };
    return iconMap[weather] || "fa-cloud";
  }

  static getMoonPhaseIcon(phaseKey) {
    const iconMap = {
      new: "fa-moon",
      waxingCrescent: "fa-moon",
      firstQuarter: "fa-moon",
      waxingGibbous: "fa-moon",
      full: "fa-circle",
      waningGibbous: "fa-moon",
      lastQuarter: "fa-moon",
      waningCrescent: "fa-moon"
    };
    return iconMap[phaseKey] || "fa-moon";
  }

  static formatTimePeriod(hour, dayStartHour, nightStartHour) {
    if (hour >= dayStartHour && hour < nightStartHour) {
      return "day";
    }
    return "night";
  }

  static getTimePeriodIcon(hour, dayStartHour, nightStartHour) {
    const isDay = this.isDayTime(hour, dayStartHour, nightStartHour);
    return isDay ? "fa-sun" : "fa-moon";
  }

  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  static validateHolidayDescription(description) {
    return description?.length <= 400;
  }

  static truncateDescription(description, maxLength = 400) {
    if (!description) return "";
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength - 3) + "...";
  }
}
