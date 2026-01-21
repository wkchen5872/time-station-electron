# Project Context

## Purpose
**Time Station (時光台)** is an Electron + Vue.js smart desk calendar and weather station designed for Raspberry Pi 4 with a 7-inch touch screen.
**Target Resolution**: 800x480 or 1024x600 using Kiosk mode.
**Core Design**: Split screen layout with 70% Date/Time (Left) and 30% Weather (Right, iOS style).

## Tech Stack
- **Runtime**: Node.js 18.x+
- **Framework**: Electron 28.x (Cross-platform desktop)
- **Frontend**: Vue.js 3.x (Composition API)
- **Styling**: Tailwind CSS 3.x
- **Build Tool**: Vite 5.x
- **Libraries**: solarlunar 2.x (Lunar calendar)

## Project Conventions

### Code Style
- **Vue.js**: Use Composition API with `<script setup>` or `setup()` function.
  - Component names: PascalCase (`TimeStation.vue`)
  - Refs: camelCase (`currentTime`)
  - Functions: camelCase (`updateWeather`)
- **CSS**: Use Tailwind CSS utility classes.
  - Dynamic classes for theming.
  - Specific font sizes: Time `text-[140px]`, Temp `text-6xl`.
- **JavaScript**: Use `async/await` for asynchronous operations.
  - Always use try-catch for API calls.

### Architecture Patterns
- **Layout**: CSS Grid 10-column layout (7:3 ratio).
- **State Management**: Vue reactivity (`ref`, `computed`).
- **Configuration**:
  - `defaultConfig.js`: Defaults.
  - `config.json`: User overrides (City, API Keys).
  - `ConfigManager.js`: Merges configs.

### Testing Strategy
- Manual verification on Raspberry Pi or via Electron Dev mode.
- `npm run preview` for build verification.

### Git Workflow
- `feature/name` branches for new features.
- Merge to `main`/`develop` via PR or direct merge after testing.

## Domain Context
- **Hardware**: Raspberry Pi 4 (4GB RAM) with 7-inch Touchscreen.
- **Environment**: Always-on kiosk display. Needs to handle screen burn-in protection (Sleep mode) and day/night cycles.
- **Locale**: Traditional Chinese (zh-TW) interface. Lunar calendar support is essential.

## Important Constraints
- **Performance**:
  - Disable hardware acceleration if screen flickers on Pi.
  - Weather updates every 30 mins to save resources/API quota.
  - Avoid heavy animations (`transition-`) for Pi performance.
- **Display**: High contrast required for readability on small screens.

## External Dependencies
- **OpenWeatherMap One Call API**: For weather data (Current, Hourly, Daily).
