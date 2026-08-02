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
  } as any)
};
