/**
 * MongoDB Client Singleton
 * 
 * Implements the singleton pattern for MongoDB connections.
 * - In development: uses a global variable to survive HMR (Hot Module Replacement)
 * - In production: uses module-level caching
 * 
 * @module infrastructure/database/mongodb-client
 */

import { MongoClient, Db } from 'mongodb';
import { getMongoUri, getMongoDbName } from '@/config/env';
import { createLogger } from '@/lib/logger';
import { DatabaseError } from '@/lib/errors';

const log = createLogger('MongoDBClient');

/**
 * Extend the global type to cache the MongoClient across HMR in development.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/** MongoDB client connection options */
const CLIENT_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
};

/**
 * Returns a cached MongoClient promise.
 * Uses global caching in dev to survive HMR, module caching in prod.
 */
function getClientPromise(): Promise<MongoClient> {
  const uri = getMongoUri();

  if (process.env.NODE_ENV === 'development') {
    // In development, use a global variable to preserve connection across HMR
    if (!global._mongoClientPromise) {
      log.info('Creating new MongoDB client (development mode)');
      const client = new MongoClient(uri, CLIENT_OPTIONS);
      global._mongoClientPromise = client.connect();
      global._mongoClient = client;
    }
    return global._mongoClientPromise;
  }

  // In production, use module-level caching
  if (!clientPromise) {
    log.info('Creating new MongoDB client (production mode)');
    const client = new MongoClient(uri, CLIENT_OPTIONS);
    clientPromise = client.connect();
  }
  return clientPromise;
}

/** Module-level cache for production */
let clientPromise: Promise<MongoClient> | null = null;

/**
 * Returns the connected MongoDB database instance.
 * This is the primary entry point for all database operations.
 * 
 * @example
 * ```ts
 * const db = await getDatabase();
 * const collection = db.collection('products');
 * ```
 * 
 * @throws {DatabaseError} If connection fails
 */
export async function getDatabase(): Promise<Db> {
  try {
    const client = await getClientPromise();
    const dbName = getMongoDbName();
    log.debug('Connected to database', { dbName });
    return client.db(dbName);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to connect to MongoDB', { error: err.message });
    throw new DatabaseError('Failed to connect to MongoDB Atlas', err);
  }
}

/**
 * Returns the raw MongoClient instance (for advanced operations).
 * Prefer `getDatabase()` for standard use cases.
 */
export async function getClient(): Promise<MongoClient> {
  try {
    return await getClientPromise();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to get MongoDB client', { error: err.message });
    throw new DatabaseError('Failed to establish MongoDB client connection', err);
  }
}
