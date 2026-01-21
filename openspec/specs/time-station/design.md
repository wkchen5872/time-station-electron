# Time Station Design Decisions

## Context
The application runs on low-power hardware (Raspberry Pi 4) but drives a specific touch screen resolution (800x480). Visuals must be premium and readable.

## Grid Layout Architecture
The entire application uses a 10-column CSS Grid.
- **Left 7 Columns (70%)**: Time, Date, Lunar, AI Message.
- **Right 3 Columns (30%)**: Weather Panel.

Why 7:3?
- Time is the primary information (needs massive font).
- Weather is auxiliary (needs vertical stacking).

## Configuration Management
A 3-layer configuration system to ensure robustness and user customizability.

1.  **`src/defaultConfig.js`**: Hardcoded fallback values in the codebase.
2.  **`config.json`**: User-editable file in the root/app directory.
3.  **`ConfigManager.js`**: Service that merges (1) and (2) at runtime.

### Data Flow
`ConfigManager.get('key')` -> checks `config.json` -> falls back to `defaultConfig.js`.

## API Integration Strategy

### OpenWeatherMap
- **Endpoint**: OneCall API 2.5/3.0
- **Caching**: No active caching in app (state updates destroy old data), but update interval is limited to 30 mins to avoid rate limits.
- **Error Handling**: Silent failure on network error (keep displaying old data or empty state), log to console.

### AI Service (Planned)
- **Structure**: Hook `updateAIMessage()` is prepared.
- **Trigger**: Called after weather update to use weather context for generating messages.

## Display Mode Architecture
- **State**: A global ref/computed property determines the current mode.
- **Persistence**: `localStorage` (implied or planned) to remember Manual overrides.
- **Sleep Logic**:
  - `23:00 - 06:00`: Force Sleep (Black background).
  - `18:00 - 06:00`: Dark Mode (Dark Gray background).
  - `06:00 - 18:00`: Light Mode.
