// src/core/intent-service.ts
import { generateText } from 'ai';
import { getFastModel } from '@/infrastructure/nvidia/nvidia-client';
import { buildIntentPrompt } from '@/core/prompt-builder';
import { createLogger } from '@/lib/logger';
import { agentTools } from '@/infrastructure/tools'; // Adjust path as needed

const log = createLogger('IntentService');

export type IntentType = 'CASUAL' | 'TOOL_ACTION' | 'RAG_KNOWLEDGE';
export type SubDomainType = 'CART_MUTATION' | 'CANVAS_UPDATE' | 'ORDER_LOOKUP' | 'PRODUCT_SEARCH' | 'POLICY_LOOKUP' | 'GENERAL_HYBRID' | 'RESERVATION';

export async function classifyUserIntent(userQuery: string, formattedHistory: string) {
  const { text: intentResponse } = await generateText({
    model: getFastModel(),
    prompt: buildIntentPrompt(userQuery, formattedHistory),
  });

  let intent: IntentType = 'RAG_KNOWLEDGE';
  let subDomain: SubDomainType = 'GENERAL_HYBRID';

  const lines = intentResponse.trim().split('\n');
  for (const line of lines) {
    if (line.startsWith('INTENT:')) {
      const i = line.replace('INTENT:', '').trim().toUpperCase();
      if (i.includes('CASUAL')) intent = 'CASUAL';
      else if (i.includes('TOOL_ACTION')) intent = 'TOOL_ACTION';
      else if (i.includes('RAG')) intent = 'RAG_KNOWLEDGE';
    }
    if (line.startsWith('SUBDOMAIN:')) {
      const s = line.replace('SUBDOMAIN:', '').trim().toUpperCase();
      if (s.includes('CART_MUTATION')) subDomain = 'CART_MUTATION';
      else if (s.includes('CANVAS_UPDATE')) subDomain = 'CANVAS_UPDATE';
      else if (s.includes('ORDER_LOOKUP')) subDomain = 'ORDER_LOOKUP';
      else if (s.includes('PRODUCT_SEARCH')) subDomain = 'PRODUCT_SEARCH';
      else if (s.includes('POLICY_LOOKUP')) subDomain = 'POLICY_LOOKUP';
      else if (s.includes('RESERVATION')) subDomain = 'RESERVATION';
    }
  }
  
  log.info('Intent classified', { intent, subDomain });
  return { intent, subDomain };
}

export function getScopedTools(subDomain: SubDomainType): any {
  switch (subDomain) {
    case 'CART_MUTATION':
      // Bind Cart + Canvas + Inventory so the model can handle complex cart actions
      return { 
        addToCart: agentTools.addToCart,
        updateProductCanvas: agentTools.updateProductCanvas,
        checkInventory: agentTools.checkInventory 
      };

    case 'CANVAS_UPDATE':
    case 'PRODUCT_SEARCH':
      // Bind Canvas + Cart + Inventory so discovery can seamlessly transition to purchase
      return { 
        updateProductCanvas: agentTools.updateProductCanvas,
        addToCart: agentTools.addToCart,
        checkInventory: agentTools.checkInventory
      };

    case 'ORDER_LOOKUP':
      return { 
        fetchOrderStatus: agentTools.fetchOrderStatus 
      };

    case 'RESERVATION':
      return { 
        reserveItemInStore: agentTools.reserveItemInStore,
        checkInventory: agentTools.checkInventory 
      };

    default:
      // Fallback for general queries: provide core UI & Action suite
      return {
        updateProductCanvas: agentTools.updateProductCanvas,
        addToCart: agentTools.addToCart
      };
  }
}