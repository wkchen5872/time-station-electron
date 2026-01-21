# Tasks: Split Control Panel

- [x] Refactor state variables in `TimeStation.vue` <!-- id: 1 -->
    - [x] Rename/Migrate `userModeOverride` to `displayModeOverride` (preserving 'light'/'dark' values if possible, or reset).
    - [x] Add `sleepModeOverride` ref (`null`).
- [x] Implement `isSleepMode` computed property <!-- id: 2 -->
    - [x] Logic: Check `sleepModeOverride` first, then fall back to `ConfigManager` time check.
- [x] Implement `currentDisplayMode` computed property <!-- id: 3 -->
    - [x] Logic: Check `isSleepMode` first (return `SLEEP`), then `displayModeOverride`, then Auto logic.
- [x] Update UI Templates <!-- id: 4 -->
    - [x] Split existing button into two buttons.
    - [x] Button A: Bind to `displayModeOverride` toggle. Add spacing (`gap-4` or `ml-6`).
    - [x] Button B: Bind to `sleepModeOverride` toggle.
    - [x] Update button texts/icons to match requirements ("Theme: Auto", "Sleep: ON", etc.).
- [x] Verify Interactions <!-- id: 5 -->
    - [x] Test Cycle A: Auto -> Light -> Dark.
    - [x] Test Cycle B: Auto -> On -> Off.
    - [x] Test Priority: Enable Sleep (On), toggle Display (Light/Dark) -> Verify UI remains Sleep (Black).
    - [x] Test Persistence: Ensure both overrides are saved to/loaded from `localStorage`.

