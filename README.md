# DnD5e Calendar & Time Tracker

A fully featured in-game calendar module for FoundryVTT with DnD5e system integration.

## Features

### Calendar & Time
- **Top-screen HUD overlay** - Always visible to all players
- **Multi-calendar support** - Primary and Secondary calendars with independent time tracking
- **Fully editable** - GM/Assistant can modify months, weekdays, epoch, and year naming
- **Time tracking** - Hours and minutes with auto-advancement option
- **Customizable time units** - Minutes per hour, hours per day all configurable

### Season & Weather
- **Season tracking** - Auto-track based on month ranges or manual override
- **GM-editable weather** - 14 weather types with private GM notes
- **Day/night cycle** - Visual gradient bar (default) or icon toggle

### Moon Phases
- **15-day lunar cycle** - Configurable duration
- **8 phase states** - New Moon through Waning Crescent
- **Automatic tracking** - Updates based on game days passed

### Holiday System
- **Player submissions** - Players can submit holiday ideas with name, date, and 400-character description
- **GM approval workflow** - Pending holidays hidden until approved
- **Rejection reasons** - GM can provide feedback on rejected submissions

## Permissions

| Action | Player | Trusted | Assistant | GM |
|--------|--------|---------|-----------|-----|
| View calendar | Yes | Yes | Yes | Yes |
| Edit calendar | No | No | Yes | Yes |
| Submit holidays | Configurable | Configurable | Yes | Yes |
| Approve holidays | No | No | Yes | Yes |

## Installation

### Method 1: Manifest URL
1. In Foundry, go to **Add-on Modules**
2. Click **Install Module**
3. Paste this manifest URL:
   ```
   https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/master/module.json
   ```

### Method 2: Manual
1. Download or clone this repository
2. Copy the `dnd5e-calendar` folder to your Foundry `modules` directory

## Configuration

Access the configuration panel via:
- **Alt+C** keyboard shortcut (GM only)
- Click on the calendar date in the HUD
- Module settings menu

### Calendar Tab
- Add/remove/reorder months
- Customize month names, abbreviations, and day counts
- Edit weekdays
- Set epoch name and year zero

### Time Tab
- Quick time adjustments (+1 min, +15 min, +1 hour, +1 day)
- Configure minutes per hour and hours per day
- Enable/disable auto time flow

### Season Tab
- Toggle auto-tracking
- Set which months belong to each season

### Weather Tab
- Select current weather from 14 types
- Add private GM notes

### Holidays Tab
- View/approve/reject submitted holidays
- Submit new holiday requests

### Settings Tab
- Enable/disable gradient bar
- Enable/disable icon toggle
- Configure player permissions
- Set moon cycle length
- Configure day/night hours

## API

The module exposes a public API for other modules and macros:

```javascript
// Get current date/time
DnD5eCalendarAPI.getDate();      // { day, month, year }
DnD5eCalendarAPI.getTime();     // { hour, minute }
DnD5eCalendarAPI.getSeason();    // "spring" | "summer" | "fall" | "winter"
DnD5eCalendarAPI.getWeather();   // "Clear skies"
DnD5eCalendarAPI.getMoonPhase(); // { name, key, index }

// Modify calendar
await DnD5eCalendarAPI.setDate(15, 3, 1492);
await DnD5eCalendarAPI.setTime(14, 30);
await DnD5eCalendarAPI.advanceTime(60); // Advance 60 minutes

// Set weather/season
await DnD5eCalendarAPI.setWeather("Heavy rain");
await DnD5eCalendarAPI.setSeason("winter");

// Submit holiday
await DnD5eCalendarAPI.submitHoliday("Festival of the Moon", { day: 15, month: 3, year: 1492 }, "A celebration...");

// Hooks
DnD5eCalendarAPI.onDateChange((data) => console.log("Date changed:", data));
DnD5eCalendarAPI.onTimeChange((data) => console.log("Time changed:", data));
DnD5eCalendarAPI.onSeasonChange((data) => console.log("Season changed:", data));
DnD5eCalendarAPI.onWeatherChange((data) => console.log("Weather changed:", data));
DnD5eCalendarAPI.onMoonPhaseChange((data) => console.log("Moon phase changed:", data));
DnD5eCalendarAPI.onDayNightChange((data) => console.log("Day/night changed:", data));
DnD5eCalendarAPI.onHolidaySubmitted((data) => console.log("Holiday submitted:", data));
DnD5eCalendarAPI.onHolidayApproved((data) => console.log("Holiday approved:", data));
```

## Hooks

Available hooks for other modules:

| Hook | Description |
|------|-------------|
| `dnd5e-calendar:dateChange` | Fired when the date changes |
| `dnd5e-calendar:timeChange` | Fired when time changes |
| `dnd5e-calendar:seasonChange` | Fired when season changes |
| `dnd5e-calendar:weatherChange` | Fired when weather changes |
| `dnd5e-calendar:moonPhaseChange` | Fired when moon phase changes |
| `dnd5e-calendar:dayNightChange` | Fired when day/night period changes |
| `dnd5e-calendar:holidaySubmitted` | Fired when a holiday is submitted |
| `dnd5e-calendar:holidayApproved` | Fired when a holiday is approved |
| `dnd5e-calendar:calendarChange` | Fired when active calendar changes |

## Default Calendar

The module defaults to a Forgotten Realms style calendar:
- **12 months** of 30 days each (360 day year)
- **10 weekdays** in repeating cycle
- **4 seasons** with configurable month ranges
- **Epoch**: Dale's Reckoning

## Compatibility

- FoundryVTT v10.0.0+
- FoundryVTT v11.x compatible
- DnD5e system 2.0.0+

## Changelog

### v1.0.0
- Initial release
- Calendar and time tracking
- Season and weather management
- Moon phases
- Day/night cycle
- Holiday submission and approval system
- Multi-calendar support
- Public API

## License

MIT License
