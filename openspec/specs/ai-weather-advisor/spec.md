# AI Weather Advisor Specification

## Core Integration

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

## Advice Generation

### Requirement: Contextual Prompts
The system SHALL use different system prompts based on the current display mode (General vs Sleep).

#### Scenario: General Mode Prompt
- **WHEN** in Light or Dark mode
- **THEN** the role is "Warm Family Butler"
- **AND** the output is limited to 25 Traditional Chinese characters
- **AND** it analyzes current vs forecast weather (Rain, Temp Change)

#### Scenario: Sleep Mode Prompt
- **WHEN** in Sleep mode (23:00 - 06:00)
- **THEN** the role is "Night Butler"
- **AND** the output is limited to 20 Traditional Chinese characters
- **AND** checks for Low Temp (<15°C), High Temp (>28°C), or Dryness (<40%)

## optimization & Cost Control

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

## Error Handling

### Requirement: Fallback Messages
The system SHALL display pre-defined fallback messages if the API call fails or times out.

#### Scenario: Network Error
- **WHEN** API call fails
- **THEN** display a random positive fallback message (e.g., "目前無法連線，但祝您有個美好的一天！")
