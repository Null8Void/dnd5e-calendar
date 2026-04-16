import { CalendarUtils } from "./calendar-utils.js";

export class WeatherManager {
  constructor() {
    console.log("[DnD5e-Calendar] DEBUG: WeatherManager class instantiated");
  }
  constructor(manager) {
    this.manager = manager;
    this.data = null;
  }

  initialize(data) {
    this.data = data;
  }

  getWeather() {
    return this.data.current;
  }

  getWeatherIcon() {
    return CalendarUtils.getWeatherIcon(this.data.current);
  }

  getGmNotes() {
    return this.data.gmNotes;
  }

  setWeather(weather) {
    const oldWeather = this.data.current;
    this.data.current = weather;

    if (oldWeather !== weather) {
      Hooks.callAll("dnd5e-calendar:weatherChange", {
        old: oldWeather,
        new: weather
      });
    }

    return this.data.current;
  }

  setGmNotes(notes) {
    this.data.gmNotes = notes;
    return this.data.gmNotes;
  }

  getWeatherEffect() {
    const weatherEffects = {
      "Light rain": "weather-rain-light",
      "Heavy rain": "weather-rain-heavy",
      "Thunderstorm": "weather-thunderstorm",
      "Light snow": "weather-snow-light",
      "Heavy snow": "weather-snow-heavy",
      "Blizzard": "weather-blizzard",
      "Foggy": "weather-foggy",
      "Sandstorm": "weather-sandstorm",
      "Hot": "weather-heat",
      "Windy": "weather-windy"
    };
    return weatherEffects[this.data.current] || null;
  }

  getHasVisualEffect() {
    return this.getWeatherEffect() !== null;
  }

  getSeasonWeatherTable(season) {
    const weatherTables = {
      spring: [
        { weather: "Clear skies", weight: 30 },
        { weather: "Partly cloudy", weight: 25 },
        { weather: "Light rain", weight: 15 },
        { weather: "Overcast", weight: 12 },
        { weather: "Foggy", weight: 8 },
        { weather: "Windy", weight: 5 },
        { weather: "Heavy rain", weight: 3 },
        { weather: "Light snow", weight: 2 }
      ],
      summer: [
        { weather: "Clear skies", weight: 30 },
        { weather: "Hot", weight: 15 },
        { weather: "Partly cloudy", weight: 20 },
        { weather: "Thunderstorm", weight: 12 },
        { weather: "Overcast", weight: 10 },
        { weather: "Heavy rain", weight: 6 },
        { weather: "Foggy", weight: 4 },
        { weather: "Windy", weight: 3 }
      ],
      fall: [
        { weather: "Clear skies", weight: 22 },
        { weather: "Partly cloudy", weight: 20 },
        { weather: "Overcast", weight: 18 },
        { weather: "Windy", weight: 15 },
        { weather: "Light rain", weight: 10 },
        { weather: "Foggy", weight: 7 },
        { weather: "Heavy rain", weight: 4 },
        { weather: "Cold", weight: 4 }
      ],
      winter: [
        { weather: "Cold", weight: 20 },
        { weather: "Partly cloudy", weight: 15 },
        { weather: "Light snow", weight: 18 },
        { weather: "Overcast", weight: 12 },
        { weather: "Heavy snow", weight: 12 },
        { weather: "Blizzard", weight: 8 },
        { weather: "Foggy", weight: 7 },
        { weather: "Clear skies", weight: 5 },
        { weather: "Windy", weight: 3 }
      ]
    };
    return weatherTables[season] || weatherTables.spring;
  }

  rollWeather(season = null) {
    if (!season && this.manager) {
      season = this.manager.seasonManager.getCurrentSeason();
    }
    season = season || "spring";

    const table = this.getSeasonWeatherTable(season);
    const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.floor(Math.random() * totalWeight) + 1;

    for (const item of table) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.weather;
      }
    }
    return table[0].weather;
  }

  rollAndSetWeather(season = null) {
    const weather = this.rollWeather(season);
    this.setWeather(weather);
    return weather;
  }
}
