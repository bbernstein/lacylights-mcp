import { z } from 'zod';
import {
  LacyLightsGraphQLClient,
  EosImportResult,
  EosExportResult,
} from '../services/graphql-client-simple';

const ImportEosAsciiSchema = z.object({
  asciiContent: z.string().describe('Full text content of the ETC Eos ASCII (.asc) showfile'),
  newProjectName: z.string().optional().describe('Optional explicit project name. If omitted, uses the showfile $$Title or a backend default'),
  targetProjectId: z.string().optional().describe('Optional existing project ID to import into. Mutually exclusive with newProjectName'),
});

const ExportEosAsciiSchema = z.object({
  projectId: z.string().describe('Project ID to export to ETC Eos ASCII'),
});

export class EosTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  async importEosAscii(args: z.infer<typeof ImportEosAsciiSchema>): Promise<EosImportResult> {
    const parsed = ImportEosAsciiSchema.parse(args);

    if (parsed.newProjectName && parsed.targetProjectId) {
      throw new Error('Provide either newProjectName or targetProjectId, not both');
    }

    const options =
      parsed.newProjectName || parsed.targetProjectId
        ? {
            newProjectName: parsed.newProjectName,
            targetProjectId: parsed.targetProjectId,
          }
        : undefined;

    return this.graphqlClient.importEosAscii(parsed.asciiContent, options);
  }

  async exportEosAscii(args: z.infer<typeof ExportEosAsciiSchema>): Promise<EosExportResult> {
    const parsed = ExportEosAsciiSchema.parse(args);
    return this.graphqlClient.exportEosAscii(parsed.projectId);
  }
}
