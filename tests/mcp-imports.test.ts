import {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '../src/mcp-imports';

describe('MCP Imports', () => {
  it('should export Server class', () => {
    expect(Server).toBeDefined();
    expect(typeof Server).toBe('function');
  });

  it('should export StdioServerTransport class', () => {
    expect(StdioServerTransport).toBeDefined();
    expect(typeof StdioServerTransport).toBe('function');
  });

  it('should export CallToolRequestSchema', () => {
    expect(CallToolRequestSchema).toBeDefined();
    expect(typeof CallToolRequestSchema).toBe('object');
  });

  it('should export ListToolsRequestSchema', () => {
    expect(ListToolsRequestSchema).toBeDefined();
    expect(typeof ListToolsRequestSchema).toBe('object');
  });

  it('should be able to create Server instance', () => {
    const server = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    expect(server).toBeInstanceOf(Server);
  });

  it('should be able to create StdioServerTransport instance', () => {
    const transport = new StdioServerTransport();
    expect(transport).toBeInstanceOf(StdioServerTransport);
  });
});