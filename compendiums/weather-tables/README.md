# Weather Roll Tables

This folder contains rollable weather tables for the DnD5e Calendar module.

## Files

- `weather-master.json` - Master table for all seasons
- `spring-weather.json` - Spring season weather (March-May)
- `summer-weather.json` - Summer season weather (June-August)
- `fall-weather.json` - Fall season weather (September-November)
- `winter-weather.json` - Winter season weather (December-February)

## Installation

1. Copy this folder to your Foundry VTT `Data/worlds/YOUR_WORLD/compendiums/` folder
2. OR import individual JSON files through Foundry's Compendium sidebar

## Usage

### Manual Weather Generation

1. Open the Compendium sidebar in Foundry VTT
2. Find the "Weather Roll Tables" compendium
3. Open the table for the current season
4. Click "Roll" to generate random weather

### Integration with DnD5e Calendar

The GM can use these tables when setting daily weather:

1. At the start of each game day, roll on the appropriate season table
2. The result gives you the weather for the day
3. Set the weather in the DnD5e Calendar HUD

## Weather Probability by Season

### Spring (Common)
- Clear skies: 30%
- Partly cloudy: 25%
- Light rain: 15%
- Overcast: 12%
- Foggy: 8%
- Windy: 5%
- Heavy rain: 3%
- Light snow: 2%

### Summer (Common)
- Clear skies: 30%
- Hot: 15%
- Partly cloudy: 20%
- Thunderstorm: 12%
- Overcast: 10%
- Heavy rain: 6%
- Foggy: 4%
- Windy: 3%

### Fall (Common)
- Clear skies: 22%
- Partly cloudy: 20%
- Overcast: 18%
- Windy: 15%
- Light rain: 10%
- Foggy: 7%
- Heavy rain: 4%
- Cold: 4%

### Winter (Common)
- Cold: 20%
- Partly cloudy: 15%
- Light snow: 18%
- Overcast: 12%
- Heavy snow: 12%
- Blizzard: 8%
- Foggy: 7%
- Clear: 5%
- Windy: 3%

## Customization

You can modify the weight values in each JSON file to adjust weather probabilities for your campaign.

## License

MIT License - Part of DnD5e Calendar module
