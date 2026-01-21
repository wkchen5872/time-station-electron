# Time Station Specification

## System Requirements

### Requirement: Platform Support
The application SHALL run on Electron 28.x and support Linux ARM64 (Raspberry Pi 4) in Kiosk mode.

#### Scenario: Running on Raspberry Pi
- **WHEN** the application is launched on Raspberry Pi 4
- **THEN** it runs in fullscreen kiosk mode
- **AND** the cursor is hidden

## User Interface

### Requirement: Split Layout
The interface SHALL be divided into two main sections: Time/Date (Left) and Weather (Right) with a 7:3 width ratio using CSS Grid.

#### Scenario: Layout Check
- **WHEN** the application is displayed
- **THEN** it occupies 10 grid columns
- **AND** the left section spans 7 columns
- **AND** the right section spans 3 columns

### Requirement: Time Display
The system SHALL display the current time in 24-hour format with a very large font size for readability from a distance.

#### Scenario: Time Format
- **WHEN** the clock updates
- **THEN** the time is shown as `HH:MM`
- **AND** the font size is approximately 140px (on 800x480)

### Requirement: Date and Calendar
The system SHALL display the current Gregorian date, day of the week, and corresponding Lunar calendar date including Solar Terms if applicable.

#### Scenario: Date Information
- **WHEN** displaying the date
- **THEN** it shows YYYY/MM/DD and Weekday (in Traditional Chinese)
- **AND** it shows the Lunar Date (Month/Day) and Zodiac Year
- **AND** it shows the Solar Term if today is a Solar Term day

## Weather Information

### Requirement: Weather Data Integration
The system SHALL fetch weather data from OpenWeatherMap API, including current conditions, hourly forecasts, and daily forecasts.

#### Scenario: Data Fetching
- **WHEN** the application starts or the update interval (30 min) passes
- **THEN** it requests data from the Weather API
- **AND** updates the display with fresh data

### Requirement: iOS Style Weather Display
The weather section SHALL follow an iOS-style 3-block design: Current Status (Top), Hourly Forecast (Middle), Daily Forecast (Bottom).

#### Scenario: Current Weather Block
- **WHEN** viewing the top weather block
- **THEN** it displays Location Name, Big Temperature (7xl), Weather Condition, High/Low Temp, and Feels-like Temp.

#### Scenario: Hourly Forecast Block
- **WHEN** viewing the middle weather block
- **THEN** it displays 4 time slots
- **AND** each slot shows time, icon, and temperature

#### Scenario: Future Forecast Block
- **WHEN** viewing the bottom weather block
- **THEN** it displays forecasts for Tomorrow and The Day After Tomorrow
- **AND** formats them as "Day Icon Min-Max°C"

## Display Modes

### Requirement: Theme Modes
The system SHALL support Light, Dark, and Sleep modes, with distinctive visual styles for each.

#### Scenario: Light Mode
- **WHEN** in Light Mode
- **THEN** background is `bg-gray-50` and text is dark

#### Scenario: Dark Mode
- **WHEN** in Dark Mode
- **THEN** background is `bg-gray-900` and text is white

#### Scenario: Sleep Mode
- **WHEN** in Sleep Mode
- **THEN** background is Pure Black `#000000`
- **AND** text is dimmed (`text-gray-600`) to reduce light pollution

### Requirement: Smart Mode Switching
The system SHALL automatically switch between modes based on time of day (Auto Mode), or allow manual override.

#### Scenario: Auto Mode Logic
- **WHEN** in Auto Mode
- **IF** time is between 23:00 and 06:00 **THEN** switch to Sleep Mode
- **ELSE IF** time is between 18:00 and 06:00 **THEN** switch to Dark Mode
- **ELSE** use Light Mode

#### Scenario: Manual Override
- **WHEN** the user toggles the mode button
- **THEN** it cycles through Auto -> Light -> Dark -> Sleep

## AI Integration

### Requirement: AI Message Area
The system SHALL reserve a display area for AI-generated messages/greetings.

#### Scenario: Placeholder Display
- **WHEN** no AI message is generated
- **THEN** a default or mock message is displayed in the designated area
