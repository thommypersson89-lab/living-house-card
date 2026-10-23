# Security

The card runs inside your Home Assistant dashboard and makes no network requests of its own: it reads the state Home Assistant already gives the dashboard and draws it. The only things it can do in Home Assistant are what you tap:

- a window or a `tap` entity toggles it, but only `light`, `switch`, `fan` and `input_boolean` entities; anything else (a lock, a cover, an alarm) opens its dialog instead
- everything else opens a dialog or a dashboard path you configured

Colours from the configuration must be hex (`#2f7d6d`); anything else is ignored.

## Reporting a problem

If you find a security problem, please report it privately through **Security → Report a vulnerability** on this repository rather than in a public issue. This is a hobby project without guaranteed support, but security reports will be read.
