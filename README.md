# LacyLights MCP Server

An MCP (Model Context Protocol) server that provides AI-powered theatrical lighting design capabilities for the LacyLights system.

## Features

### Fixture Management
- **`get_fixture_inventory`** - Query available lighting fixtures and their capabilities
- **`analyze_fixture_capabilities`** - Analyze specific fixtures for color mixing, positioning, effects, etc.

### Scene Generation
- **`generate_scene`** - Generate lighting scenes based on script context and design preferences
- **`analyze_script`** - Extract lighting-relevant information from theatrical scripts
- **`optimize_scene`** - Optimize existing scenes for energy efficiency, dramatic impact, etc.

### Cue Management
- **`create_cue_sequence`** - Create sequences of lighting cues from existing scenes
- **`generate_act_cues`** - Generate complete cue suggestions for theatrical acts
- **`optimize_cue_timing`** - Optimize cue timing for smooth transitions or dramatic effect
- **`analyze_cue_structure`** - Analyze and recommend improvements to cue lists

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the project:
```bash
npm run build
```

## ChromaDB Setup (Optional)

The MCP server currently uses an in-memory pattern storage system for simplicity. If you want to use ChromaDB for persistent vector storage and more advanced RAG capabilities:

### Option 1: Docker (Recommended)
```bash
# Start ChromaDB with Docker
docker-compose up -d chromadb

# Verify it's running
curl http://localhost:8000/api/v2/heartbeat
```

### Option 2: Local Installation
```bash
# Install ChromaDB
pip install chromadb

# Start the server
chroma run --host localhost --port 8000
```

Then update your `.env` file:
```bash
# Uncomment these lines in .env
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

**Note**: The current implementation works without ChromaDB using built-in lighting patterns. ChromaDB enhances the system with vector similarity search for more sophisticated pattern matching.

## Configuration

### Required Environment Variables

- **`OPENAI_API_KEY`** - OpenAI API key for AI-powered lighting generation
- **`LACYLIGHTS_GRAPHQL_ENDPOINT`** - GraphQL endpoint for your lacylights-node backend (default: http://localhost:4000/graphql)

### Running the Server

Make sure your `lacylights-node` backend is running first, then:

```bash
# Start in development mode (with auto-reload)
npm run dev

# Or build and run in production mode
npm run build
npm start
```

You should see:
```
RAG service initialized with in-memory patterns
LacyLights MCP Server running on stdio
```

### Optional Environment Variables

- **`CHROMA_HOST`** - ChromaDB host for RAG functionality (default: localhost)
- **`CHROMA_PORT`** - ChromaDB port (default: 8000)

## Usage

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Integration with Claude

Add this server to your Claude configuration:

```json
{
  "mcpServers": {
    "lacylights": {
      "command": "/usr/local/bin/node",
      "args": ["/path/to/lacylights-mcp/run-mcp.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here",
        "LACYLIGHTS_GRAPHQL_ENDPOINT": "http://localhost:4000/graphql"
      }
    }
  }
}
```

**Important**: If the above doesn't work, you may need to specify the exact path to your Node.js 14+ installation. You can find it with:
```bash
which node
```

**Note**: Use the absolute path to `run-mcp.js` in your configuration. This wrapper ensures proper CommonJS module loading.

## Example Usage

### Generate a Scene

```
Use the generate_scene tool to create lighting for:
- Scene: "Lady Macbeth's sleepwalking scene"
- Script Context: "A dark castle at night, Lady Macbeth enters carrying a candle, tormented by guilt"
- Mood: "mysterious"
- Color Palette: ["deep blue", "pale white", "cold"]
```

### Analyze a Script

```
Use the analyze_script tool with the full text of Act 1 of Macbeth to:
- Extract all lighting cues
- Suggest scenes for each moment
- Identify key lighting moments
```

### Create Cue Sequence

```
Use the create_cue_sequence tool to create a cue list for Act 1 using the scenes generated from script analysis.
```

## AI-Powered Features

### Script Analysis with RAG
- Analyzes theatrical scripts to extract lighting-relevant information
- Uses vector embeddings to match script contexts with lighting patterns
- Provides intelligent suggestions based on dramatic context

### Intelligent Scene Generation
- Creates detailed DMX values for fixtures based on artistic intent
- Considers fixture capabilities and positioning
- Applies color theory and lighting design principles

### Cue Timing Optimization
- Analyzes cue sequences for optimal timing
- Considers dramatic pacing and technical constraints
- Provides multiple optimization strategies

## Development

### Project Structure

```
src/
├── tools/           # MCP tool implementations
│   ├── fixture-tools.ts
│   ├── scene-tools.ts
│   └── cue-tools.ts
├── services/        # Core services
│   ├── graphql-client.ts
│   ├── rag-service.ts
│   └── ai-lighting.ts
├── types/          # TypeScript type definitions
│   └── lighting.ts
└── index.ts        # MCP server entry point
```

### Adding New Tools

1. Create tool implementation in appropriate file under `src/tools/`
2. Add tool definition to `src/index.ts` in the `ListToolsRequestSchema` handler
3. Add tool handler in the `CallToolRequestSchema` handler
4. Update this README with tool documentation

### Testing

```bash
npm test
```

## Integration with LacyLights

This MCP server is designed to work with the existing LacyLights system:

- **lacylights-node** - Provides GraphQL API for fixture and scene management
- **lacylights-fe** - Frontend for manual lighting control and visualization

The MCP server acts as an AI layer that enhances the existing system with intelligent automation and design assistance.

## Troubleshooting

### Common Issues

1. **Module import errors**
   - The server uses ES modules with cross-fetch for GraphQL requests
   - Ensure Node.js version is 18+ as specified in package.json

2. **GraphQL connection errors**
   - Verify your `lacylights-node` backend is running on port 4000
   - Check the `LACYLIGHTS_GRAPHQL_ENDPOINT` environment variable

3. **OpenAI API errors**
   - Ensure your `OPENAI_API_KEY` is set in the `.env` file
   - Verify the API key has access to GPT-4

4. **MCP connection errors in Claude**
   - Make sure to use the `run-mcp.js` wrapper script, not `dist/index.js` directly
   - Use the full absolute path in your Claude configuration
   - Restart Claude after updating the MCP configuration

5. **"Unexpected token ?" error**
   - This means Claude is using an old Node.js version (< 14)
   - Update your config to use the full path to your Node.js installation
   - On macOS with Homebrew: `"command": "/opt/homebrew/bin/node"`
   - On other systems, find your node path with: `which node`

### Dependencies

The simplified implementation uses:
- Direct fetch requests instead of Apollo Client for better ESM compatibility
- In-memory pattern storage instead of ChromaDB (can be upgraded later)
- Cross-fetch polyfill for Node.js fetch support

## License

MIT
