// Card configuration. Only `weather` is required; everything else is optional.

export interface PersonConfig {
  name: string;
  entity: string; // person.* or device_tracker.* — "home" puts them by the door
  porch_light?: string; // what turns the porch light on (defaults to `entity`)
  look?: { jacket?: string; hair?: string; long_hair?: boolean; hat?: string; umbrella?: string };
}

export interface RoomConfig {
  window: string; // window id of the house model (villa: front, side_left, side_right, gable)
  name?: string;
  light?: string; // colours the window; tapping the window toggles it
  music?: string[]; // media players: notes rise from this window while they are audible
  tv?: string; // media player: blue flicker while it is on
}

export interface LivingHouseConfig {
  type: string;
  weather: string;
  house?: string; // house model: villa
  country?: 'se' | 'us' | 'none'; // which holidays show up
  flag?: 'se' | 'us'; // the flag on flag days and birthdays (defaults to the country's)
  language?: 'en' | 'sv'; // labels
  colors?: { wall?: string; side?: string; roof?: string; door?: string; curtains?: string };
  people?: PersonConfig[];
  rooms?: RoomConfig[];
  music?: { everywhere?: string[]; door?: string[]; roof?: string[] }; // speakers not tied to one window
  power?: string; // W: chimney smoke at 800 / 1500 / 2500 W
  minecraft?: string; // players online
  birthdays?: string; // calendar or binary sensor: balloons and a flag while it is on
  calendar?: string; // calendar: the mailbox flag goes up while it is on
  washer?: { entity: string; running?: string; laundry_left?: string; window?: string };
  indoor?: { temperature?: string; humidity?: string };
  aurora?: string; // aurora chance in % (e.g. from the NOAA aurora integration)
  name_days?: string[]; // MM-DD: a cake and a flag
  motion?: { when_home?: string[]; reduce?: string }; // animate only while one of these is home; an input_boolean that freezes everything
  tap?: { street_lamp?: string; mailbox?: string; chimney?: string }; // an entity to toggle or a path to open
  help_path?: string; // a ❓ button that opens this path
  labels?: boolean;
  large_labels?: boolean;
  night_dim?: { from: number; to: number } | false; // dim the picture at night (default 23–6)
  helpers?: Partial<Record<HelperKey, string>>; // advanced: your own sensors instead of the card's own logic
}

/** Things the card works out itself, but can read from your own sensors instead. */
export type HelperKey =
  | 'holiday' // a sensor whose state is a holiday id, e.g. christmas_eve
  | 'season' // spring/summer/autumn/winter (e.g. the season integration)
  | 'moon_phase' // the moon integration
  | 'moon_position' // state = elevation in degrees, attribute `azimuth`
  | 'rain_now' // mm this hour
  | 'rain_soon' // minutes until rain, "soon" or "no"
  | 'rained_recently' // binary sensor: rainbow and puddles
  | 'snow_on_ground' // binary sensor: white ground, snow on the roof, snowman
  | 'aurora_visible'; // binary sensor

/** Example used by the card picker and the demo page. */
export const EXAMPLE: LivingHouseConfig = {
  type: 'custom:living-house-card',
  weather: 'weather.home',
  house: 'villa',
  country: 'se',
  power: 'sensor.power',
  minecraft: 'sensor.minecraft_players',
  birthdays: 'calendar.birthdays',
  calendar: 'calendar.family',
  indoor: { temperature: 'sensor.indoor_temperature', humidity: 'sensor.indoor_humidity' },
  people: [
    { name: 'Alex', entity: 'person.alex' },
    { name: 'Sam', entity: 'person.sam', porch_light: 'device_tracker.sam_phone' },
  ],
  rooms: [
    { window: 'front', name: 'Downstairs', light: 'light.downstairs' },
    { window: 'side_left', name: 'Living room', light: 'light.living_room', music: ['media_player.living_room'], tv: 'media_player.living_room_tv' },
    { window: 'side_right', name: 'Bedroom', light: 'light.bedroom', tv: 'media_player.bedroom_tv' },
    { window: 'gable', name: 'Loft', light: 'light.loft', music: ['media_player.loft'] },
  ],
  music: { everywhere: ['media_player.whole_house'], door: ['media_player.porch'], roof: ['media_player.kitchen'] },
  washer: { entity: 'sensor.washer', running: 'running', laundry_left: 'input_boolean.laundry_left', window: 'side_right' },
  tap: { street_lamp: 'light.garden', mailbox: '/calendar' },
};
