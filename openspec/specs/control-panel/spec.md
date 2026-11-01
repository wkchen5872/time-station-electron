# control-panel Specification

## Purpose
TBD - created by archiving change split-control-panel. Update Purpose after archive.
## Requirements
### Requirement: Display Mode State

The application MUST maintain separate states for the active layout variant and `sleepModeOverride`. The layout variant state holds `codex` or `claude`; it replaces `displayModeOverride`, which held `null`/`light`/`dark` and no longer exists.

#### Scenario: State Separation

- **GIVEN** the user switches the layout variant to "Claude"
- **WHEN** the layout variant state is read
- **THEN** it is "claude"
- **AND** `sleepModeOverride` state remains unchanged (e.g., `null`)

#### Scenario: Default Variant

- **GIVEN** no layout variant has been stored
- **WHEN** the application starts and initialises its state
- **THEN** the layout variant is "codex"
- **AND** the Codex layout is rendered

#### Scenario: No Automatic Theme Switching

- **GIVEN** the application is awake
- **WHEN** the time of day changes
- **THEN** the layout variant does not change on its own
- **AND** only an explicit user selection changes it

### Requirement: Persistence

Both the layout variant state and `sleepModeOverride` MUST be persisted to `localStorage` to survive page reloads. The layout variant MUST be stored under a key distinct from the retired `displayModeOverride`.

#### Scenario: Reload Persistence

- **GIVEN** the user sets the layout variant to "Claude" and Sleep Mode to "Auto"
- **WHEN** the page is reloaded
- **THEN** the layout variant is still "Claude"
- **AND** Sleep Mode is still "Auto"

#### Scenario: Retired Key Is Ignored

- **GIVEN** `localStorage` holds a `displayModeOverride` value from a previous version
- **WHEN** the application starts
- **THEN** that value does not affect the rendered layout
- **AND** the layout variant falls back to "codex" unless its own stored value exists

### Requirement: Layout Variant Control Affordance

The layout variant control SHALL be a segmented control presenting every available variant at once, with the active variant marked by a filled segment. The sleep control SHALL remain a separate single control that cycles its own states.

#### Scenario: Active Segment Is Marked

- **WHEN** the layout variant is "claude"
- **THEN** the Claude segment is filled
- **AND** the Codex segment is not filled
- **AND** both segments remain visible and selectable

#### Scenario: Selecting A Segment Switches Variant

- **WHEN** the user taps the segment of a variant that is not active
- **THEN** that variant becomes active
- **AND** the selection is persisted

#### Scenario: Sleep Control Is Independent

- **WHEN** the user changes the layout variant
- **THEN** the sleep state is unchanged
- **AND** the sleep control keeps its own displayed state
