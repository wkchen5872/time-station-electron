# Proposal: Simplify Sleep Mode Toggle

## Summary
Simplify the Sleep Mode button toggle cycle from 3 states (Auto -> On -> Off) to 2 states (Auto -> On), hiding the "Off (Force Awake)" functionality while preserving the code logic for potential future use.

## Background
User feedback indicates that the 3-state toggle requires an extra click to cycle back to the desired state. Since only "Auto" and "On (Force Sleep)" are currently needed, the "Off (Force Awake / Stay Up Late)" state can be hidden to improve UX.

## Goals
1. Simplify button cycle: Auto -> On -> Auto (removing Off state)
2. Comment out or conditionally disable the "Off" state logic (preserve for future)
3. Update OpenSpec documentation to reflect this change

## Non-Goals
- Removing the underlying state management logic (keep for future reactivation)
- Changing the Auto or On behavior

## Impact
- **UI**: Sleep button now cycles between 2 states instead of 3
- **Code**: `toggleSleepMode()` updated to cycle `[null, true]` instead of `[null, true, false]`
- **Specs**: Updated to document the simplified toggle behavior
