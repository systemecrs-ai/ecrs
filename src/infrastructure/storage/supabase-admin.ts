/**
 * Supabase Storage Admin Client
 * 
 * Server-side Supabase client using the SERVICE_ROLE_KEY for
 * privileged storage operations (presigned upload/download URLs).
 * 
 * Used by:
 * - /api/ingest/presign — generates upload URLs for the frontend
 * - Inngest ingestion worker — generates download URLs for file fetching
 * 
 * NEVER expose the service role key to the browser.
 * 
 * @module infrastructure/storage/supabase-admin
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('SupabaseAdmin');

/** Name of the Supabase Storage bucket for ingestion files */
const STORAGE_BUCKET = 'documents';

/** Default signed URL expiry (seconds) — 1 hour */
const SIGNED_URL_EXPIRY_SECONDS = 3600;

// ─── Singleton Client ───────────────────────────────────────────────────────

let _adminClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase admin client using the service role key.
 * Validates required environment variables on first call.
 */
function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[SupabaseAdmin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Both are required for server-side storage operations.'
    );
  }

  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  log.info('Supabase admin client initialized');
  return _adminClient;
}

// ─── Public Helpers ─────────────────────────────────────────────────────────

/**
 * Creates a presigned upload URL for direct browser-to-storage uploads.
 * 
 * @param path - The storage object path (e.g., `ingest/{uuid}/{filename}`)
 * @returns The signed upload URL and the token
 * @throws If the Supabase API returns an error
 */
export async function createPresignedUploadUrl(
  path: string
): Promise<{ signedUrl: string; token: string; path: string }> {
  const client = getAdminClient();

  log.info('Creating presigned upload URL', { path });

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    log.error('Failed to create presigned upload URL', {
      error: error?.message ?? 'No data returned',
      path,
    });
    throw new Error(`Failed to create upload URL: ${error?.message ?? 'Unknown error'}`);
  }

  log.info('Presigned upload URL created', { path });
  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path,
  };
}

/**
 * Creates a signed download URL for server-side file retrieval.
 * Used by the Inngest worker to download files from storage.
 * 
 * @param path - The storage object path
 * @param expiresIn - URL validity in seconds (default: 1 hour)
 * @returns The signed download URL
 */
export async function createSignedDownloadUrl(
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  const client = getAdminClient();

  log.info('Creating signed download URL', { path, expiresIn });

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    log.error('Failed to create signed download URL', {
      error: error?.message ?? 'No data returned',
      path,
    });
    throw new Error(`Failed to create download URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.signedUrl;
}
