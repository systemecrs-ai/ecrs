import 'dotenv/config';
import { generateText, isStepCount } from 'ai';
import { getChatModel } from '../src/infrastructure/nvidia/nvidia-client';
import { agentTools } from '../src/infrastructure/tools';
import { buildSystemPrompt } from '../src/core/prompt-builder';
import { ProductSearchResult, DocumentSearchResult } from '../src/core/types';

async function runTests() {
  console.log('Starting Agentic Prompt Validation Tests...\n');
  const model = getChatModel();
  
  // Mock RAG context to test LLM reasoning and constraints
  const mockProducts: ProductSearchResult[] = [{
    id: 'mock-1', name: 'Premium Cotton T-Shirt', brand: 'StyleCorp', price: 29.99, currency: 'USD',
    category: 'Apparel', subcategory: 'Shirts', description: 'A nice shirt',
    imageUrl: '', inStock: true, score: 0.99, colors: ['Red'], sizes: ['S', 'M', 'L'], material: 'Cotton', gender: 'unisex',
    rating: 4.5, reviewCount: 100, tags: [], sku: 'SKU-999'
  }];

  const mockDocuments: DocumentSearchResult[] = [{
    id: 'mock-doc', text: 'Our holiday grace period allows returns up to 30 days after the new year.', 
    chunkType: 'text', headingPath: [],
    metadata: { filename: 'policy.pdf', chunkId: 0, isChildSummary: false, hasTable: false, hasImage: false },
    score: 0.99
  }];

  const systemPrompt = buildSystemPrompt(mockProducts, mockDocuments, null);

  async function runTest(testName: string, query: string, assertion: (result: any) => void) {
    console.log(`\n--- Running ${testName} ---`);
    console.log(`Query: "${query}"`);
    try {
      const result = await generateText({
        model,
        instructions: systemPrompt,
        messages: [{ role: 'user', content: query }],
        tools: agentTools,
        stopWhen: isStepCount(1), // Only check the immediate model intent
      });
      
      console.log(`Response Text: ${result.text || '(No text)'}`);
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`Tool Calls:`, JSON.stringify(result.toolCalls, null, 2));
      }
      
      assertion(result);
      console.log(`✅ ${testName} PASSED`);
    } catch (error) {
      console.error(`❌ ${testName} FAILED:`, error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }

  // Test A: Parameter Gathering (Missing Size)
  await runTest(
    'Test A (Parameter Gathering)',
    'Check inventory for SKU-999',
    (result) => {
      const hasToolCall = result.toolCalls && result.toolCalls.length > 0;
      const asksForSize = result.text.toLowerCase().includes('size');
      
      if (hasToolCall) {
         const toolCall = result.toolCalls[0];
         console.log(`Note: Model decided to call tool ${toolCall.toolName} directly.`);
         const input = toolCall.input as any;
         if (input.size || input.Size) {
            throw new Error('Model hallucinated a size parameter that was not provided.');
         }
      } else if (!asksForSize) {
         throw new Error('Model did not ask for the missing size parameter or call the tool.');
      }
    }
  );

  // Test B: Tool Execution (Full Parameters)
  await runTest(
    'Test B (Tool Execution)',
    'Check inventory for SKU-999 size L',
    (result) => {
      if (!result.toolCalls || result.toolCalls.length === 0) {
        throw new Error('Model failed to trigger a tool call.');
      }
      const toolCall = result.toolCalls[0];
      if (toolCall.toolName !== 'checkInventory') {
        throw new Error(`Expected checkInventory, got ${toolCall.toolName}`);
      }
      const input = toolCall.input as any;
      const sizeVal = input.size || input.Size;
      if (sizeVal !== 'L') {
        throw new Error(`Model did not extract size correctly. Got: ${sizeVal}`);
      }
    }
  );

  // Test C: RAG Fallback
  await runTest(
    'Test C (RAG Fallback)',
    'What is the holiday grace period?',
    (result) => {
      if (result.toolCalls && result.toolCalls.length > 0) {
        throw new Error('Model incorrectly called a tool for a RAG policy query.');
      }
      const response = result.text.toLowerCase();
      if (!response.includes('30 days') && !response.includes('thirty days')) {
        throw new Error('Model did not use the provided RAG context to answer the question.');
      }
    }
  );
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
