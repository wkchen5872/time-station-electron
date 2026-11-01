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
Built-in defaults only. There is no runtime configuration file: values are fixed at
build time and changing one requires a rebuild and redeploy.

1.  **`src/defaultConfig.js`**: the single source of built-in defaults. It must stay a
    leaf module with no imports, so that importing it never pulls in a service's own
    dependencies.
2.  **`ConfigManager.loadConfig()`**: an awaitable, injectable load point that returns a
    copy of that source. It is kept — rather than letting callers import the source
    directly — because three timing behaviours are specified against it: the clock does
    not wait for configuration, the weather schedule is created only after configuration
    resolves, and no schedule is created after unmount.
3.  **Consuming modules declare no defaults of their own.** A missing value's fallback
    must resolve to `defaultConfig.js`; a fallback that yields a value from the
    expression itself is a phantom default that silently ignores the source.

### Data Flow
`ConfigManager.loadConfig()` -> copy of `defaultConfig.js`. Modules that read a value
outside that flow import `defaultConfig.js` for their fallback.

The earlier 3-layer system (`defaultConfig.js` merged with a user-editable
`config.json` by `ConfigManager`) was removed on 2026-11-01: it never took effect in a
production build, while it did in development mode, so the two behaved differently.

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
