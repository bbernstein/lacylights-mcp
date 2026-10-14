# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

LacyLights MCP is a Model Context Protocol (MCP) server that enables AI-powered theatrical lighting design. It acts as a bridge between AI assistants (like Claude) and the LacyLights lighting control system, providing natural language control of DMX fixtures, scene generation, and cue management.

**Role in LacyLights Ecosystem:**
- AI integration layer for the LacyLights system
- Provides 80+ MCP tools for lighting control
- Connects AI assistants to the lacylights-go backend
- Enables natural language scene generation and script analysis

## Development Commands

### Development
```bash
npm run dev              # Start dev server with auto-reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm start                # Run production build from dist/
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Code Quality
```bash
npm run lint             # Check for linting errors
npm run lint:fix         # Fix auto-fixable linting errors
```

## Architecture

### Directory Structure

```
lacylights-mcp/
├── src/
│   ├── index.ts              # Main entry point, MCP protocol handler
│   ├── tools/                # MCP tool implementations
│   │   ├── project-tools.ts  # Project CRUD operations
│   │   ├── fixture-tools.ts  # Fixture management
│   │   ├── look-tools.ts     # Look generation and control
│   │   └── cue-tools.ts      # Cue sequence and playback
│   ├── services/             # Core services
│   │   ├── graphql-client-simple.ts  # Apollo client for backend
│   │   ├── ai-lighting.ts    # OpenAI integration
│   │   └── rag-service-simple.ts     # Pattern matching service
│   └── types/
│       └── lighting.ts       # TypeScript interfaces
├── tests/                    # Test files (mirrors src/)
├── run-mcp.js               # MCP client integration wrapper
└── dist/                    # Compiled output
```

### Key Technologies

- **TypeScript**: CommonJS modules (target ES2018)
- **MCP SDK**: @modelcontextprotocol/sdk for AI integration
- **Apollo GraphQL**: Client for backend communication
- **OpenAI API**: AI-powered scene generation
- **Jest**: Testing with ts-jest

### Data Flow

1. AI client (Claude) calls MCP tool via stdio
2. `index.ts` routes to appropriate tool handler
3. Tool handler calls GraphQL client to lacylights-go backend
4. For AI operations, uses OpenAI API + RAG patterns
5. Response JSON returned to AI client

## Important Patterns

### MCP Tool Development
When adding new MCP tools:

1. **Define tool** in `ListToolsRequestSchema` handler with input schema
2. **Add handler case** in `CallToolRequestSchema` handler
3. **Implement method** in appropriate tool class
4. **Write tests** in `tests/tools/*.test.ts`
5. **Document** in README.md function reference

```typescript
// Tool definition pattern
{
  name: "tool_name",
  description: "What this tool does",
  inputSchema: {
    type: "object",
    properties: { ... },
    required: [...]
  }
}
```

### Safe Look Updates
Use "safe" look update functions to preserve existing fixtures:
- `addFixturesToLook`: Add without affecting others
- `removeFixturesFromLook`: Remove specific fixtures only
- `ensureFixturesInLook`: Add only if missing
- `updateLookPartial`: Merge updates instead of replacing

**Always prefer these over `updateLook` to avoid data loss.**

### GraphQL Client Usage
All backend communication through `LacyLightsGraphQLClient`:
- Methods are strongly typed with TypeScript
- Errors automatically thrown from GraphQL responses
- Fixture definitions flattened into instances

### Error Handling
- Catch GraphQL errors and return structured responses
- Validate inputs before calling backend
- Provide helpful error messages for AI context

## Testing Guidelines

### Test Structure
- Tests mirror `src/` structure in `tests/`
- Use Jest with ts-jest preset
- Mock fetch calls with `jest.mock('cross-fetch')`

### Common Test Patterns
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

### Coverage Requirements
- Lines: 70%
- Functions: 65%
- Branches: 50%
- Test timeout: 10 seconds

## CI/CD

| Workflow | File | Purpose |
|----------|------|---------|
| CI | `ci.yml` | Tests, lint on PRs |
| Release | `release.yml` | Build and publish releases |

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LACYLIGHTS_GRAPHQL_ENDPOINT` | Yes | Backend GraphQL URL (default: http://localhost:4000/graphql) |
| `OPENAI_API_KEY` | For AI features | OpenAI API key for scene generation |
| `CHROMA_HOST` | No | ChromaDB host for persistent RAG |
| `CHROMA_PORT` | No | ChromaDB port (default: 8000) |
| `LACYLIGHTS_EXPORT_DIR` | No | Directory for CSV/XLSX data export files (default: `<tmpdir>/lacylights-exports`) |

### Module System
- Uses CommonJS (`module: "commonjs"`) not ESM
- Main entry: `dist/index.js` after build
- Use `run-mcp.js` wrapper for MCP client integration

## Related Repositories

| Repository | Relationship |
|------------|--------------|
| [lacylights-go](https://github.com/bbernstein/lacylights-go) | Backend API this MCP server calls |
| [lacylights-fe](https://github.com/bbernstein/lacylights-fe) | Frontend UI (not directly connected) |
| [lacylights-test](https://github.com/bbernstein/lacylights-test) | Integration tests for MCP tools |
| [lacylights-terraform](https://github.com/bbernstein/lacylights-terraform) | Distribution infrastructure - releases uploaded here |
| [lacylights-mac](https://github.com/bbernstein/lacylights-mac) | Production platform - hosts this MCP server (macOS only) |

## Important Notes

- **Backend Required**: lacylights-go must be running for any MCP operations
- **OpenAI Optional**: Only the AI generation tools (`generate_look`, `analyze_script`, ...) need `OPENAI_API_KEY`; the server must start without it (see `src/services/openai-client.ts`, #176)
- The release tarball must include `run-mcp.js` (guarded by `tests/release-archive.test.ts`)
- ChromaDB is optional (falls back to in-memory patterns)
- Use `run-mcp.js` wrapper, not `dist/index.js` directly

## Tool Categories

### Project Tools
- `list_projects`, `create_project`, `get_project`
- `get_project_details`, `delete_project`

### Fixture Tools
- `list_fixtures`, `get_fixture`, `create_fixture_instance`
- `get_fixture_inventory`, `analyze_fixture_capabilities`
- `get_channel_map`, `suggest_channel_assignment`

### Look Tools
- `generate_look`, `analyze_script`, `optimize_look`
- `list_looks`, `get_look`, `activate_look`
- Safe updates: `add_fixtures_to_look`, `remove_fixtures_from_look`

### Cue Tools
- `create_cue_sequence`, `generate_act_cues`
- `start_cue_list`, `next_cue`, `previous_cue`, `go_to_cue`
- `optimize_cue_timing`, `analyze_cue_structure`

### Undo/Redo Tools
- `undo`, `redo` - Undo/redo the last operation in a project
- `get_undo_redo_status` - Get current undo/redo status (canUndo, canRedo, descriptions)
- `get_operation_history` - Get paginated operation history for a project
- `jump_to_operation` - Jump to a specific point in history
- `clear_operation_history` - Clear all operation history (destructive)

### Eos ASCII Import/Export Tools
- `import_eos_ascii(asciiContent, newProjectName?, targetProjectId?)` -
  Import an ETC Eos ASCII (.asc) showfile into a new or existing project.
  `newProjectName` and `targetProjectId` are mutually exclusive.
- `export_eos_ascii(projectId)` - Export a project as ETC Eos ASCII text.
- Import wraps the `importProjectFromEos` mutation; export uses the
  read-only `projectExportEos` query (falling back to the deprecated
  `exportProjectToEos` mutation on backends that predate the query).
  Both surface structured warnings to the agent (e.g. `EFFECT_SKIPPED`,
  `UNPATCHED_CHANNEL`, `FIXTURE_SYNTHESIZED`, `GROUP_AUTO_ASSIGNED`).
- Implementation: `src/tools/eos-tools.ts` (Zod-validated args) +
  `src/services/graphql-client-simple.ts` (typed GraphQL methods).

### Data Export Tools (CSV / Excel)
- `list_data_export_tables()` - Tables with columns and scope (none, project,
  look, cueList, lookBoard), which say whether `projectId`/`scopeId` are needed.
- `export_data_table(table, projectId?, format?, scopeId?, outputDirectory?, maxCharacters?)` -
  CSV is returned inline (BOM stripped), truncated, preferably at a line
  break (default 50,000 characters) with `truncated`/`note`; XLSX is written to disk and only the
  path, row count and size are returned.
- `export_data_workbook(projectId, tables?, outputDirectory?)` - Multi-sheet
  XLSX written to disk. Omitting `tables` uses the backend default set.
- Files are created exclusively with mode 0600 (no overwrite, numeric suffix
  on clashes, symlinks never followed); the default temp folder is 0700.
- Wraps the read-only `dataExportTables`, `exportDataTable` and
  `exportDataWorkbook` queries (lacylights-go v0.4.0+). On older backends the
  `Cannot query field` error (`isUnknownQueryFieldError`) becomes an
  "update LacyLights" message.
- Implementation: `src/tools/data-export-tools.ts` +
  `src/services/graphql-client-simple.ts`.
