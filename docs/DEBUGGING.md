# Debugging the LacyLights MCP Server

## Overview

The LacyLights MCP server now includes file-based logging to help debug issues when the server is called from Claude Desktop or other MCP clients. Since the MCP protocol uses stdio (standard input/output) for communication, we cannot use console.log for debugging—instead, all logs are written to a file.

## Log File Location

Logs are written to:
```
~/.lacylights-mcp/logs/mcp-server.log
```

On macOS/Linux, this is typically:
```
/Users/YOUR_USERNAME/.lacylights-mcp/logs/mcp-server.log
```

On Windows, this would be:
```
C:\Users\YOUR_USERNAME\.lacylights-mcp\logs\mcp-server.log
```

## Viewing Logs in Real-Time

To watch the logs as they are written (useful when debugging):

### macOS/Linux:
```bash
tail -f ~/.lacylights-mcp/logs/mcp-server.log
```

### Or use less for scrolling:
```bash
less +F ~/.lacylights-mcp/logs/mcp-server.log
```
(Press Ctrl+C to stop following, then 'q' to quit)

## What Gets Logged

The MCP server logs the following information:

1. **Server Startup**: When the server starts, including the log file path and GraphQL endpoint
2. **All Tool Calls**: Every MCP tool invocation with its arguments
3. **Errors**: Any errors that occur, including full stack traces
4. **Fixture Updates**: Detailed logging for fixture update operations, including:
   - Fixture IDs being updated
   - Current fixture information
   - Update data being sent to the backend
   - Success/failure status

## Log Levels

The logger uses four levels:
- `INFO`: General information (server startup, successful operations)
- `DEBUG`: Detailed debugging information (function calls, intermediate states)
- `WARN`: Warning messages (optional features that failed to initialize)
- `ERROR`: Error messages with stack traces

## Log Format

Each log entry follows this format:
```
[2025-10-05T12:34:56.789Z] [LEVEL] Message
{
  "additional": "data",
  "in": "JSON format"
}
```

## Debugging Fixture Rename Issues

When Claude Desktop tries to rename fixtures (like your "par X" naming issue), you'll see entries like:

```
[2025-10-05T12:34:56.789Z] [INFO] Tool call: update_fixture_instance
{
  "args": {
    "fixtureId": "fixture-123",
    "name": "par 1"
  }
}

[2025-10-05T12:34:56.890Z] [DEBUG] updateFixtureInstance called
{
  "fixtureId": "fixture-123",
  "name": "par 1"
}

[2025-10-05T12:34:56.950Z] [DEBUG] Found current fixture
{
  "id": "fixture-123",
  "name": "LED Par 1",
  "manufacturer": "Chauvet",
  "model": "SlimPAR 64"
}

[2025-10-05T12:34:57.100Z] [DEBUG] Calling GraphQL updateFixtureInstance
{
  "fixtureId": "fixture-123",
  "updateData": {
    "name": "par 1"
  }
}

[2025-10-05T12:34:57.250Z] [INFO] Fixture updated successfully
{
  "id": "fixture-123",
  "name": "par 1"
}
```

If there's an error, you'll see:
```
[2025-10-05T12:34:57.250Z] [ERROR] Tool call failed: update_fixture_instance
{
  "args": {
    "fixtureId": "fixture-123",
    "name": "par 1"
  },
  "error": "GraphQL error: Invalid fixture ID",
  "stack": "Error: GraphQL error: Invalid fixture ID\n    at ..."
}
```

## Log Rotation

The log file automatically rotates when it exceeds 10MB. Old logs are renamed with a timestamp:
```
mcp-server-2025-10-05T12-34-56-789Z.log
```

## Reproducing Your Issue

To debug the fixture renaming issue:

1. **Start watching the logs**:
   ```bash
   tail -f ~/.lacylights-mcp/logs/mcp-server.log
   ```

2. **Clear the current log** (optional, to start fresh):
   ```bash
   > ~/.lacylights-mcp/logs/mcp-server.log
   ```

3. **Restart Claude Desktop** to ensure the MCP server restarts with logging

4. **Execute your prompt** in Claude Desktop:
   ```
   Working with lacylights, I'm working on project "test" which has 10 fixtures
   defined so far. Rename them "par X" where X is the index (starting with 1)
   of the sequential list of par fixtures.
   ```

5. **Watch the logs** to see exactly which MCP calls are being made and where failures occur

## Common Issues and What to Look For

### Fixture Not Found
```
[ERROR] Fixture not found
{
  "fixtureId": "some-id"
}
```
This means Claude is passing an invalid fixture ID. Check if the fixture exists in the project.

### GraphQL Errors
```
[ERROR] Tool call failed: update_fixture_instance
{
  "error": "GraphQL error: ...",
  "stack": "..."
}
```
This indicates a backend API issue. The error message will tell you what went wrong on the backend.

### Network/Connection Issues
```
[ERROR] Failed to update fixture instance
{
  "error": "fetch failed",
  "stack": "..."
}
```
This suggests the MCP server can't connect to the lacylights-go backend. Ensure the backend is running on http://localhost:4000.

## Getting Help

When reporting issues, please include:
1. The relevant section of the log file showing the error
2. The exact prompt you gave to Claude Desktop
3. The state of your project (number of fixtures, their current names, etc.)

You can share logs by running:
```bash
# Get the last 100 lines of the log
tail -n 100 ~/.lacylights-mcp/logs/mcp-server.log
```
