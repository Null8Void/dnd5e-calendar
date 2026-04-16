console.log("[DnD5e-Calendar] DEBUG: calendar-constants.js LOADED");

export const CALENDAR_CONSTANTS = {
  VERSION: "1.1.0",

  TIME: {
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,
    DEFAULT_START_HOUR: 6,
    DEFAULT_START_MINUTE: 0
  },

  CALENDAR: {
    DAYS_PER_MONTH: 30,
    MONTHS_PER_YEAR: 12,
    DEFAULT_DAYS_PER_WEEK: 10,
    START_YEAR: 0,
    DEFAULT_YEAR_NAME: "Year of"
  },

  MOON: {
    DEFAULT_CYCLE_DAYS: 10,
    PHASES: [
      "new",
      "waxingCrescent",
      "firstQuarter",
      "waxingGibbous",
      "full",
      "waningGibbous",
      "lastQuarter",
      "waningCrescent"
    ],
    PHASE_NAMES: [
      "New Moon",
      "Waxing Crescent",
      "First Quarter",
      "Waxing Gibbous",
      "Full Moon",
      "Waning Gibbous",
      "Last Quarter",
      "Waning Crescent"
    ],
    SPECIAL_PHASES: ["new", "full"],
    PHASE_DAYS: {
      "new": 1,
      "waxingCrescent": 2,
      "firstQuarter": 3,
      "waxingGibbous": 4,
      "full": 6,
      "waningGibbous": 7,
      "lastQuarter": 8,
      "waningCrescent": 9
    }
  },

  SEASONS: {
    DEFAULT: ["spring", "summer", "fall", "winter"],
    NAMES: {
      spring: "Spring",
      summer: "Summer",
      fall: "Fall",
      winter: "Winter"
    },
    SPRING_MONTHS: [2, 3, 4],
    SUMMER_MONTHS: [5, 6, 7],
    FALL_MONTHS: [8, 9, 10],
    WINTER_MONTHS: [11, 0, 1]
  },

  WEATHER: {
    TYPES: [
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
    ]
  },

  DAY_NIGHT: {
    DAY_START_HOUR: 6,
    NIGHT_START_HOUR: 18
  },

  DEFAULT_MONTHS: [
    { name: "Hammer", abbr: "Ha", days: 30, isIntercalary: false },
    { name: "Alturiak", abbr: "Al", days: 30, isIntercalary: false },
    { name: "Ches", abbr: "Ch", days: 30, isIntercalary: false },
    { name: "Tarsakh", abbr: "Ta", days: 30, isIntercalary: false },
    { name: "Mirtul", abbr: "Mi", days: 30, isIntercalary: false },
    { name: "Kythorn", abbr: "Ky", days: 30, isIntercalary: false },
    { name: "Flamerule", abbr: "Fl", days: 30, isIntercalary: false },
    { name: "Eleasis", abbr: "El", days: 30, isIntercalary: false },
    { name: "Eleint", abbr: "Ei", days: 30, isIntercalary: false },
    { name: "Marpenoth", abbr: "Ma", days: 30, isIntercalary: false },
    { name: "Uktar", abbr: "Uk", days: 30, isIntercalary: false },
    { name: "Nightal", abbr: "Ni", days: 30, isIntercalary: false }
  ],

  DEFAULT_WEEKDAYS: [
    { name: "Starday", abbr: "St" },
    { name: "Sunday", abbr: "Su" },
    { name: "Moonday", abbr: "Mo" },
    { name: "Tiday", abbr: "Ti" },
    { name: "Earthday", abbr: "Ea" },
    { name: "Waterday", abbr: "Wa" },
    { name: "Windday", abbr: "Wi" },
    { name: "Fireday", abbr: "Fi" },
    { name: "Iceday", abbr: "Ic" },
    { name: "Treeday", abbr: "Tr" }
  ],

  DEFAULT_CALENDARS: {
    primary: {
      id: "primary",
      name: "Primary Calendar",
      shortName: "PC",
      timeName: "Primary Time",
      timeShortName: "PT",
      months: [],
      weekdays: [],
      epoch: "Dale's Reckoning",
      yearZero: 0,
      intercalaryDays: 0,
      intercalaryMonth: null
    },
    secondary: {
      id: "secondary",
      name: "Secondary Calendar",
      shortName: "SC",
      timeName: "Secondary Time",
      timeShortName: "ST",
      months: [],
      weekdays: [],
      epoch: "",
      yearZero: 0,
      intercalaryDays: 0,
      intercalaryMonth: null
    }
  },

  DEFAULT_SETTINGS: {
    enableGradientBar: true,
    enableIconToggle: false,
    playersCanSubmitHolidays: true,
    playersCanViewPendingHolidays: false,
    autoTrackSeasons: true,
    timeFlowEnabled: false,
    realSecondsPerGameHour: 60,
    showSeconds: false
  },

  SETTINGS_KEY: "dnd5e-calendar.data",
  CALENDARS_KEY: "dnd5e-calendar.calendars",
  HOLIDAYS_KEY: "dnd5e-calendar.holidays",
  SETTINGS_CONFIG_KEY: "dnd5e-calendar.settings"
};
