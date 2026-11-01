# Spec Delta

## MODIFIED Requirements

### Requirement: Smart Mode Switching
The system SHALL decide Sleep Mode from the existing `sleepMode` configuration (`enabled`, `startHour`, `endHour`), SHALL allow manual override of Sleep Mode, and SHALL NOT switch presentation automatically for any other reason. The configured defaults are `enabled: true`, `startHour: 23`, `endHour: 6`; these values SHALL resolve from the single built-in default source defined by the `builtin-defaults` capability, and MUST NOT appear as literal values inside the decision logic or as per-module constants.

#### Scenario: Auto Mode Logic
- **WHEN** no manual sleep override is set
- **AND** `sleepMode.enabled` is true
- **AND** the current hour falls inside the configured `startHour`–`endHour` window, including a window that crosses midnight
- **THEN** the system is in Sleep Mode
- **AND** otherwise it is awake
- **AND** no presentation is switched by time of day for any other reason

#### Scenario: Manual Override
- **WHEN** the user toggles the sleep button
- **THEN** it cycles through Auto and On only
- **AND** no control cycles through Light or Dark presentations

#### Scenario: Sleep Disabled By Configuration
- **WHEN** `sleepMode.enabled` is false
- **AND** no manual sleep override is set
- **THEN** the system never enters Sleep Mode automatically

#### Scenario: Preserved Force-Awake Override
- **WHEN** a stored sleep override of `false` is present
- **THEN** the system stays awake even inside the configured sleep window
- **AND** that override remains unreachable from the sleep button, which continues to cycle Auto and On only

#### Scenario: No Automatic Day/Night Presentation Change
- **WHEN** the system is awake
- **THEN** the presentation does not change with sunrise, sunset, or hour of day
- **AND** the active layout variant changes only by explicit user selection

#### Scenario: Switching Variant Does Not Affect Sleep
- **WHEN** the user switches the layout variant while in Sleep Mode
- **THEN** the system remains in Sleep Mode
- **AND** the sleep state and its override are unchanged

#### Scenario: Omitted Sleep Settings Resolve From The Single Source
- **WHEN** the supplied `sleepMode` configuration omits `enabled`, `startHour`, or `endHour`
- **THEN** each omitted value resolves from the single built-in default source
- **AND** changing that source changes the resulting Sleep Mode decision
