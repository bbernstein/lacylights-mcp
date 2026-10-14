import OpenAI from "openai";
import { logger } from "../utils/logger";

const MISSING_KEY_MESSAGE =
  "This tool requires OpenAI, but OPENAI_API_KEY is not set. " +
  "Add OPENAI_API_KEY to the MCP server's environment (for example the " +
  '"env" block of your MCP client configuration) and restart the server. ' +
  "All non-AI LacyLights tools work without it.";

const INIT_FAILED_MESSAGE =
  "This tool requires OpenAI, but the OpenAI client could not be initialized " +
  "even though OPENAI_API_KEY is set. Check the other OPENAI_* settings (for " +
  "example OPENAI_BASE_URL) and the MCP server log " +
  "(~/.lacylights-mcp/logs/mcp-server.log) for the underlying error, then " +
  "restart the server. All non-AI LacyLights tools work without it.";

/**
 * Thrown when an AI-backed operation is requested but no OpenAI client is
 * available (normally because OPENAI_API_KEY is not set).
 */
export class OpenAIUnavailableError extends Error {
  constructor(message = MISSING_KEY_MESSAGE) {
    super(message);
    this.name = "OpenAIUnavailableError";
  }
}

function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Create an OpenAI client from OPENAI_API_KEY, or return null when none can be
 * created.
 *
 * OpenAI is only needed by a handful of AI-backed tools, so a missing key must
 * not prevent the MCP server from starting (bbernstein/lacylights-mcp#176).
 * A missing key is the expected case and returns null silently. Any other
 * constructor failure (for example a malformed OPENAI_BASE_URL) also returns
 * null so startup still succeeds, but the real cause is written to the file
 * logger (stdout is reserved for the MCP protocol).
 */
export function createOptionalOpenAIClient(): OpenAI | null {
  if (!hasOpenAIKey()) {
    return null;
  }
  try {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (error) {
    logger.warn(
      "OpenAI client could not be initialized; AI-backed tools are unavailable",
      { error: error instanceof Error ? error.message : String(error) },
    );
    return null;
  }
}

/**
 * Return the given client, or throw OpenAIUnavailableError when it is null.
 * The error message distinguishes a missing key from a client that failed to
 * initialize despite a key being set.
 */
export function requireOpenAIClient(client: OpenAI | null): OpenAI {
  if (!client) {
    throw new OpenAIUnavailableError(
      hasOpenAIKey() ? INIT_FAILED_MESSAGE : MISSING_KEY_MESSAGE,
    );
  }
  return client;
}
