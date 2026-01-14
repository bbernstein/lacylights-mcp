# Look Type Implementation

This document describes the look type functionality in the LacyLights MCP server.

## Look Types

### Full Looks (Default)
- **Type**: `"full"`
- **Behavior**: Uses ALL fixtures in the project (after applying any filters)
- **Use Case**: Complete lighting states, major look changes, ensuring no fixtures are accidentally left on
- **Example**: "Bright daylight in the forest" - illuminates entire stage with daylight simulation

### Additive Looks
- **Type**: `"additive"`
- **Behavior**: Only modifies specific fixtures identified by `fixtureFilter`
- **Requirement**: Must include `fixtureFilter` to specify which fixtures to modify
- **Use Case**: Partial lighting changes, effects, actor-triggered lighting (like turning on a lamp)
- **Example**: "Table lamp comes on" - only affects fixtures tagged with "lamp" or "table"

## Usage Examples

### Full Look (Default behavior)
```json
{
  "projectId": "project-123",
  "lookDescription": "Bright morning sunlight in the garden",
  "lookType": "full"
}
```
This creates a complete lighting state using all fixtures in the project.

### Additive Look
```json
{
  "projectId": "project-123", 
  "lookDescription": "Actor turns on desk lamp",
  "lookType": "additive",
  "fixtureFilter": {
    "includeTags": ["desk", "lamp"]
  }
}
```
This only modifies fixtures with "desk" or "lamp" tags, leaving all other fixtures unchanged.

## Implementation Details

### AI Prompt Differences

**Full Look Prompt:**
- Lists ALL available fixtures
- Instructs AI to "use ALL fixtures"
- Creates complete lighting state
- Ensures no fixtures are accidentally left in previous states

**Additive Look Prompt:**
- Lists fixtures to modify + context about other fixtures
- Instructs AI to "only modify specified fixtures"
- Shows which fixtures will remain unchanged
- Creates partial lighting changes

### Error Handling
- Additive looks require `fixtureFilter` - throws error if missing
- Both types validate that at least one fixture matches the criteria
- Channel value validation remains the same for both types

## Rehearsal Safety
The default "full" look type ensures that when jumping between looks during rehearsals:
1. All fixtures are explicitly set to known values
2. No fixtures are accidentally left on from previous looks
3. Clean transitions between major lighting states
4. Consistent "full stage" lighting approach

The "additive" type allows for selective modifications when needed for special effects or actor-triggered lighting changes.
