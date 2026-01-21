# Proposal: Split Control Panel and Independent Sleep Mode

## Summary
Split the current single-button control into two independent buttons: "Display Mode" and "Sleep Mode". This allows users to control the visual theme (Light/Dark/Auto) independently from the sleep behavior (Sleep UI/Normal UI/Auto), addressing the need for "early sleep" or "staying up late" scenarios without confusing theme settings.

## Background
Currently, the control logic mixes "Display Theme" and "Sleep Mode" into a single cycle: Auto -> Light -> Dark -> Sleep. This makes it impossible to, for example, force "Dark Mode" but *not* be in "Sleep Mode" (which implies a specific UI reduction). The user wants to decouple these.

## Goals
1.  **UI Layout**: Split the single button into two buttons (Display Mode, Sleep Mode) with adequate spacing.
2.  **Display Mode Button**: Cycles Auto -> Light -> Dark. Only affects color scheme.
3.  **Sleep Mode Button**: Cycles Auto -> On -> Off. Controls entry/exit of Sleep UI/behavior. Priority over Display Mode visual (Sleep UI is black).
4.  **Priority Logic**: When Sleep Mode is effective, the UI is forced to Sleep UI. When not, Display Mode takes over.

## Non-Goals
- Changing the underlying AI advice logic (except ensuring it triggers on Sleep Mode).
- Changing the definition of "Auto" logic itself (still relies on ConfigManager).

## Impact
- **UI**: New button in development toolbar.
- **State Management**: `userModeOverride` becomes `displayModeOverride` (or similar) and a new `sleepModeOverride` is introduced.
- **Logic**: `currentDisplayMode` computation needs to account for both overrides.
