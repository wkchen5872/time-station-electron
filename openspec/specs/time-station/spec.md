# Time Station Specification

## Purpose

Defines the core clock, calendar, weather presentation, and platform behavior of the Time Station application.

## Requirements

### Requirement: Platform Support
The application SHALL support Linux ARM64 (Raspberry Pi 4) in Kiosk mode on the Electron major version pinned in `package.json`, and SHALL render correctly without network access at startup.

#### Scenario: Running on Raspberry Pi
- **WHEN** the application is launched on Raspberry Pi 4
- **THEN** it runs in fullscreen kiosk mode
- **AND** the cursor is hidden

#### Scenario: Offline Startup Rendering
- **WHEN** the application starts with no network connection
- **THEN** all displayed text renders in the bundled Traditional Chinese typeface
- **AND** no font is requested from an external host

### Requirement: Split Layout
The interface SHALL be divided into two main sections: Time/Date (Left) and Weather (Right) with a 6:4 width ratio using CSS Grid.

#### Scenario: Layout Check
- **WHEN** the application is displayed on an 800x480 screen
- **THEN** the left section occupies 480px
- **AND** the right section occupies 320px

### Requirement: Time Display
The system SHALL display the current time in 24-hour format with a very large font size for readability from a distance.

#### Scenario: Time Format
- **WHEN** the clock updates
- **THEN** the time is shown as `HH:MM`
- **AND** the font size is approximately 140px (on 800x480)

### Requirement: Date and Calendar
The system SHALL display the current Gregorian date, day of the week, and the corresponding Lunar calendar date including Solar Terms if applicable. The Lunar date SHALL be visually subordinate to the Gregorian date. Placement of each element is defined by the active layout variant.

#### Scenario: Date Information
- **WHEN** displaying the date
- **THEN** it shows the Gregorian date and Weekday (in Traditional Chinese)
- **AND** it shows the Lunar Date (Month/Day) rendered less prominently than the Gregorian date
- **AND** it shows the Solar Term if today is a Solar Term day
- **AND** it does not show the Zodiac (GanZhi) year

### Requirement: Weather Data Integration
The system SHALL fetch weather data from the Central Weather Administration (CWA) open data service, including current conditions, short-term forecasts, and daily forecasts. It SHALL NOT fetch sunrise/sunset data.

#### Scenario: Data Fetching
- **WHEN** the application starts or the update interval (30 min) passes
- **THEN** it requests forecast data from the CWA service
- **AND** updates the display with fresh data

#### Scenario: Single Request Per Refresh
- **WHEN** a weather refresh runs
- **THEN** exactly one CWA forecast request is issued
- **AND** no sunrise/sunset request is issued

### Requirement: iOS Style Weather Display
The weather section SHALL present three blocks: Current Status, Short-term Forecast, and Daily Forecast. The data items listed below SHALL be made available to every layout variant. Which of those items a variant renders, and under what condition, is defined by that variant's own display rules.

#### Scenario: Three Blocks Are Present
- **WHEN** viewing the weather section in any variant
- **THEN** a current status block, a short-term forecast block, and a daily forecast block are present

#### Scenario: Current Weather Block
- **WHEN** a variant composes the current status block
- **THEN** location name, current temperature, current weather condition, today's high and low temperature, and today's feels-like temperature and comfort index are available to it
- **AND** which of these it renders is decided by that variant's display rules

#### Scenario: Hourly Forecast Block
- **WHEN** a variant composes the short-term forecast block
- **THEN** for each slot its time interval, temperature, weather condition and precipitation probability are available to it
- **AND** which of these it renders is decided by that variant's display rules

#### Scenario: Future Forecast Block
- **WHEN** a variant composes the daily forecast block
- **THEN** for each of Tomorrow and The Day After Tomorrow its min-max temperature, weather condition and precipitation probability are available to it
- **AND** which of these it renders is decided by that variant's display rules

#### Scenario: Current Temperature Is Not Claimed As Measured
- **WHEN** any variant displays the current temperature
- **THEN** it is not labelled or worded as an observed or station measurement
- **AND** the variant may additionally mark it as a forecast value

### Requirement: Theme Modes
The system SHALL support Dark and Sleep presentation, with distinctive visual styles for each. A Light presentation SHALL NOT be offered.

#### Scenario: Light Mode
- **WHEN** any control on the screen is operated
- **THEN** no light-background presentation can be reached
- **AND** Light Mode is not offered as a selectable presentation

#### Scenario: Dark Mode
- **WHEN** the application is awake
- **THEN** the background is dark and text is light

#### Scenario: Sleep Mode
- **WHEN** in Sleep Mode
- **THEN** background is Pure Black `#000000`
- **AND** text is dimmed to reduce light pollution

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

### Requirement: Forecast Slot Interval Alignment
Each displayed forecast slot SHALL represent one half-open time interval `[start, end)`. The slot interval SHALL be the coarsest source interval among the elements available for that slot under the shared data contract, independent of which of them any variant chooses to display, so that no value is shown at a finer granularity than its source provides.

#### Scenario: Slot Interval Labelling
- **WHEN** a slot interval is one hour
- **THEN** its label identifies that hour
- **WHEN** a slot interval is longer than one hour
- **THEN** its label identifies the interval's start and end

#### Scenario: Hourly Temperature With Three-hour Precipitation
- **WHEN** the response supplies hourly temperature and three-hour precipitation probability
- **AND** a slot displays both
- **THEN** the slot interval is three hours
- **AND** the precipitation probability is attributed to that three-hour interval
- **AND** no hourly slot is shown carrying that three-hour probability as if it were hourly

#### Scenario: Coarse Elements Must Cover The Slot
- **WHEN** an element's source interval is at least as long as the slot interval
- **THEN** that element's own interval covers the whole slot
- **AND** a value whose interval only partly overlaps the slot is not shown in it

#### Scenario: Finer Elements Are Sampled At The Slot Start
- **WHEN** an element's source interval is shorter than the slot interval, such as hourly temperature inside a three-hour slot
- **THEN** the value shown is that element's source value at the slot's start
- **AND** the weather condition shown is the condition covering the slot's start
- **AND** the sampled value is not presented as a value for the whole slot beyond this defined sampling rule

#### Scenario: Interval Boundary Is Half-open
- **WHEN** an instant equals a slot's end time
- **THEN** that instant belongs to the next slot, not the ending one

#### Scenario: No Fabricated Granularity
- **WHEN** the source interval for an element is coarser than the slot being considered
- **THEN** no value is interpolated between source intervals
- **AND** no finer slot is synthesised

#### Scenario: Slot Composition Is Variant-Independent
- **WHEN** slots are composed
- **THEN** the element set used to determine the slot interval is the full set available from the source, not the subset a variant chooses to display
- **AND** a variant hiding a value does not change the slot's interval, count or representative values

#### Scenario: Hidden Precipitation Does Not Restore A Finer Slot
- **GIVEN** the source supplies hourly temperature and a three-hour precipitation probability of 10 percent
- **WHEN** one variant hides that probability because it falls below its display threshold
- **THEN** that variant's slots remain three-hour slots
- **AND** its slot boundaries and representative temperatures are identical to the variant that shows the probability

### Requirement: Short-term Forecast Slot Count
The short-term forecast block SHALL display four slots, starting with the slot covering the present moment or, when the source omits it, the nearest slot that has not yet started. The total span the four slots cover SHALL NOT be rendered as an additional on-screen label or heading.

#### Scenario: Four Consecutive Slots
- **WHEN** the short-term forecast block is rendered
- **THEN** it shows four consecutive slots
- **AND** the first slot covers the present moment or, when the source omits that slot, is the nearest slot that has not yet started and begins within one slot duration

#### Scenario: No Span Heading
- **WHEN** the short-term forecast block is rendered
- **THEN** no heading or caption stating the block's total time span is displayed

#### Scenario: Insufficient Data
- **WHEN** fewer than four slots are available from the source
- **THEN** only the available slots are shown
- **AND** the remaining positions render as missing values rather than fabricated slots

#### Scenario: First Slot When The Source Omits The Slot In Progress
- **GIVEN** the forecast source returns only slots that have not yet started
- **WHEN** the short-term forecast block is rendered
- **THEN** the first slot is the nearest slot that has not yet started
- **AND** no slot is fabricated for the time already elapsed

### Requirement: Forecast Day Boundary Correctness
Forecast grouping by calendar day SHALL use the display timezone, so that "today", "tomorrow" and "the day after tomorrow" refer to the local dates a viewer would name.

#### Scenario: Early Morning Local Time
- **WHEN** the local time is between 00:00 and 08:00 in UTC+8
- **THEN** today's High/Low temperature is derived from the current local date's forecast slots
- **AND** the "Tomorrow" row shows the next local date
- **AND** the "Day After Tomorrow" row shows the local date after that

#### Scenario: Today High And Low Are Present
- **WHEN** forecast data for the current local date is available
- **THEN** today's High/Low temperature reflects that data
- **AND** it is not left at a stale or placeholder value

### Requirement: Daily Forecast Representative Portion
The weather condition and precipitation probability shown for a future day SHALL be derived from that day's 06:00–18:00 local slots. A single slot at the start of the day MUST NOT be used on its own.

#### Scenario: Daytime Representation
- **WHEN** rendering the condition for Tomorrow or The Day After Tomorrow
- **THEN** it is taken from the 06:00–18:00 slot with the highest precipitation probability
- **AND** when every such slot has the same precipitation probability, it is taken from the first slot in that range
- **AND** it is not taken solely from the first forecast slot of that day

#### Scenario: Daily Precipitation Probability
- **WHEN** rendering the precipitation probability for a future day
- **THEN** it is the maximum value among that day's 06:00–18:00 slots

#### Scenario: Daily High And Low
- **WHEN** rendering the min-max temperature for a future day
- **THEN** it spans all of that day's slots, not only the 06:00–18:00 range

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

#### Scenario: Response Does Not Cover The Present Moment
- **WHEN** the retrieved forecast contains no slot covering the present moment
- **AND** no slot that has not yet started begins within one slot duration of now
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
- **WHEN** a successful update produces a slot covering the present moment or a nearest slot within one slot duration
- **THEN** the never-retrieved and stale anomalies clear
- **WHEN** a location becomes resolvable
- **THEN** the location anomaly clears
- **AND** clearing one anomaly does not clear another that is still true

#### Scenario: Suppression Applies To Every Staleness Cause
- **GIVEN** weather data was successfully retrieved earlier
- **WHEN** staleness is caused by an elapsed threshold, a new response without a usable covering or eligible nearest slot, or exhaustion of retained data under the same selection rule
- **THEN** the stale-weather notice remains suppressed in every case
- **AND** the existing data-validity and success criteria still apply

#### Scenario: Hiding A Notice Does Not Create A Successful Update
- **GIVEN** a prior successful update and retained weather values
- **WHEN** the stale-weather notice is suppressed
- **THEN** the prior successful-update timestamp and retained values are not changed by the suppression
- **AND** the data is not marked fresh merely because the notice is hidden
- **AND** the normal refresh schedule continues

#### Scenario: Source Omits The Slot In Progress
- **GIVEN** the forecast source returns only slots that have not yet started
- **WHEN** the nearest such slot begins within one slot duration of the present moment
- **THEN** it counts as a successful update
- **AND** that slot supplies the present-moment values
- **AND** the data is not treated as stale for that reason alone

### Requirement: Text Overflow Handling
Text that exceeds its allotted area SHALL be truncated with an ellipsis. The allotted area is one line for every field except the AI message area, which is two lines. The system MUST NOT introduce scrolling, marquee animation, or an expand interaction to reveal the remainder.

#### Scenario: Long Text Is Truncated
- **WHEN** a weather condition, location name or lunar date with solar term is longer than its allotted width
- **THEN** it is truncated and an ellipsis indicates the truncation
- **AND** the surrounding layout does not reflow

#### Scenario: No Motion Fallback
- **WHEN** any text is truncated
- **THEN** no scrolling or marquee animation is used
- **AND** no control is offered to expand the text

#### Scenario: Message Longer Than Two Lines Is Truncated
- **WHEN** an outing advisory or anomaly notice does not fit within two lines of the message area
- **THEN** it is truncated at the end of the second line and an ellipsis indicates the truncation
- **AND** no third line is rendered
- **AND** the surrounding layout does not reflow

### Requirement: Weather Icon Legibility
Weather icons SHALL be monochrome line icons sized for a low-contrast 800x480 panel, replacing colour emoji glyphs.

#### Scenario: Icon Rendering
- **WHEN** a weather icon is displayed in the short-term forecast
- **THEN** it is a monochrome line icon of at least 40px
- **AND** it does not depend on an emoji font

#### Scenario: Distinguishable Conditions
- **WHEN** adjacent forecast slots show different conditions
- **THEN** their icons are visually distinguishable without relying on colour

#### Scenario: Strokes Are Not Clipped
- **WHEN** any icon in the set is rendered at any size it is used at
- **THEN** its drawn strokes, including the full stroke width, lie inside the icon's visible area
- **AND** no part of a stroke is cut off by the symbol's viewBox or by its rendered viewport

#### Scenario: Clipping Is Judged By Stroke Extent
- **WHEN** verifying that an icon is not clipped
- **THEN** the check compares the drawn stroke extent against the visible area
- **AND** matching outer box dimensions alone is not accepted as evidence

### Requirement: Bundled Typeface
The Traditional Chinese typeface SHALL be bundled with the application rather than fetched from an external font host at runtime, and SHALL cover the full character repertoire of the chosen typeface so that dynamically generated text renders in it.

#### Scenario: No External Font Request
- **WHEN** the application loads
- **THEN** no request is made to an external font host
- **AND** the rendered typeface is the bundled one

#### Scenario: Dynamic Text Uses The Bundled Typeface
- **WHEN** text that cannot be enumerated in advance is displayed, such as an AI-generated advisory, a resolved place name, or a CWA weather description
- **THEN** it renders in the bundled typeface
- **AND** it does not fall back to a system typeface for characters the bundled typeface supports
