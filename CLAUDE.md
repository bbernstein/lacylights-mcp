# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LacyLights MCP is a Model Context Protocol (MCP) server that provides AI-powered theatrical lighting design capabilities. It acts as an intelligent bridge between AI assistants and the LacyLights theatrical lighting control system, enabling natural language control of DMX fixtures, scene generation, and cue management.

**Key Technologies:**
- TypeScript with CommonJS modules (target: ES2018)
- MCP SDK (@modelcontextprotocol/sdk) for AI integration
- Apollo GraphQL client for backend communication
- OpenAI API for AI-powered lighting generation
- Jest for testing with ts-jest

## Essential Commands

### Development
```bash
npm run dev           # Start dev server with auto-reload (tsx watch)
npm run build         # Compile TypeScript to dist/
npm start             # Run production build from dist/
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report (target: 70% lines, 65% functions)
```

### Code Quality
```bash
npm run lint          # Check for linting errors
npm run lint:fix      # Fix auto-fixable linting errors
```

### Running a Single Test
```bash
npm test -- path/to/test.test.ts          # Run specific test file
npm test -- --testNamePattern "pattern"   # Run tests matching pattern
```

## Architecture

### Core Components

**MCP Server (`src/index.ts`):**
- Main entry point implementing MCP protocol via stdio transport
- Registers 50+ tools for lighting control across 5 categories
- Routes tool calls to appropriate service handlers
- Returns JSON responses to AI clients (Claude, etc.)

**Services (`src/services/`):**
- `graphql-client-simple.ts`: Apollo client wrapper for lacylights-go backend GraphQL API
- `ai-lighting.ts`: OpenAI-powered scene generation and script analysis
- `rag-service-simple.ts`: In-memory pattern matching for lighting design knowledge (optional ChromaDB support)

**Tools (`src/tools/`):**
- `project-tools.ts`: Project CRUD operations
- `fixture-tools.ts`: Fixture inventory, channel assignment, and fixture instance management
- `scene-tools.ts`: AI scene generation, script analysis, scene activation, and safe scene updates
- `cue-tools.ts`: Cue sequence creation, playback control (next/previous/go-to), and timing optimization

**Types (`src/types/lighting.ts`):**
- Core TypeScript interfaces for Project, FixtureDefinition, FixtureInstance, Scene, CueList, Cue
- Shared type definitions used across all services and tools

### Data Flow

1. AI client (Claude) calls MCP tool via stdio
2. `index.ts` routes to appropriate tool handler (fixture/scene/cue/project tools)
3. Tool handler calls GraphQL client to fetch/mutate data from lacylights-go backend
4. For AI-powered operations, tool handler uses AILightingService (OpenAI) + RAGService
5. Response JSON is returned to AI client

### Integration Points

**Requires lacylights-go backend:**
- GraphQL endpoint: `http://localhost:4000/graphql` (configurable via `LACYLIGHTS_GRAPHQL_ENDPOINT`)
- Backend must be running for any MCP operations to work

**Optional integrations:**
- ChromaDB for persistent RAG patterns (falls back to in-memory)
- OpenAI API for AI-powered scene generation (required for `generate_scene`, `analyze_script`)

## Testing Patterns

**Test Structure:**
- Tests mirror `src/` structure in `tests/` directory
- Use Jest with ts-jest preset
- All fetch calls mocked using `jest.mock('cross-fetch')`
- Console methods mocked in `tests/setup.ts` to reduce noise

**Common Test Patterns:**
```typescript
// Mock GraphQL responses
const mockResponse = {
  json: jest.fn().mockResolvedValue({ data: { projects: [] } })
};
mockFetch.mockResolvedValue(mockResponse as any);

// Test error handling
mockFetch.mockResolvedValue({
  json: jest.fn().mockResolvedValue({ errors: [{ message: 'Error' }] })
});
```

**Coverage Requirements:**
- Lines: 70%
- Functions: 65%
- Branches: 50%
- Tests timeout at 10 seconds

## Configuration

**Environment Variables (.env):**
```bash
LACYLIGHTS_GRAPHQL_ENDPOINT=http://localhost:4000/graphql  # Required
OPENAI_API_KEY=sk-...                                      # Required for AI features
CHROMA_HOST=localhost                                       # Optional
CHROMA_PORT=8000                                            # Optional
```

**TypeScript Configuration:**
- Target: ES2018, CommonJS modules
- Strict mode enabled
- Output: `dist/` directory
- Special path mapping for MCP SDK CommonJS modules

## Important Development Notes

### Module System
- Uses CommonJS (`module: "commonjs"`) not ESM
- Main entry: `dist/index.js` after build
- Use `run-mcp.js` wrapper script for MCP client integration (not `dist/index.js` directly)

### MCP Tool Development
When adding new MCP tools:
1. Add tool definition in `ListToolsRequestSchema` handler (with schema)
2. Add tool implementation case in `CallToolRequestSchema` handler
3. Add method to appropriate tool class (fixture/scene/cue/project)
4. Update tests in corresponding `tests/tools/*.test.ts`
5. Document in README.md function reference

### Safe Scene Management
The codebase includes "safe" scene update functions that preserve existing fixtures:
- `addFixturesToScene`: Add fixtures without affecting others
- `removeFixturesFromScene`: Remove specific fixtures only
- `ensureFixturesInScene`: Add only if missing
- `updateScenePartial`: Merge fixture updates instead of replacing

Always prefer these over `updateScene` when modifying existing scenes to avoid data loss.

### GraphQL Client Usage
All backend communication goes through `LacyLightsGraphQLClient`:
- Methods are strongly typed with TypeScript interfaces
- Errors automatically thrown from GraphQL error responses
- Full fixture definitions flattened into instances for easier access
- Supports complex queries with nested fixture/scene/cue data

## Common Tasks

### Adding a New Tool
1. Define in `src/index.ts` `ListToolsRequestSchema` with input schema
2. Add handler case in `CallToolRequestSchema`
3. Implement in appropriate `src/tools/*.ts` class
4. Add unit tests in `tests/tools/*.test.ts`

### Modifying GraphQL Queries
1. Update query in `src/services/graphql-client-simple.ts`
2. Update TypeScript types in `src/types/lighting.ts` if needed
3. Update tests in `tests/services/graphql-client-simple.test.ts`

### Testing AI Features
Mock OpenAI responses in tests:
```typescript
const mockCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify(mockData) } }]
});
```