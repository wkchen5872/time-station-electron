# Spec: Split Control Panel

## ADDED Requirements

### Requirement: Independent Display Mode Control
The development toolbar MUST provide a dedicated button to control the display theme (Light/Dark/Auto), independent of sleep behavior.

#### Scenario: Display Mode Cycling
Given the user clicks the "Display Mode" button
When the current state is "Auto"
Then it changes to "Light"
When clicked again, it changes to "Dark"
When clicked again, it returns to "Auto"
And the UI reflects the chosen theme immediately (unless Sleep Mode is active).

### Requirement: Independent Sleep Mode Control
The development toolbar MUST provide a dedicated button to control Sleep Mode (Sleep UI + AI Advice), overriding automatic scheduling.

#### Scenario: Sleep Mode Cycling
Given the user clicks the "Sleep Mode" button
When the current state is "Auto"
Then it changes to "On" (Force Sleep)
When clicked again, it changes to "Off" (Force Awake)
When clicked again, it returns to "Auto"

#### Scenario: Sleep Mode Priority
Given Sleep Mode is active (either via Auto schedule or Manual On)
When the user toggles the "Display Mode" button
Then the internal display state updates
But the visible UI remains in Sleep Mode (Pitch Black) until Sleep Mode is deactivated.

### Requirement: UI Layout
The control buttons MUST be separated by sufficient spacing (e.g., `gap-4`) to prevent accidental touches.

#### Scenario: Button Spacing
Given the two control buttons are rendered
When inspected in the DOM or visual layout
Then there is a visible gap between them (e.g., `ml-6` or `gap-4`)
And they are not touching each other.

## ADDED Requirements

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
