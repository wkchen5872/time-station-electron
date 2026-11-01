# Spec Delta

## MODIFIED Requirements

### Requirement: Contextual Prompts
The system SHALL use different system prompts based on whether the system is awake or in Sleep Mode. The prompt selection MUST NOT depend on a light/dark presentation, which no longer exists. Each prompt's character limit SHALL be justified by its own constraint: the awake limit by the message area's capacity, the Sleep Mode limit by its brevity of tone. Neither limit SHALL exceed what the message area can display.

#### Scenario: General Mode Prompt
- **WHEN** the system is awake
- **THEN** the role is "Warm Family Butler"
- **AND** the output is limited to 44 Traditional Chinese characters
- **AND** that limit does not exceed the two-line capacity of the message area
- **AND** it analyzes current vs forecast weather (Rain, Temp Change)

#### Scenario: Sleep Mode Prompt
- **WHEN** in Sleep mode (23:00 - 06:00)
- **THEN** the role is "Night Butler"
- **AND** the output is limited to 20 Traditional Chinese characters
- **AND** that limit is set by the required brevity of tone, not by the message area width
- **AND** checks for Low Temp (<15°C), High Temp (>28°C), or Dryness (<40%)

#### Scenario: Prompt Unaffected By Layout Variant
- **WHEN** the user switches the layout variant while awake
- **THEN** the prompt role and limits are unchanged
- **AND** no new advice request is triggered by the switch alone

#### Scenario: Stated Limit Matches The Implementation
- **WHEN** the awake prompt's character limit is read from the prompt text
- **THEN** it is the same number this specification states
- **AND** no second character limit for the awake prompt is declared anywhere else
