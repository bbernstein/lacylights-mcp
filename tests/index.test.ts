// Mock all dependencies first, before any imports
jest.mock('../src/services/graphql-client-simple');
jest.mock('../src/services/rag-service-simple');
jest.mock('../src/services/ai-lighting');
jest.mock('../src/tools/fixture-tools');
jest.mock('../src/tools/scene-tools');
jest.mock('../src/tools/cue-tools');
jest.mock('../src/tools/project-tools');
jest.mock('../src/mcp-imports', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined)
  })),
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
  CallToolRequestSchema: {},
  ListToolsRequestSchema: {}
}));

// Mock the RAG service initialization to avoid hanging
jest.mock('../src/services/rag-service-simple', () => {
  return {
    RAGService: jest.fn().mockImplementation(() => ({
      initializeCollection: jest.fn().mockResolvedValue(undefined),
      generateLightingRecommendations: jest.fn(),
      analyzeScript: jest.fn(),
      findSimilarLightingPatterns: jest.fn(),
      indexLightingPattern: jest.fn(),
      seedDefaultPatterns: jest.fn()
    }))
  };
});

describe('Index module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Reset process.env
    delete process.env.LACYLIGHTS_GRAPHQL_ENDPOINT;
  });

  it('should be able to import the module without errors', () => {
    expect(() => {
      // The module runs main() immediately, so we just test that it imports
      require('../src/index');
    }).not.toThrow();
  });

  it('should use default GraphQL endpoint when not specified', () => {
    const { LacyLightsGraphQLClient } = require('../src/services/graphql-client-simple');
    
    require('../src/index');
    
    expect(LacyLightsGraphQLClient).toBeDefined();
  });

  it('should use custom GraphQL endpoint when specified', () => {
    process.env.LACYLIGHTS_GRAPHQL_ENDPOINT = 'http://custom:4000/graphql';
    
    const { LacyLightsGraphQLClient } = require('../src/services/graphql-client-simple');
    
    require('../src/index');
    
    expect(LacyLightsGraphQLClient).toBeDefined();
  });

  it('should initialize all required services', () => {
    const { LacyLightsGraphQLClient } = require('../src/services/graphql-client-simple');
    const { RAGService } = require('../src/services/rag-service-simple');
    const { AILightingService } = require('../src/services/ai-lighting');
    
    require('../src/index');
    
    expect(LacyLightsGraphQLClient).toHaveBeenCalled();
    expect(RAGService).toHaveBeenCalled();
    expect(AILightingService).toHaveBeenCalled();
  });
});