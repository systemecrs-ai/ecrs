import { tool } from 'ai';
import { z } from 'zod';
import { AgentToolResult, HITLRequestPayload } from '@/types/agent';
import { getDatabase } from '@/infrastructure/database/mongodb-client';
import { UNIFIED_NODES_COLLECTION } from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const log = createLogger('AgentTools');

export const agentTools = {
  checkInventory: tool({
    description: 'Queries MongoDB for stock availability by SKU and Size.',
    parameters: z.object({
      sku: z.string().optional().describe('The SKU of the product'),
      size: z.string().optional().describe('The size of the product to check')
    }),
    execute: async (args: { sku?: string; size?: string }, options: any) => {
      const start = Date.now();
      try {
        const { sku, size } = args;
        
        if (!size) {
          return {
            success: false,
            message: "Missing size parameter. Please ask the user which size (S, M, L, XL) they want.",
            executionTimeMs: Date.now() - start
          } as AgentToolResult<any>;
        }
        
        if (!sku) {
          return {
            success: false,
            message: "Missing SKU parameter. Please ask the user for the product SKU.",
            executionTimeMs: Date.now() - start
          } as AgentToolResult<any>;
        }

        const db = await getDatabase();
        const product = await db.collection(UNIFIED_NODES_COLLECTION).findOne({
          type: 'product',
          sku: sku
        });

        if (!product) {
          return {
            success: false,
            message: `Product with SKU ${sku} not found.`,
            executionTimeMs: Date.now() - start
          } as AgentToolResult<any>;
        }

        // Check if size exists in the sizes array and product is inStock
        const hasSize = product.sizes?.includes(size) ?? false;
        const available = product.inStock && hasSize;

        const data = {
          sku,
          size,
          productName: product.name,
          available,
          message: available 
            ? `In stock for size ${size}.` 
            : `Out of stock for size ${size}.`
        };
        
        return { success: true, data, executionTimeMs: Date.now() - start, hitlRequired: false } as AgentToolResult<typeof data>;
      } catch (error: any) {
        log.error('Tool execution error', { error });
        return {
          success: false,
          message: `Unable to check inventory for SKU ${args.sku} right now. Error: ${error?.message || 'Database lookup failed'}`,
          executionTimeMs: Date.now() - start 
        } as AgentToolResult<any>;
      }
    }
  } as any),

  fetchOrderStatus: tool({
    description: 'Queries user order status by orderId or userId.',
    parameters: z.object({
      orderId: z.string().optional().describe('The ID of the order'),
      userId: z.string().optional().describe('The ID of the user')
    }),
    execute: async (args: { orderId?: string; userId?: string }, options: any) => {
      const start = Date.now();
      try {
        const { orderId, userId } = args;
        
        if (!orderId && !userId) {
          return {
            success: false,
            message: "Missing both orderId and userId parameters. Please ask the user for their order ID.",
            executionTimeMs: Date.now() - start
          } as AgentToolResult<any>;
        }

        const data = {
          orderId: orderId || 'MOCK-ORDER-123',
          userId: userId || 'MOCK-USER',
          status: 'SHIPPED',
          estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
          message: 'Your order is on the way.'
        };
        return { success: true, data, executionTimeMs: Date.now() - start, hitlRequired: false } as AgentToolResult<typeof data>;
      } catch (error: any) {
        log.error('Tool execution error', { error });
        return { 
          success: false, 
          message: `Unable to fetch order status right now. Error: ${error?.message || 'Database lookup failed'}`,
          executionTimeMs: Date.now() - start 
        } as AgentToolResult<any>;
      }
    }
  } as any),

  reserveItemInStore: tool({
    description: 'Prepares an in-store item reservation. Requires human-in-the-loop (HITL) confirmation before mutating state.',
    parameters: z.object({
      sku: z.string().optional().describe('The SKU of the product to reserve'),
      storeId: z.string().optional().describe('The ID of the store'),
      userId: z.string().optional().describe('The ID of the user making the reservation'),
      confirmed: z.boolean().optional().describe('Set to true only if the user has explicitly confirmed the action')
    }),
    execute: async (args: { sku?: string; storeId?: string; userId?: string; confirmed?: boolean }, options: any) => {
      const start = Date.now();
      
      try {
        if (!args.sku || !args.storeId || !args.userId) {
          return {
            success: false,
            message: "Missing required parameters (sku, storeId, or userId) to reserve an item. Please ask the user for the missing information.",
            executionTimeMs: Date.now() - start
          } as AgentToolResult<any>;
        }

        if (!args.confirmed) {
          const payload: HITLRequestPayload<typeof args> = {
            toolName: 'reserveItemInStore',
            parameters: args,
            actionSummary: `Reserve SKU ${args.sku} at store ${args.storeId}`,
            confirmationId: randomUUID()
          };

          const result: AgentToolResult<HITLRequestPayload<typeof args>> = {
            success: true,
            executionTimeMs: Date.now() - start,
            hitlRequired: true,
            data: payload
          };
          return result;
        }

        // If confirmed, proceed with mutation (Mocked reservation process)
        const result: AgentToolResult<any> = {
          success: true,
          executionTimeMs: Date.now() - start,
          hitlRequired: false,
          data: {
            reservationId: randomUUID(),
            sku: args.sku,
            storeId: args.storeId,
            status: 'RESERVED',
            message: 'Item has been successfully reserved in store.'
          }
        };
        return result;
      } catch (error: any) {
         log.error('Tool execution error', { error });
         return {
            success: false,
            message: `Unable to reserve item right now. Error: ${error?.message || 'Reservation failed'}`,
            executionTimeMs: Date.now() - start
         } as AgentToolResult<any>;
      }
    }
  } as any),

  updateProductCanvas: tool({
    description: 'Displays products on the user interface. You MUST pass an array of string SKUs and a brief 1-sentence summary of why you chose these items. Example payload: {"skus": ["SKU-123", "SKU-456"], "summary": "These are the best selling jeans."}. DO NOT pass functions, code, or full product details.',
    parameters: z.object({
      skus: z.array(z.string()).describe('An array of exact string SKUs. Example: ["SKU-PNT-003", "SKU-PNT-002"]'),
      summary: z.string().optional().describe("A brief 1-sentence summary of why you chose these items.")
    }).strict(),
    execute: async (args: { skus: any, summary?: string }, options: any) => {
  const start = Date.now();
  try {
    // 1. DEFENSIVE PARSING: Guarantee an Array at Runtime
    let safeSkus = args.skus;
    
    // If the SDK passed a stringified JSON array
    if (typeof safeSkus === 'string') {
      try {
        safeSkus = JSON.parse(safeSkus);
      } catch (e) {
        // If it fails to parse, treat the entire string as a single SKU
        safeSkus = [safeSkus]; 
      }
    }

    // If it's still not an array (e.g., just an object or a raw string), wrap it
    if (!Array.isArray(safeSkus)) {
      safeSkus = [safeSkus];
    }

    // Final safety check
    if (!safeSkus || safeSkus.length === 0 || !safeSkus[0]) {
      return { success: false, message: 'No valid SKUs extracted to display.' } as AgentToolResult<any>;
    }

    // 2. Hydrate the full product data on the backend
    const db = await getDatabase();
    const products = await db.collection(UNIFIED_NODES_COLLECTION)
      .find({ 
        type: 'product', 
        sku: { $in: safeSkus } // Passing the mathematically guaranteed array
      })
      .toArray();

    // 3. Return the rich data array
    return { 
      success: true, 
      executionTimeMs: Date.now() - start,
      hitlRequired: false,
      data: {
        items: products,
        summary: args.summary
      }
    } as AgentToolResult<any>;

  } catch (error: any) {
    log.error('Canvas tool execution error', { 
      error: error.message,
      stack: error.stack, 
      receivedArgs: args 
    });
    return { success: false, message: `System error: ${error.message}` } as AgentToolResult<any>;
  }
}
  } as any),

  addToCart: tool({
    description: 'Adds an item to the user\'s shopping cart. MUST include a brief conversational summary.',
    parameters: z.object({
      sku: z.string().describe('The SKU of the product to add to the cart'),
      quantity: z.number().default(1).describe('The number of items to add'),
      size: z.string().optional().describe('The selected size, if applicable'),
      variant: z.string().optional().describe('The selected variant or color, if applicable'),
      summary: z.string().optional().describe('A brief, friendly 1-sentence confirmation message (e.g., "I\'ve added the Levi 501s in size Medium to your cart!")')
    }),
    execute: async (args: { sku: string; quantity?: number; size?: string; variant?: string; summary?: string }, options: any) => {
      const start = Date.now();
      try {
        const { sku, quantity = 1, size, variant, summary } = args;
        
        if (!sku || typeof sku !== 'string') {
          return {
            success: false,
            message: "Invalid or missing SKU parameter. Ask the user which item they meant.",
            executionTimeMs: Date.now() - start
          } as AgentToolResult<any>;
        }

        const data = {
          sku,
          quantity,
          size,
          variant,
          message: summary || "Successfully added to your cart." 
        };
        
        return { success: true, data, executionTimeMs: Date.now() - start, hitlRequired: false } as AgentToolResult<typeof data>;
      } catch (error: any) {
        log.error('addToCart tool execution error', { error });
        return {
          success: false,
          message: `Unable to add item to cart right now. Error: ${error?.message || 'Execution failed'}`,
          executionTimeMs: Date.now() - start 
        } as AgentToolResult<any>;
      }
    }
  } as any)
};
