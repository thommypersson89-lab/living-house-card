// A simple visual editor (ha-form). People and rooms are lists and are edited in the YAML editor.
import { LitElement, html, nothing } from 'lit';
import { LivingHouseConfig } from './config';
import { Hass } from './derive';
import { MODELS } from './model';

const ent = (domain: string | string[]) => ({ entity: { domain } });
const select = (options: [string, string][]) => ({ select: { mode: 'dropdown', options: options.map(([value, label]) => ({ value, label })) } });

const SCHEMA = [
  { name: 'weather', required: true, selector: ent('weather') },
  {
    type: 'grid', name: '', schema: [
      { name: 'house', selector: select(Object.values(MODELS).map((m) => [m.id, m.name])) },
      { name: 'country', selector: select([['se', 'Sweden'], ['none', 'No holidays']]) },
      { name: 'language', selector: select([['en', 'English'], ['sv', 'Svenska']]) },
    ],
  },
  {
    type: 'grid', name: '', schema: [
      { name: 'power', selector: ent('sensor') },
      { name: 'minecraft', selector: ent('sensor') },
      { name: 'birthdays', selector: ent(['calendar', 'binary_sensor']) },
      { name: 'calendar', selector: ent(['calendar', 'binary_sensor']) },
    ],
  },
  {
    type: 'expandable', name: 'indoor', title: 'Indoor labels', schema: [
      { name: 'temperature', selector: ent('sensor') },
      { name: 'humidity', selector: ent('sensor') },
    ],
  },
  {
    type: 'expandable', name: 'washer', title: 'Washing machine', schema: [
      { name: 'entity', selector: { entity: {} } },
      { name: 'running', selector: { text: {} } },
      { name: 'laundry_left', selector: ent(['input_boolean', 'binary_sensor']) },
    ],
  },
  {
    type: 'expandable', name: 'tap', title: 'Tap targets', schema: [
      { name: 'street_lamp', selector: { text: {} } },
      { name: 'mailbox', selector: { text: {} } },
      { name: 'chimney', selector: { text: {} } },
    ],
  },
  { name: 'help_path', selector: { text: {} } },
  { type: 'grid', name: '', schema: [{ name: 'labels', selector: { boolean: {} } }, { name: 'large_labels', selector: { boolean: {} } }] },
];

const LABELS: Record<string, string> = {
  weather: 'Weather', house: 'House', country: 'Holidays', language: 'Label language', power: 'Power (W): chimney smoke',
  minecraft: 'Minecraft players', birthdays: 'Birthdays', calendar: 'Calendar (mailbox flag)', temperature: 'Temperature',
  humidity: 'Humidity', entity: 'Entity', running: 'State while running', laundry_left: 'Laundry left in the machine',
  street_lamp: 'Street lamp: entity to toggle or path', mailbox: 'Mailbox: entity or path', chimney: 'Chimney: entity or path',
  help_path: 'Help button opens this path', labels: 'Show labels', large_labels: 'Large labels (wall tablet)',
};

export class LivingHouseCardEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: LivingHouseConfig;

  setConfig(config: LivingHouseConfig): void {
    this._config = config;
  }

  protected render(): unknown {
    if (!this.hass || !this._config) return nothing;
    return html`
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${SCHEMA} .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
        @value-changed=${this._changed}></ha-form>
      <p style="opacity:.7;font-size:.9em">People, rooms (windows, lights, music, TV) and colours are set in the YAML editor. See the README.</p>`;
  }

  private _changed(ev: CustomEvent): void {
    ev.stopPropagation();
    this._config = ev.detail.value as LivingHouseConfig;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

if (!customElements.get('living-house-card-editor')) customElements.define('living-house-card-editor', LivingHouseCardEditor);
