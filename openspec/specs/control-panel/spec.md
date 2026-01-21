# control-panel Specification

## Purpose
TBD - created by archiving change split-control-panel. Update Purpose after archive.
## Requirements
### Requirement: Display Mode State
The application MUST maintain separate states for `displayModeOverride` and `sleepModeOverride`, replacing the single `userModeOverride`.

#### Scenario: State Separation
Given the user changes "Display Mode" to "Dark"
And checks `displayModeOverride` state
Then it is "dark"
And `sleepModeOverride` state remains unchanged (e.g., `null`).

### Requirement: Persistence
Both `displayModeOverride` and `sleepModeOverride` MUST be persisted to `localStorage` to survive page reloads.

#### Scenario: Reload Persistence
Given the user sets Display Mode to "Light" and Sleep Mode to "Auto"
When the page is reloaded
Then Display Mode is still "Light"
And Sleep Mode is still "Auto".

