/**
 * Product Repository
 * 
 * Data access layer for product documents, providing vector search
 * and standard CRUD operations via MongoDB Atlas.
 * 
 * @module infrastructure/database/product-repository
 */

import { getDatabase } from './mongodb-client';
import { ProductDocument, ProductSearchDocument, ProductFilter } from './types';
import {
  PRODUCTS_COLLECTION,
  VECTOR_SEARCH_INDEX,
  VECTOR_FIELD_PATH,
  VECTOR_NUM_CANDIDATES,
  VECTOR_SEARCH_LIMIT,
} from '@/config/constants';
import { createLogger } from '@/lib/logger';
import { DatabaseError } from '@/lib/errors';
import { Document } from 'mongodb';

const log = createLogger('ProductRepository');

/**
 * Performs a vector similarity search on the products collection
 * using MongoDB Atlas $vectorSearch aggregation stage.
 * 
 * @param queryEmbedding - The embedding vector of the user's query
 * @param limit - Maximum number of results to return (default: 10)
 * @param filter - Optional pre-filter criteria to narrow search space
 * @returns Array of products ranked by similarity score
 * 
 * @throws {DatabaseError} If the aggregation pipeline fails
 */
export async function vectorSearch(
  queryEmbedding: number[],
  limit: number = VECTOR_SEARCH_LIMIT,
  filter?: ProductFilter
): Promise<ProductSearchDocument[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection<ProductDocument>(PRODUCTS_COLLECTION);

    log.info('Executing vector search', {
      embeddingLength: queryEmbedding.length,
      limit,
      hasFilter: !!filter,
    });

    // Build the $vectorSearch stage
    const vectorSearchStage: Document = {
      $vectorSearch: {
        index: VECTOR_SEARCH_INDEX,
        path: VECTOR_FIELD_PATH,
        queryVector: queryEmbedding,
        numCandidates: VECTOR_NUM_CANDIDATES,
        limit,
      },
    };

    // Add pre-filter if provided
    if (filter) {
      const filterConditions = buildFilterConditions(filter);
      if (Object.keys(filterConditions).length > 0) {
        vectorSearchStage.$vectorSearch.filter = filterConditions;
      }
    }

    // Aggregation pipeline: vectorSearch → project (exclude embedding, include score)
    const pipeline: Document[] = [
      vectorSearchStage,
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          category: 1,
          subcategory: 1,
          brand: 1,
          price: 1,
          currency: 1,
          colors: 1,
          sizes: 1,
          material: 1,
          gender: 1,
          imageUrl: 1,
          inStock: 1,
          rating: 1,
          reviewCount: 1,
          tags: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate<ProductSearchDocument>(pipeline).toArray();

    log.info('Vector search completed', {
      resultCount: results.length,
      topScore: results[0]?.score ?? 0,
    });

    return results;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Vector search failed', { error: err.message });
    throw new DatabaseError(`Vector search failed: ${err.message}`, err);
  }
}

/**
 * Retrieves a single product by its string ID.
 * 
 * @param id - The product's MongoDB ObjectId as a string
 * @returns The product document or null if not found
 */
export async function getProductById(
  id: string
): Promise<ProductDocument | null> {
  try {
    const { ObjectId } = await import('mongodb');
    const db = await getDatabase();
    const collection = db.collection<ProductDocument>(PRODUCTS_COLLECTION);
    return await collection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to fetch product by ID', { id, error: err.message });
    throw new DatabaseError(`Failed to fetch product: ${err.message}`, err);
  }
}

/**
 * Returns the total count of products in the collection.
 */
export async function getProductCount(): Promise<number> {
  const db = await getDatabase();
  const collection = db.collection<ProductDocument>(PRODUCTS_COLLECTION);
  return collection.countDocuments();
}

// ─── Private Helpers ────────────────────────────────────────────────────────

/**
 * Constructs a MongoDB filter document from a ProductFilter.
 * Used for pre-filtering in $vectorSearch.
 */
function buildFilterConditions(filter: ProductFilter): Document {
  const conditions: Document = {};

  if (filter.category) conditions.category = filter.category;
  if (filter.subcategory) conditions.subcategory = filter.subcategory;
  if (filter.gender) conditions.gender = filter.gender;
  if (filter.brand) conditions.brand = filter.brand;
  if (filter.inStock !== undefined) conditions.inStock = filter.inStock;

  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    conditions.price = {};
    if (filter.minPrice !== undefined) conditions.price.$gte = filter.minPrice;
    if (filter.maxPrice !== undefined) conditions.price.$lte = filter.maxPrice;
  }

  return conditions;
}
