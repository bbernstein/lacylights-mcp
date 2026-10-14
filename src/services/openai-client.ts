import OpenAI from "openai";

/**
 * Thrown when an AI-backed operation is requested but no OpenAI client could
 * be created (normally because OPENAI_API_KEY is not set).
 */
export class OpenAIUnavailableError extends Error {
  constructor(
    message = "This tool requires OpenAI, but OPENAI_API_KEY is not set. " +
      "Add OPENAI_API_KEY to the MCP server's environment (for example the " +
      '"env" block of your MCP client configuration) and restart the server. ' +
      "All non-AI LacyLights tools work without it.",
  ) {
    super(message);
    this.name = "OpenAIUnavailableError";
  }
}

/**
 * Create an OpenAI client from OPENAI_API_KEY, or return null when the SDK
 * refuses to construct one (it throws on a missing key since openai v5).
 *
 * OpenAI is only needed by a handful of AI-backed tools, so a missing key must
 * not prevent the MCP server from starting (bbernstein/lacylights-mcp#176).
 */
export function createOptionalOpenAIClient(): OpenAI | null {
  try {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch {
    return null;
  }
}

/**
 * Return the given client, or throw OpenAIUnavailableError when it is null.
 */
export function requireOpenAIClient(client: OpenAI | null): OpenAI {
  if (!client) {
    throw new OpenAIUnavailableError();
  }
  return client;
}
