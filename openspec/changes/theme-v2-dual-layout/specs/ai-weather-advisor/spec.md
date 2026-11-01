# Spec Delta

## MODIFIED Requirements

### Requirement: Contextual Prompts
The system SHALL use different system prompts based on whether the system is awake or in Sleep Mode. The prompt selection MUST NOT depend on a light/dark presentation, which no longer exists.

#### Scenario: General Mode Prompt
- **WHEN** the system is awake
- **THEN** the role is "Warm Family Butler"
- **AND** the output is limited to 25 Traditional Chinese characters
- **AND** it analyzes current vs forecast weather (Rain, Temp Change)

#### Scenario: Sleep Mode Prompt
- **WHEN** in Sleep mode (23:00 - 06:00)
- **THEN** the role is "Night Butler"
- **AND** the output is limited to 20 Traditional Chinese characters
- **AND** checks for Low Temp (<15°C), High Temp (>28°C), or Dryness (<40%)

#### Scenario: Prompt Unaffected By Layout Variant
- **WHEN** the user switches the layout variant while awake
- **THEN** the prompt role and limits are unchanged
- **AND** no new advice request is triggered by the switch alone
