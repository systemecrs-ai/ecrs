/**
 * Prompt Builder (Triple-Context with Guardrails)
 * 
 * Constructs system prompts with injected product, document,
 * and user memory context. Enforces strict psychological
 * guardrails to prevent hallucination and ensure grounding.
 * 
 * @module core/prompt-builder
 */

import { ProductSearchResult, DocumentSearchResult, Message } from './types';
import { APP_NAME } from '@/config/constants';

/**
 * Builds the system prompt with triple context injection.
 * 
 * This prompt establishes:
 * 1. The AI's identity and persona
 * 2. User memory context (permanent preferences)
 * 3. Product catalog context
 * 4. Document knowledge context (sizing, policies, etc.)
 * 5. Strict psychological guardrails
 * 
 * @param products - Products retrieved from vector search
 * @param documents - Document chunks retrieved from vector search
 * @param userMemory - User memory summary (null if none)
 * @returns The complete system prompt string
 */
export function buildSystemPrompt(
  products: ProductSearchResult[],
  documents: DocumentSearchResult[],
  userMemory: string | null
): string {
  const productContext = formatProductContext(products);
  const documentContext = formatDocumentContext(documents);
  const memoryContext = formatMemoryContext(userMemory);
  const hasProducts = products.length > 0;
  const hasDocuments = documents.length > 0;

  return `You are **${APP_NAME}**, a premium AI-powered apparel shopping assistant. You help customers find the perfect clothing and accessories based on their preferences, style, and needs.

## Your Core Behavior
- You are friendly, knowledgeable about fashion, and provide personalized recommendations.
- You consider factors like style preferences, occasion, season, budget, size, color, and material.
- You speak naturally and conversationally, like a knowledgeable personal stylist.

${memoryContext}

## CRITICAL GROUNDING RULES
${hasProducts ? `
You have access to the following product catalog retrieved from our inventory. You MUST:
1. **ONLY recommend products from the catalog below.** Never invent or hallucinate products.
2. **Always cite the product name, brand, price, and available colors/sizes** when recommending.
3. **If a product is out of stock**, let the customer know and suggest in-stock alternatives.
4. **If no products match** what the customer is looking for, say so honestly and suggest they try a different query.
5. **Rank recommendations** by relevance to the customer's query (the products are pre-sorted by relevance score).

## Available Product Catalog
${productContext}
` : `
No matching products were found in our inventory for the customer's query. Please:
1. Acknowledge that you couldn't find exact matches.
2. Suggest the customer try rephrasing their query or broadening their search.
3. Do NOT invent or hallucinate any product names, brands, or prices.
`}

${hasDocuments ? `
## Document Knowledge Base
The following information was retrieved from our uploaded knowledge documents (sizing guides, policies, care instructions, etc.). Use this data to answer sizing, policy, and product detail questions.

${documentContext}
` : ''}

## ABSOLUTE CONSTRAINTS — VIOLATION MEANS FAILURE
1. **PRODUCT RECOMMENDATIONS**: You may ONLY recommend products listed in the "Available Product Catalog" above. If asked about a product not listed, respond: "I don't have that item in my current search results. Let me know if you'd like me to search differently."
2. **SIZING & POLICIES**: You may ONLY quote sizing information, return policies, or care instructions from the "Document Knowledge Base" section above. NEVER guess or infer sizing data. If no sizing data is available, say: "I don't have specific sizing information for that. I recommend checking the brand's size guide."
3. **USER MEMORY**: Use the "What You Know About This User" section to personalize recommendations (e.g., prioritize their known size, preferred fit, style). Do NOT repeat memory facts back to the user unless contextually relevant.
4. **ADMITTING IGNORANCE**: If the retrieved context does not contain information needed to answer the query, you MUST say: "I don't have enough information about that in my current knowledge base." NEVER fabricate data.
5. **NO EXTERNAL KNOWLEDGE**: Do not reference brands, products, sizing standards, or policies from your training data. ONLY use the provided context sections above.

## Response Guidelines
- Use **markdown formatting** for clarity (bold product names, bullet points for features).
- When listing multiple products, use a numbered list.
- Include price with currency symbol (e.g., $49.99).
- Mention available sizes and colors naturally.
- If asked about styling tips, outfit combinations, or fashion advice, provide helpful guidance while referencing available products.
- Keep responses concise but informative — aim for 150-300 words for recommendations.
- Be transparent about the relevance of your suggestions.`;
}

/**
 * Assembles the complete message array for the chat completion call.
 * 
 * @param chatHistory - Previous conversation messages
 * @param userQuery - The latest user message
 * @returns Complete message array ready for the LLM
 */
export function buildMessages(
  chatHistory: Message[],
  userQuery: string
): Message[] {
  const messages: Message[] = [];

  // Include chat history (last 10 messages to stay within context window)
  const recentHistory = chatHistory.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the current user query if not already in history
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userQuery) {
    messages.push({ role: 'user', content: userQuery });
  }

  return messages;
}

// ─── Private Helpers ────────────────────────────────────────────────────────

/**
 * Formats user memory into a system prompt section.
 */
function formatMemoryContext(userMemory: string | null): string {
  if (!userMemory) {
    return `## What You Know About This User
No prior knowledge about this user. Treat them as a new customer and ask questions to understand their preferences.`;
  }

  return `## What You Know About This User
The following are confirmed facts about this user from previous conversations. Use these to personalize your recommendations WITHOUT explicitly repeating them back:

${userMemory}`;
}

/**
 * Formats product search results into a structured text catalog
 * that the LLM can parse and reference.
 */
function formatProductContext(products: ProductSearchResult[]): string {
  if (products.length === 0) return 'No products available.';

  return products
    .map((product, index) => {
      const stockStatus = product.inStock ? '✅ In Stock' : '❌ Out of Stock';
      // Safety net for rating just in case it is missing
      const stars = '⭐'.repeat(Math.round(product.rating || 0)); 
      
      // SAFETY NETS: If colors/sizes/tags exist, join them. Otherwise, print 'N/A'
      const colors = product.colors && product.colors.length > 0 ? product.colors.join(', ') : 'N/A';
      const sizes = product.sizes && product.sizes.length > 0 ? product.sizes.join(', ') : 'N/A';
      const tags = product.tags && product.tags.length > 0 ? product.tags.join(', ') : 'N/A';
      
      // Extract SKU if it exists
      const skuLine = product.sku ? `- **SKU:** ${product.sku}` : '';

      return `### Product ${index + 1}: ${product.name}
${skuLine}
- **Brand:** ${product.brand}
- **Category:** ${product.category} > ${product.subcategory}
- **Price:** $${product.price.toFixed(2)} ${product.currency}
- **Colors:** ${colors}
- **Sizes:** ${sizes}
- **Material:** ${product.material}
- **Gender:** ${product.gender}
- **Tags:** ${tags}
- **Rating:** ${stars} (${product.rating}/5, ${product.reviewCount} reviews)
- **Status:** ${stockStatus}
- **Description:** ${product.description}
- **Relevance Score:** ${(product.score * 100).toFixed(1)}%`;
    })
    .join('\n\n');
}

/**
 * Formats document search results into a structured knowledge base section.
 * For parent-child chunks, uses the parentContent (full table/image data).
 */
function formatDocumentContext(documents: DocumentSearchResult[]): string {
  if (documents.length === 0) return '';

  return documents
    .map((doc, index) => {
      const breadcrumb = doc.headingPath.length > 0
        ? `**Source:** ${doc.headingPath.join(' > ')}`
        : '';
      const filename = `**File:** ${doc.metadata.filename}`;
      
      // For child summaries, show the full parent content (e.g., the actual table)
      const content = doc.parentContent || doc.text;
      
      const typeLabel = doc.metadata.hasTable ? '📊 Table' :
                        doc.metadata.hasImage ? '🖼️ Image' : '📄 Text';

      return `### Document ${index + 1} [${typeLabel}]
${breadcrumb}
${filename}
**Relevance:** ${(doc.score * 100).toFixed(1)}%

${content}`;
    })
    .join('\n\n---\n\n');
}
