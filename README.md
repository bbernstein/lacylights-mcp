# LacyLights MCP Server

[![GitHub Release](https://img.shields.io/github/v/release/bbernstein/lacylights-mcp?label=stable)](https://github.com/bbernstein/lacylights-mcp/releases/latest)
[![GitHub Pre-release](https://img.shields.io/github/v/release/bbernstein/lacylights-mcp?include_prereleases&label=beta)](https://github.com/bbernstein/lacylights-mcp/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![LacyLights Server MCP server](https://glama.ai/mcp/servers/@bbernstein/lacylights-mcp/badge)](https://glama.ai/mcp/servers/@bbernstein/lacylights-mcp)

An MCP (Model Context Protocol) server that provides AI-powered theatrical lighting design capabilities for the LacyLights system. This server enables AI assistants to create, manage, and control professional theatrical lighting designs through natural language interactions.

## What is LacyLights MCP?

LacyLights MCP is an intelligent lighting control interface that bridges the gap between creative vision and technical execution. It allows lighting designers, directors, and technicians to:

- **Design lighting scenes** using natural language descriptions
- **Analyze theatrical scripts** to automatically generate lighting cues
- **Manage DMX fixtures** from various manufacturers
- **Create and run cue sequences** for theatrical performances
- **Optimize lighting designs** for dramatic impact or energy efficiency

The system uses AI to understand artistic intent and translate it into precise DMX values for real-world lighting fixtures.

## Complete Function Reference

### Project Management

- **`list_projects`** - List all available lighting projects with optional fixture/scene counts
- **`create_project`** - Create a new lighting project for a production
- **`get_project_details`** - Get comprehensive details about a specific project
- **`delete_project`** - Delete a project and all associated data (requires confirmation)
- **`qlc_import_guidance`** - Get information about importing QLC+ (.qxw) files

### Fixture Management

- **`get_fixture_inventory`** - Query available fixtures and their capabilities
- **`analyze_fixture_capabilities`** - Deep analysis of fixture capabilities (color mixing, positioning, effects)
- **`create_fixture_instance`** - Add a new fixture to a project with manufacturer/model details
- **`get_channel_map`** - View DMX channel usage map for a project
- **`suggest_channel_assignment`** - Get optimal channel assignments for multiple fixtures
- **`update_fixture_instance`** - Modify existing fixture properties
- **`delete_fixture_instance`** - Remove a fixture from a project (requires confirmation)

### Scene Creation & Management

- **`generate_scene`** - AI-powered scene generation based on descriptions and context
- **`analyze_script`** - Extract lighting cues and suggestions from theatrical scripts
- **`optimize_scene`** - Optimize scenes for various goals (energy, impact, simplicity)
- **`update_scene`** - Update scene properties and fixture values
- **`activate_scene`** - Activate a scene by name or ID
- **`fade_to_black`** - Fade all lights to black with customizable timing
- **`get_current_active_scene`** - Get information about the currently active scene

### Advanced Scene Operations

- **`add_fixtures_to_scene`** - Add fixtures to existing scenes
- **`remove_fixtures_from_scene`** - Remove specific fixtures from scenes
- **`get_scene_fixture_values`** - Read current fixture values in a scene
- **`ensure_fixtures_in_scene`** - Ensure fixtures exist with specific values
- **`update_scene_partial`** - Partial scene updates with fixture merging

### Cue Sequence Management

- **`create_cue_sequence`** - Build cue sequences from existing scenes
- **`generate_act_cues`** - Generate complete cue lists for theatrical acts
- **`optimize_cue_timing`** - Optimize cue timing for various strategies
- **`analyze_cue_structure`** - Analyze cue lists with recommendations

### Cue List Operations

- **`update_cue_list`** - Update cue list metadata
- **`add_cue_to_list`** - Add new cues to existing lists
- **`remove_cue_from_list`** - Remove cues from lists
- **`update_cue`** - Modify individual cue properties
- **`bulk_update_cues`** - Update multiple cues simultaneously
- **`reorder_cues`** - Reorder cues with new numbering
- **`get_cue_list_details`** - Query cues with filtering and sorting
- **`delete_cue_list`** - Delete entire cue lists (requires confirmation)

### Cue Playback Control

- **`start_cue_list`** - Begin playing a cue list from any point
- **`next_cue`** - Advance to the next cue
- **`previous_cue`** - Go back to the previous cue
- **`go_to_cue`** - Jump to a specific cue by number or name
- **`stop_cue_list`** - Stop the currently playing cue list
- **`get_cue_list_status`** - Get playback status and navigation options

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

## Configuration

### Required Environment Variables

- **`OPENAI_API_KEY`** - OpenAI API key for AI-powered lighting generation
- **`LACYLIGHTS_GRAPHQL_ENDPOINT`** - GraphQL endpoint for your lacylights-node backend (default: http://localhost:4000/graphql)

### Optional Environment Variables

- **`CHROMA_HOST`** - ChromaDB host for enhanced RAG functionality (default: localhost)
- **`CHROMA_PORT`** - ChromaDB port (default: 8000)

## Running the Server

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

## Integration with Claude

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

**Important**:
- Use the absolute path to `run-mcp.js` in your configuration
- If the above doesn't work, find your Node.js path with: `which node`
- The wrapper script ensures proper CommonJS module loading

## Releases & Versioning

### Release Channels

LacyLights MCP supports two release channels:

1. **Stable Releases** (e.g., `1.4.0`, `1.5.0`)
   - Production-ready versions
   - Fully tested and validated
   - Listed as "Latest" on GitHub
   - Updates `latest.json` for automatic discovery

2. **Beta Releases** (e.g., `1.4.1b1`, `1.5.0b2`)
   - Pre-release versions for testing
   - New features and experimental changes
   - Marked as "Pre-release" on GitHub
   - Does not affect stable `latest.json`

### Version Format

- **Stable:** `X.Y.Z` (semantic versioning)
  - `X` = Major version (breaking changes)
  - `Y` = Minor version (new features)
  - `Z` = Patch version (bug fixes)

- **Beta:** `X.Y.Zb[N]` (beta with iteration)
  - `b` = Beta identifier
  - `[N]` = Beta iteration number (1, 2, 3, ...)

### Installing Specific Versions

#### Install Latest Stable (Recommended)
```bash
# Download latest stable release
curl -s https://dist.lacylights.com/releases/mcp/latest.json | jq -r '.url' | xargs curl -LO

# Extract archive
tar -xzf lacylights-mcp-*.tar.gz
cd lacylights-mcp

# Install and run
npm ci --omit=dev
npm start
```

#### Install Specific Version
```bash
# Download specific version (replace X.Y.Z with actual version)
VERSION="1.4.0"  # or "1.4.1b1" for beta
curl -LO https://dist.lacylights.com/releases/mcp/lacylights-mcp-${VERSION}.tar.gz

# Verify SHA256 checksum (optional but recommended)
curl -s https://dist.lacylights.com/releases/mcp/latest.json | jq -r '.sha256'
sha256sum lacylights-mcp-${VERSION}.tar.gz

# Extract and run
tar -xzf lacylights-mcp-${VERSION}.tar.gz
cd lacylights-mcp
npm ci --omit=dev
npm start
```

#### Install Beta for Testing
```bash
# Download latest beta (check GitHub releases for version)
VERSION="1.5.0b2"
curl -LO https://dist.lacylights.com/releases/mcp/lacylights-mcp-${VERSION}.tar.gz

# Extract and test
tar -xzf lacylights-mcp-${VERSION}.tar.gz
cd lacylights-mcp
npm ci --omit=dev
npm start
```

### Release Distribution

All releases are distributed through multiple channels:

1. **GitHub Releases:** https://github.com/bbernstein/lacylights-mcp/releases
   - Source code
   - Pre-built archives
   - Release notes

2. **S3 Distribution:** https://dist.lacylights.com/releases/mcp/
   - Direct archive downloads
   - SHA256 checksums
   - `latest.json` metadata

3. **DynamoDB Registry:**
   - Version tracking
   - Release metadata
   - Prerelease flags

### Beta Testing Program

Want to help test new features? Install beta releases:

1. **Check for betas:** Visit [GitHub Releases](https://github.com/bbernstein/lacylights-mcp/releases)
   - Look for releases marked "Pre-release"
   - Version format: `X.Y.Zb[N]`

2. **Install beta:**
   ```bash
   # See "Install Beta for Testing" above
   ```

3. **Report issues:**
   - Open issues on GitHub
   - Include version number
   - Provide reproduction steps

### Release Process

For maintainers: See [RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) for complete release documentation including:
- Beta release workflows
- Stable release procedures
- Version management
- Distribution verification
- Troubleshooting and rollback

## Complete Example: Lighting Design for Macbeth

Here's a comprehensive example showing how a lighting designer would use LacyLights MCP to create a complete lighting design for Shakespeare's Macbeth:

### Step 1: Create the Project

```
Use create_project to create a new project called "Macbeth - Main Stage 2024"
with description "Shakespeare's Macbeth, directed by Jane Smith, March 2024 production"
```

### Step 2: Set Up Fixtures

```
Use create_fixture_instance to add these fixtures to the project:
- 12x Chauvet SlimPAR Pro RGBA fixtures for front wash (channels 1-48)
- 8x Martin MAC Quantum Profile moving heads for specials (channels 100-163)
- 6x ETC Source Four LED Series 2 for side lighting (channels 200-241)
- 4x Chauvet Strike 4 strobes for storm effects (channels 300-315)
- 2x Rosco Vapour Plus hazers for atmosphere (channels 400-403)
```

### Step 3: Analyze the Script

```
Use analyze_script with the full text of Act 1 to extract:
- All lighting cues mentioned in stage directions
- Scene transitions that need lighting changes
- Mood and atmosphere requirements for each scene
```

### Step 4: Generate Key Scenes

```
Use generate_scene to create these essential scenes:

1. "Opening - Thunder and Lightning"
   - Script context: "Thunder and lightning. Enter three witches."
   - Mood: ominous, supernatural
   - Color palette: ["deep purple", "electric blue", "white strobe"]
   - Intensity: dramatic

2. "Duncan's Arrival at Inverness"
   - Script context: "Hautboys and torches. Enter Duncan, Malcolm, Donalbain, Banquo"
   - Mood: regal, warm
   - Color palette: ["warm amber", "gold", "soft orange"]
   - Intensity: moderate

3. "Lady Macbeth Reads the Letter"
   - Script context: "Enter Lady Macbeth, reading a letter"
   - Mood: intimate, plotting
   - Color palette: ["cool blue", "pale amber", "shadow"]
   - Focus areas: ["center stage", "downstage center"]

4. "The Dagger Soliloquy"
   - Script context: "Is this a dagger which I see before me"
   - Mood: hallucinatory, tense
   - Color palette: ["blood red", "deep shadow", "cold steel blue"]
   - Intensity: subtle
   - Focus areas: ["center stage spot"]

5. "Murder of Duncan"
   - Script context: "Macbeth exits to kill Duncan, bell rings"
   - Mood: dark, suspenseful
   - Color palette: ["deep red", "black", "moonlight blue"]
   - Intensity: dramatic

6. "Banquo's Ghost Appears"
   - Script context: "The Ghost of Banquo enters, and sits in Macbeth's place"
   - Mood: supernatural, terrifying
   - Color palette: ["ghostly green", "cold white", "shadow"]
   - Effects: use moving heads for ghost tracking

7. "Lady Macbeth's Sleepwalking"
   - Script context: "Enter Lady Macbeth with a taper"
   - Mood: haunted, guilty
   - Color palette: ["candlelight amber", "moonlight", "deep shadow"]
   - Focus areas: ["follow spot", "single candle effect"]

8. "Final Battle"
   - Script context: "Alarums. Enter Macbeth and Macduff fighting"
   - Mood: violent, chaotic
   - Color palette: ["fire red", "steel blue", "explosive white"]
   - Intensity: dramatic
   - Effects: strobe for sword clashes
```

### Step 5: Create Cue Sequences

```
Use create_cue_sequence to build the Act 1 cue list:
- Name: "Act 1 - Complete"
- Include all Act 1 scenes in order
- Set default fade times: 3 seconds in, 3 seconds out
- Add follow cues for quick transitions during soliloquies
```

### Step 6: Generate Act Cues with Script Analysis

```
Use generate_act_cues with the complete text of Act 2:
- This will analyze the script and create a complete cue list
- Automatically times transitions based on dramatic pacing
- Suggests lighting changes for every entrance, exit, and mood shift
```

### Step 7: Optimize for Performance

```
Use optimize_cue_timing on the Act 1 cue list:
- Strategy: "dramatic_timing"
- This will adjust fade times for maximum dramatic impact
- Smooth transitions for scene changes
- Sharp cuts for supernatural appearances
```

### Step 8: Create Special Effect Sequences

```
Use create_cue_sequence for the storm effect:
1. Lightning Strike 1 (strobes at full, 0.1s)
2. Thunder Roll (deep blue wash, 2s fade)
3. Lightning Strike 2 (strobes at 75%, 0.15s)
4. Return to storm base (purple/blue, 3s fade)
- Set follow times for automatic progression
```

### Step 9: Run the Show

During performance, the stage manager can use:

```
start_cue_list "Act 1 - Complete"
next_cue  # Advance through each cue
go_to_cue 15.5  # Jump to specific cue for pickups
fade_to_black 5  # Emergency blackout with 5-second fade
```

### Step 10: Make Live Adjustments

```
Use update_scene to adjust the "Banquo's Ghost" scene:
- Increase moving head intensity for better visibility
- Adjust color temperature based on costume reflectance
- Fine-tune positioning for actor's blocking changes
```

## Advanced Usage Examples

### Script-Driven Design Workflow

```
1. Analyze the entire script:
   analyze_script with full play text

2. Review extracted cues and scenes

3. Generate all suggested scenes in batch:
   generate_scene for each suggestion

4. Create master cue list:
   create_cue_sequence with all scenes

5. Optimize for your venue:
   optimize_scene for each scene with "technical_simplicity"
```

### Multi-Universe Setup

```
For large productions spanning multiple DMX universes:

1. Plan channel allocation:
   suggest_channel_assignment for all fixtures

2. Create fixtures with specific universe assignments:
   create_fixture_instance with universe: 1 for front lights
   create_fixture_instance with universe: 2 for moving heads
   create_fixture_instance with universe: 3 for effects

3. View the complete channel map:
   get_channel_map for the project
```

### Collaborative Design Process

```
Director requests:
"I want the witches' scenes to feel otherworldly but not cartoonish"

Use generate_scene:
- Description: "Witches on the heath"
- Mood: "otherworldly, mysterious"
- Color palette: ["deep violet", "fog grey", "pale green"]
- Intensity: "subtle"

Then iterate with optimize_scene using "dramatic_impact" until satisfied
```

## AI-Powered Features

### Intelligent Script Analysis
- Extracts explicit lighting cues from stage directions
- Identifies implicit lighting needs from dialogue and action
- Suggests atmospheric lighting based on dramatic context
- Recognizes standard theatrical conventions (sunrise, sunset, storms)

### Context-Aware Scene Generation
- Understands theatrical lighting principles
- Applies color theory for emotional impact
- Considers fixture capabilities and positions
- Generates DMX values that respect real-world constraints

### Adaptive Optimization
- **Energy Efficiency**: Reduces power consumption while maintaining artistic intent
- **Dramatic Impact**: Enhances contrast and focus for maximum effect
- **Technical Simplicity**: Simplifies programming for easier operation
- **Color Accuracy**: Optimizes for true color rendering

## Troubleshooting

### Common Issues

1. **Module import errors**
   - Ensure Node.js version is 18+ as specified in package.json
   - Use the `run-mcp.js` wrapper script, not `dist/index.js` directly

2. **GraphQL connection errors**
   - Verify your `lacylights-node` backend is running on port 4000
   - Check the `LACYLIGHTS_GRAPHQL_ENDPOINT` environment variable

3. **OpenAI API errors**
   - Ensure your `OPENAI_API_KEY` is set in the `.env` file
   - Verify the API key has access to GPT-4

4. **MCP connection errors in Claude**
   - Use the full absolute path in your Claude configuration
   - Restart Claude after updating the MCP configuration
   - Check Claude's logs for detailed error messages

5. **"Unexpected token ?" error**
   - Update your config to use the full path to Node.js 14+
   - On macOS with Homebrew: `"command": "/opt/homebrew/bin/node"`
   - On other systems, find your node path with: `which node`

## ChromaDB Setup (Optional - For Enhanced RAG)

The MCP server works out of the box with in-memory pattern storage. For persistent vector storage and more sophisticated pattern matching:

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

## Integration with LacyLights Ecosystem

This MCP server is part of the complete LacyLights system:

- **lacylights-node** - Backend GraphQL API for fixture and scene management
- **lacylights-fe** - Web frontend for manual control and visualization
- **lacylights-mcp** - AI interface for intelligent automation

The MCP server enhances the existing system with:
- Natural language control
- Intelligent scene generation
- Script analysis capabilities
- Automated cue creation
- Performance optimization

## Development

### Project Structure

```
src/
├── tools/           # MCP tool implementations
│   ├── fixture-tools.ts    # Fixture management operations
│   ├── scene-tools.ts      # Scene creation and control
│   ├── cue-tools.ts        # Cue list management
│   └── project-tools.ts    # Project operations
├── services/        # Core services
│   ├── graphql-client.ts   # GraphQL API client
│   ├── rag-service.ts      # RAG pattern matching
│   └── ai-lighting.ts      # AI scene generation
├── types/          # TypeScript type definitions
│   └── lighting.ts         # Core lighting types
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

## License

MIT
