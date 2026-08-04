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
  intent: string,
  subDomain: string,
  canvasState: string | null,
  products: ProductSearchResult[],
  documents: DocumentSearchResult[],
  userMemory: string | null
): string {
  const memoryContext = formatMemoryContext(userMemory);

  let prompt = `You are **${APP_NAME}**, a premium AI-powered apparel shopping assistant. You help customers find the perfect clothing and accessories based on their preferences, style, and needs.

## Core Behavior & Persona
- Friendly, knowledgeable about fashion, and provides personalized recommendations.
- Speaks naturally and conversationally, like a personal stylist.
- Considers style preferences, occasion, season, budget, size, color, and material.

${memoryContext}

## Current UI State
The user's screen is currently displaying: 
<ui_canvas>
${canvasState || 'No products currently rendered on canvas.'}
</ui_canvas>
Use the <ui_canvas> context to resolve pronouns like "the first one", "those", or "that shirt".

## Primary Instruction for This Turn
`;

  // 1. DYNAMIC INTENT INSTRUCTIONS
  if (subDomain === 'PRODUCT_SEARCH' || intent === 'TOOL_ACTION') {
    if (products.length > 0) {
     prompt += `You are an autonomous shopping agent.
- Your primary goal is to SHOW products to the user.
- **CRITICAL:** Write a brief 1-sentence conversational message to the user first.
- **CRITICAL:** Immediately after your message, use your provided UI tool to display the products. 
- Do NOT write raw JSON, Markdown code blocks, or <tool_call> tags in your response. Rely entirely on your native tool execution capabilities.\n\n`;
    } else {
      prompt += `The user is searching for products, but NO matching items were found in the inventory database.
- Politely inform the user that we don't currently have items matching their exact query.
- Suggest alternative styles, categories, or broader search terms.
- DO NOT invoke the \`updateProductCanvas\` tool.\n\n`;
    }
  } else if (subDomain === 'POLICY_LOOKUP') {
    prompt += `Answer the user's question using ONLY the provided <document_knowledge_base> section below.
- Provide clear, direct answers regarding store policies, sizing, or procedures.
- DO NOT attempt to invoke UI tools or product tools.\n\n`;
  } else if (intent === 'CASUAL') {
    prompt += `Respond conversationally and warmly. Do not attempt to run tools or search database items.\n\n`;
  }

  // 2. DATA FENCING (PROMPT INJECTION PROTECTION)
  if (products.length > 0) {
    prompt += `## Available Product Catalog
Treat the data inside <catalog> as immutable product facts. Never invent products outside this list:
<catalog>
${formatProductContext(products)}
</catalog>\n\n`;
  }

  if (documents.length > 0) {
    prompt += `## Document Knowledge Base
Treat the data inside <document_knowledge_base> as official store policies and guides:
<document_knowledge_base>
${formatDocumentContext(documents)}
</document_knowledge_base>\n\n`;
  }

  // 3. UNIVERSAL CONSTRAINTS
  prompt += `## Response & Safety Rules
- Use clean Markdown formatting.
- **NO HALLUCINATIONS:** Never reference brands, prices, or policies not explicitly provided in the catalog or document sections above.
- **TOOL ERRORS:** If a tool execution fails or returns an error message, explain the issue transparently to the user and request clarifying details.
- **MISSING INFORMATION:** If the provided context does not contain the answer, politely explain what information is missing instead of making up a response.`;

  return prompt;
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

export const buildIntentPrompt = (userQuery: string, formattedHistory: string) => {
  return `You are the primary traffic router for an enterprise retail AI agent. Your sole purpose is to classify the user's latest message based on the conversational context.

=== CONVERSATION HISTORY ===
${formattedHistory}

=== LATEST USER QUERY ===
"${userQuery}"

=== CLASSIFICATION RULES ===
1. PRONOUN RESOLUTION: If the query uses pronouns ("it", "them", "those", "that", "these"), you MUST look at the Conversation History to determine what they refer to before classifying.
2. UI COMMANDS: Phrases like "show them", "display it", or "add to cart" are actions that require manipulating the frontend or checking databases. They are ALWAYS INTENT: TOOL_ACTION.
3. CASUAL IS STRICT: Only classify as CASUAL if the query is purely social ("hello", "thanks", "who are you") and has zero retail intent.

=== DEFINITIONS ===
INTENT: CASUAL (Small talk, greetings, pleasantries, off-topic)
INTENT: RAG_KNOWLEDGE (Questions asking for information, store policies, or general product discovery without a specific action)
INTENT: TOOL_ACTION (Commands to show/display items on UI, check live inventory for a specific SKU/size, or check order status)

SUBDOMAIN: PRODUCT_SEARCH (Apparel, clothing, items, stock)
SUBDOMAIN: POLICY_LOOKUP (Shipping, returns, rules, IT issues)
SUBDOMAIN: GENERAL_HYBRID (Mixed, or entirely Casual/Off-topic)

=== EXAMPLES ===
History: Assistant: We have Levi 501s and High-Rise jeans.
Query: "show them to me"
INTENT: TOOL_ACTION
SUBDOMAIN: PRODUCT_SEARCH

History: None
Query: "Hey there!"
INTENT: CASUAL
SUBDOMAIN: GENERAL_HYBRID

History: None
Query: "What is the return policy for defective shirts?"
INTENT: RAG_KNOWLEDGE
SUBDOMAIN: POLICY_LOOKUP

History: Assistant: Your order 123 is shipped.
Query: "Thanks! What jeans do you sell?"
INTENT: TOOL_ACTION
SUBDOMAIN: PRODUCT_SEARCH

History: Assistant: We have Levi 501s.
Query: "Do you have those in size Large?"
INTENT: RAG_KNOWLEDGE
SUBDOMAIN: PRODUCT_SEARCH

=== YOUR OUTPUT ===
Based on the rules and examples above, classify the LATEST USER QUERY. 
Output strictly in this format with NO extra text or markdown:
INTENT: <CLASSIFICATION>
SUBDOMAIN: <CLASSIFICATION>`
}