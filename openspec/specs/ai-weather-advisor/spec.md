# AI Weather Advisor Specification

## Purpose

Defines how Time Station generates, caches, and falls back to contextual weather advice through supported AI providers.

## Requirements

### Requirement: LangChain Framework
The system SHALL use LangChain.js to interface with LLM providers for generated advice.

#### Scenario: Library Usage
- **WHEN** generating advice
- **THEN** it uses `@langchain/core` interfaces
- **AND** supports `@langchain/openai` and `@langchain/google-genai`

### Requirement: Multi-Provider Support
The system SHALL support switching between OpenAI and Google Gemini providers via environment variables.

#### Scenario: Provider Switching
- **WHEN** `VITE_AI_PROVIDER` is set to 'openai'
- **THEN** it uses `ChatOpenAI` with `VITE_OPENAI_API_KEY`
- **WHEN** `VITE_AI_PROVIDER` is set to 'gemini'
- **THEN** it uses `ChatGoogleGenerativeAI` with `VITE_GEMINI_API_KEY`

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

### Requirement: Smart Caching
The system SHALL cache AI responses to minimize API costs.

#### Scenario: Cache Validity
- **WHEN** requesting advice
- **IF** cached response is < 1 hour old
- **AND** weather temperature delta < 3°C
- **AND** rain probability delta < 30%
- **AND** weather condition is unchanged
- **THEN** return cached response

### Requirement: Sleep Mode Optimization
The system SHALL limit API calls during sleep mode.

#### Scenario: One Greeting Per Night
- **WHEN** entering Sleep Mode
- **IF** a greeting has already been generated for this date
- **THEN** skip API call and use existing/last message
- **ELSE** generate and cache new night greeting

### Requirement: Fallback Messages
The system SHALL display pre-defined fallback messages if the API call fails or times out.

#### Scenario: Network Error
- **WHEN** API call fails
- **THEN** display a random positive fallback message (e.g., "目前無法連線，但祝您有個美好的一天！")
