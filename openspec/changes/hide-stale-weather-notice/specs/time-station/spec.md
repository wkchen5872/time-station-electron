# Spec Delta

## MODIFIED Requirements

### Requirement: AI Message Area
The system SHALL reserve one display area for the routine outing advisory or a visible anomaly notice. Weather-unavailable and location-unknown notices SHALL take priority over the advisory. During the temporary suppression policy, stale weather alone SHALL NOT replace the advisory or use anomaly styling. The advisory SHALL return when no visible anomaly remains. No additional permanent message area SHALL be introduced.

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

### Requirement: Data Validity And Anomaly States
The system SHALL distinguish valid weather data from absent or stale data, and SHALL derive anomaly state from that distinction. A numeric zero SHALL be treated as a valid value, not as a missing one. Values that have never been successfully retrieved MUST NOT be rendered as real weather. Staleness SHALL remain recorded internally while its visible notice is temporarily suppressed.

#### Scenario: Never Retrieved
- **WHEN** no successful weather response has been processed since launch, for any reason including an absent or rejected API key
- **THEN** weather values render as missing values
- **AND** no built-in placeholder temperature or condition is shown as if it were real
- **AND** the anomaly notice reports that weather data is unavailable

#### Scenario: Empty Or Invalid Response
- **WHEN** a request completes but yields no usable forecast entries
- **THEN** it does not count as a successful update
- **AND** the preceding state is retained if it exists, otherwise the never-retrieved state applies

#### Scenario: Response Does Not Cover The Present Moment
- **WHEN** the retrieved forecast contains no slot covering the present moment
- **THEN** it does not count as a successful update
- **AND** the data is treated as stale

#### Scenario: Stale After Previous Success
- **WHEN** valid data was previously retrieved
- **AND** no successful update has occurred for longer than the staleness threshold
- **THEN** the internal state records that the data is stale
- **AND** the last known values remain displayed
- **AND** no out-of-date notice is displayed

#### Scenario: Zero Is A Valid Value
- **WHEN** a retrieved temperature is 0 degrees or a precipitation probability is 0 percent
- **THEN** it is retained as a valid underlying value
- **AND** it is not treated as missing or absent
- **AND** whether it is rendered is decided by the active variant's display rules, not by its being zero

#### Scenario: Location Fallback Is Not An Anomaly
- **WHEN** IP geolocation fails
- **AND** a configured or cached location is available and used
- **THEN** no anomaly is raised for location

#### Scenario: Location Unavailable
- **WHEN** IP geolocation fails
- **AND** no configured or cached location is available
- **THEN** the anomaly notice reports that the location is unknown

#### Scenario: Advisory Service Is Optional
- **WHEN** the AI advisory provider is unconfigured or its call fails
- **THEN** no weather-data anomaly is raised
- **AND** the area falls back to its default message unless a visible weather-unavailable or location-unknown anomaly is present

#### Scenario: Each Anomaly Clears Independently
- **WHEN** a successful update produces data covering the present moment
- **THEN** the never-retrieved and stale anomalies clear
- **WHEN** a location becomes resolvable
- **THEN** the location anomaly clears
- **AND** clearing one anomaly does not clear another that is still true

#### Scenario: Suppression Applies To Every Staleness Cause
- **GIVEN** weather data was successfully retrieved earlier
- **WHEN** staleness is caused by an elapsed threshold, a new response without usable present-moment coverage, or exhaustion of the retained data coverage
- **THEN** the stale-weather notice remains suppressed in every case
- **AND** the existing data-validity and success criteria still apply

#### Scenario: Hiding A Notice Does Not Create A Successful Update
- **GIVEN** a prior successful update and retained weather values
- **WHEN** the stale-weather notice is suppressed
- **THEN** the prior successful-update timestamp and retained values are not changed by the suppression
- **AND** the data is not marked fresh merely because the notice is hidden
- **AND** the normal refresh schedule continues
