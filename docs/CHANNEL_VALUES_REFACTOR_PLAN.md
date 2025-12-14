# Channel Values Refactor Plan

## Overview
Change `channelValues` from an array of objects with channel IDs to a simple array of integers (0-255), using array index position to map to fixture channels.

## Current Structure
```typescript
channelValues: [
  { channelId: "ch123", value: 100 },
  { channelId: "ch456", value: 150 },
  { channelId: "ch789", value: 200 }
]
```

## Proposed Structure
```typescript
channelValues: [100, 150, 200] // Index 0 = first channel, Index 1 = second channel, etc.
```

## Benefits
- **Eliminates ambiguity**: No more confusion between definition vs mode channels
- **Simpler AI generation**: AI just needs to provide ordered integer values
- **Reduced data size**: Smaller JSON payloads
- **Clearer semantics**: Array index directly maps to channel offset
- **Easier validation**: Just check array length matches fixture channel count

## Implementation Plan

### Phase 1: Backend (lacylights-go)
**Priority: HIGH - Foundation for all other changes**

#### 1.1 Database Schema Changes
- [x] Update Prisma schema in `prisma/schema.prisma`
  - ✅ Replaced ChannelValue model with Int[] array on FixtureValue
  - ✅ Removed ChannelValue table entirely
  - ✅ Updated FixtureValue.channelValues to be Int[] array
- [x] Create database migration
- [x] Test migration on development database

#### 1.2 GraphQL Schema Updates
- [ ] Update `types/scene.ts` - ChannelValue type
  ```typescript
  type ChannelValue {
    channelIndex: Int!  # 0-based index (replaces channelId)
    value: Int!         # 0-255 DMX value
  }
  ```
- [ ] Update input types for scene creation/updates
- [ ] Update resolvers to handle new structure

#### 1.3 Resolver Updates
- [ ] `src/graphql/resolvers/scene.ts`
  - Update `createScene` mutation
  - Update `updateScene` mutation
  - Ensure proper channel index validation
- [ ] Add validation: channel index < fixture channel count
- [ ] Update any queries that return channel values

#### 1.4 Service Layer Updates
- [ ] Update scene service methods
- [ ] Add helper functions for channel index ↔ channel definition mapping
- [ ] Update any business logic that processes channel values

### Phase 2: MCP Server (lacylights-mcp)
**Priority: HIGH - Must work with new backend**

#### 2.1 Type Definitions
- [ ] Update `src/types/lighting.ts`
  ```typescript
  interface GeneratedScene {
    name: string;
    description: string;
    fixtureValues: Array<{
      fixtureId: string;
      channelValues: number[]; // Simple array of 0-255 values
    }>;
    reasoning: string;
  }
  ```

#### 2.2 AI Service Updates
- [ ] `src/services/ai-lighting.ts`
  - Update AI prompt to request simple integer arrays
  - Remove channel ID logic from prompt generation
  - Update validation to check array length vs channel count
  - Simplify JSON format in prompts

#### 2.3 GraphQL Client Updates
- [ ] `src/services/graphql-client-simple.ts`
  - Update scene creation mutation to send channel indices
  - Update queries to receive new channel value format
  - Add helper to convert between formats if needed

#### 2.4 Scene Tools Updates
- [ ] `src/tools/scene-tools.ts`
  - Update scene generation flow
  - Update response formatting
  - Remove channel ID mapping logic

#### 2.5 Validation Updates
- [ ] Update `validateFixtureValues()` method
  - Check array length matches fixture channel count
  - Validate all values are 0-255 integers
  - Remove channel ID existence checks

### Phase 3: Frontend (lacylights-fe)
**Priority: MEDIUM - Can work with backend changes**

#### 3.1 Type Updates
- [ ] Update TypeScript interfaces
- [ ] Update GraphQL fragments and queries
- [ ] Update component prop types

#### 3.2 Component Updates
- [ ] Scene display components
- [ ] Channel value editors
- [ ] Fixture configuration components
- [ ] Any channel-specific UI elements

#### 3.3 Service Updates
- [ ] API service methods
- [ ] State management (if using Redux/Zustand)
- [ ] Any channel value processing logic

### Phase 4: Testing & Validation
**Priority: HIGH - Ensure system integrity**

#### 4.1 Backend Testing
- [ ] Unit tests for new resolvers
- [ ] Integration tests for scene operations
- [ ] Database migration testing
- [ ] GraphQL schema validation

#### 4.2 MCP Server Testing
- [ ] Scene generation tests
- [ ] Channel value validation tests
- [ ] AI response parsing tests
- [ ] End-to-end scene creation tests

#### 4.3 Frontend Testing
- [ ] Component rendering tests
- [ ] User interaction tests
- [ ] Data flow tests

### Phase 5: Migration & Deployment
**Priority: CRITICAL - Data integrity**

#### 5.1 Data Migration Strategy
- [ ] Create migration script to convert existing scenes
  - Query existing ChannelValue records
  - Map channelId to channel index using fixture definitions
  - Create new records with channel indices
  - Validate data integrity
- [ ] Backup strategy for existing data
- [ ] Rollback plan if migration fails

#### 5.2 Deployment Strategy
- [ ] Deploy backend changes first
- [ ] Update MCP server
- [ ] Deploy frontend changes
- [ ] Monitor for issues

## Implementation Order

### Step 1: Backend Foundation
1. Database schema changes
2. GraphQL type updates
3. Resolver updates
4. Migration script creation

### Step 2: MCP Server Adaptation
1. Type definition updates
2. AI prompt simplification
3. Validation logic updates
4. GraphQL client updates

### Step 3: Frontend Updates
1. Type updates
2. Component updates
3. Service layer updates

### Step 4: Testing & Migration
1. Comprehensive testing
2. Data migration execution
3. System validation

## Risk Mitigation

### Data Loss Prevention
- [ ] Complete database backup before migration
- [ ] Test migration on copy of production data
- [ ] Validate migrated data against original

### Rollback Planning
- [ ] Database rollback procedures
- [ ] Code rollback procedures
- [ ] Communication plan for issues

### Compatibility
- [ ] Consider API versioning if needed
- [ ] Gradual rollout strategy
- [ ] Monitor error rates during deployment

## Channel Index Mapping Logic

### For Mode-Specific Fixtures
```typescript
// Channel index maps to fixture.mode.channels[index].channel
const channelDef = fixture.mode.channels[channelIndex].channel;
```

### For Definition-Based Fixtures
```typescript
// Channel index maps to fixture.definition.channels[index]
const channelDef = fixture.definition.channels[channelIndex];
```

### Validation Rules
- `channelValues.length <= fixture channel count`
- `all values in channelValues are 0-255 integers`
- `channelIndex < fixture.mode?.channelCount || fixture.definition.channels.length`

## Benefits Realized

### For AI Generation
```typescript
// OLD: Complex channel ID management
"channelValues": [
  {"channelId": "ch_abc_123", "value": 100},
  {"channelId": "ch_def_456", "value": 150}
]

// NEW: Simple array
"channelValues": [100, 150, 0, 255]
```

### For Validation
```typescript
// OLD: Complex channel ID validation
const channelExists = fixture.definition.channels.some(ch => ch.id === channelId);

// NEW: Simple array length check
const isValid = channelValues.length <= fixture.channelCount;
```

### For Database Storage
- Smaller storage footprint
- Simpler queries
- No foreign key complexity for channel references
- Direct array indexing

## Success Criteria
- [ ] All existing scenes migrated successfully
- [ ] AI generates correct channel values for all fixture modes
- [ ] Frontend displays channels correctly
- [ ] Performance improved due to simpler data structure
- [ ] No data loss during migration
- [ ] All tests passing