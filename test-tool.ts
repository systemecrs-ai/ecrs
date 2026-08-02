import { tool } from 'ai';
import { z } from 'zod';

const t = tool({
  description: 'test',
  parameters: z.object({ sku: z.string() }),
  execute: async (args: any, options: any) => {
    console.log(args.sku);
    return 'hi';
  }
} as any);
