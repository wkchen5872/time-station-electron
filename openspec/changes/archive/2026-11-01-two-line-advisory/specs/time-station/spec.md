# Spec Delta

## MODIFIED Requirements

### Requirement: AI Message Area
The system SHALL reserve one display area for the routine outing advisory or a visible anomaly notice. The area SHALL hold at most two lines of text and SHALL keep the same height regardless of how many lines the current message occupies. Weather-unavailable and location-unknown notices SHALL take priority over the advisory. During the temporary suppression policy, stale weather alone SHALL NOT replace the advisory or use anomaly styling. The advisory SHALL return when no visible anomaly remains. No additional permanent message area SHALL be introduced.

#### Scenario: Routine Advisory
- **WHEN** no visible anomaly is present
- **THEN** the area shows the outing advisory

#### Scenario: Placeholder Display
- **WHEN** no advisory message has been generated and no visible anomaly is present
- **THEN** a default message is displayed in the designated area

#### Scenario: Anomaly Takes Over The Area
- **WHEN** a weather-unavailable or location-unknown anomaly is present
- **THEN** the area shows that anomaly notice instead of the outing advisory

#### Scenario: Recovery
- **WHEN** every visible anomaly has cleared
- **THEN** the area returns to showing the outing advisory

#### Scenario: Anomaly Notice In Sleep Mode
- **WHEN** a visible anomaly is present while in Sleep Mode
- **THEN** the anomaly notice uses the Sleep Mode text treatment
- **AND** it does not raise screen brightness or contrast above the Sleep Mode level

#### Scenario: Stale Alone Uses The Routine Advisory
- **GIVEN** valid weather data was previously retrieved
- **AND** the internal weather state is stale without another visible anomaly
- **WHEN** the message area is rendered
- **THEN** it shows the existing outing advisory or the existing default message when no advisory exists
- **AND** it uses the routine advisory style
- **AND** no stale-weather warning or replacement warning is displayed

#### Scenario: Staleness Does Not Mask A Location Notice
- **GIVEN** stale weather and an unknown location are both recorded
- **WHEN** the message area is rendered
- **THEN** it shows the location-unknown notice
- **AND** hiding the stale-weather notice does not hide the location notice

#### Scenario: Message Wraps Onto A Second Line
- **GIVEN** a message longer than one line of the message area
- **WHEN** the message area is rendered
- **THEN** the message continues onto a second line instead of being truncated at the end of the first
- **AND** both lines are horizontally centred

#### Scenario: Area Height Does Not Follow The Line Count
- **GIVEN** a message that occupies one line
- **WHEN** the message area is rendered
- **THEN** the area occupies the same height as it does for a two-line message
- **AND** the single line is centred vertically within that area
- **AND** the separator above the area and every element above it stay in the same position as for a two-line message

### Requirement: Text Overflow Handling
Text that exceeds its allotted area SHALL be truncated with an ellipsis. The allotted area is one line for every field except the AI message area, which is two lines. The system MUST NOT introduce scrolling, marquee animation, or an expand interaction to reveal the remainder.

#### Scenario: Long Text Is Truncated
- **WHEN** a weather condition, location name or lunar date with solar term is longer than its allotted width
- **THEN** it is truncated and an ellipsis indicates the truncation
- **AND** the surrounding layout does not reflow

#### Scenario: Message Longer Than Two Lines Is Truncated
- **WHEN** an outing advisory or anomaly notice does not fit within two lines of the message area
- **THEN** it is truncated at the end of the second line and an ellipsis indicates the truncation
- **AND** no third line is rendered
- **AND** the surrounding layout does not reflow

#### Scenario: No Motion Fallback
- **WHEN** any text is truncated
- **THEN** no scrolling or marquee animation is used
- **AND** no control is offered to expand the text
