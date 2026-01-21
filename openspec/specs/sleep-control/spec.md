# sleep-control Specification

## Purpose
TBD - created by archiving change simplify-sleep-toggle. Update Purpose after archive.
## Requirements
### Requirement: Sleep Mode Button Cycle
The Sleep Mode button MUST cycle between Auto and On states only, temporarily hiding the Off (Force Awake) state.

#### Scenario: Two-State Toggle Cycle
Given the user clicks the "Sleep Mode" button
When the current state is "Auto"
Then it changes to "On" (Force Sleep)
When clicked again, it returns to "Auto"
And the Off state is not accessible

#### Scenario: Preserved Off State Logic
Given the Off state is hidden from the UI
When reviewing the codebase
Then the logic for handling `sleepModeOverride === false` is preserved (commented or conditionally disabled)
And can be re-enabled in the future if needed

