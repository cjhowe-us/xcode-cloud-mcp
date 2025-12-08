declare module '@modelcontextprotocol/sdk/dist/esm/types' {
  import type { z } from 'zod';

  export const ListResourcesRequestSchema: z.ZodTypeAny;
  export const ReadResourceRequestSchema: z.ZodTypeAny;

  export interface Resource {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }
}
