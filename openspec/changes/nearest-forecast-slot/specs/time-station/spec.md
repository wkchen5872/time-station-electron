# Spec Delta

## MODIFIED Requirements

### Requirement: Data Validity And Anomaly States
The system SHALL distinguish valid weather data from absent or stale data, and SHALL derive anomaly state from that distinction. The present-moment value SHALL be taken from the slot covering now, or, when the source provides no such slot, from the nearest slot that has not yet started and begins within one slot duration. A numeric zero SHALL be treated as a valid value, not as a missing one. Values that have never been successfully retrieved MUST NOT be rendered as real weather. Staleness SHALL remain recorded internally while its visible notice is temporarily suppressed.

#### Scenario: Never Retrieved
- **WHEN** no successful weather response has been processed since launch, for any reason including an absent or rejected API key
- **THEN** weather values render as missing values
- **AND** no built-in placeholder temperature or condition is shown as if it were real
- **AND** the anomaly notice reports that weather data is unavailable

#### Scenario: Empty Or Invalid Response
- **WHEN** a request completes but yields no usable forecast entries
- **THEN** it does not count as a successful update
- **AND** the preceding state is retained if it exists, otherwise the never-retrieved state applies

#### Scenario: Source Omits The Slot In Progress
- **GIVEN** the forecast source returns only slots that have not yet started
- **WHEN** the nearest such slot begins within one slot duration of the present moment
- **THEN** it counts as a successful update
- **AND** that slot supplies the present-moment values
- **AND** the data is not treated as stale for that reason alone

#### Scenario: Response Does Not Cover The Present Moment
- **WHEN** the retrieved forecast contains no slot covering the present moment
- **AND** no slot that has not yet started begins within one slot duration of now
- **THEN** it does not count as a successful update
- **AND** the data is treated as stale

#### Scenario: Stale After Previous Success
- **WHEN** valid data was previously retrieved
- **AND** no successful update has occurred for longer than the staleness threshold
- **THEN** the anomaly notice reports that the data is out of date
- **AND** the last known values remain displayed

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
- **AND** the area falls back to its default message unless a weather or location anomaly is present

#### Scenario: Each Anomaly Clears Independently
- **WHEN** a successful update produces a slot covering the present moment or a nearest slot within one slot duration
- **THEN** the never-retrieved and stale anomalies clear
- **WHEN** a location becomes resolvable
- **THEN** the location anomaly clears
- **AND** clearing one anomaly does not clear another that is still true

### Requirement: Short-term Forecast Slot Count
The short-term forecast block SHALL display four slots, starting with the slot covering the present moment or, when the source omits it, the nearest slot that has not yet started. The total span the four slots cover SHALL NOT be rendered as an additional on-screen label or heading.

#### Scenario: Four Consecutive Slots
- **WHEN** the short-term forecast block is rendered
- **THEN** it shows four consecutive slots
- **AND** the first slot is the one covering the present moment

#### Scenario: First Slot When The Source Omits The Slot In Progress
- **GIVEN** the forecast source returns only slots that have not yet started
- **WHEN** the short-term forecast block is rendered
- **THEN** the first slot is the nearest slot that has not yet started
- **AND** no slot is fabricated for the time already elapsed

#### Scenario: No Span Heading
- **WHEN** the short-term forecast block is rendered
- **THEN** no heading or caption stating the block's total time span is displayed

#### Scenario: Insufficient Data
- **WHEN** fewer than four slots are available from the source
- **THEN** only the available slots are shown
- **AND** the remaining positions render as missing values rather than fabricated slots
