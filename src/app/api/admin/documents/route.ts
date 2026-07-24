import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminDocumentsAPI');

/** Name of the Supabase Storage bucket for ingestion files */
const STORAGE_BUCKET = 'documents';

/**
 * Returns a Supabase admin client for storage operations.
 */
function getAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[AdminDocumentsAPI] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/admin/documents
 * Lists all files stored in the Supabase Storage `documents` bucket.
 * Returns file metadata including name, size, and creation timestamp.
 */
export async function GET() {
  try {
    const client = getAdminClient();

    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      log.error('Failed to list storage files', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to list storage files' },
        { status: 500 }
      );
    }

    // The Supabase list can return folder entries — filter to files only
    // and recursively list subdirectories
    const allFiles: any[] = [];

    for (const item of data || []) {
      if (item.id) {
        // It's a file
        allFiles.push({
          name: item.name,
          size: item.metadata?.size ?? 0,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          mimeType: item.metadata?.mimetype ?? 'unknown',
        });
      } else {
        // It's a folder — list its contents
        const { data: folderData } = await client.storage
          .from(STORAGE_BUCKET)
          .list(item.name, {
            limit: 200,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (folderData) {
          for (const file of folderData) {
            if (file.id) {
              allFiles.push({
                name: `${item.name}/${file.name}`,
                size: file.metadata?.size ?? 0,
                createdAt: file.created_at,
                updatedAt: file.updated_at,
                mimeType: file.metadata?.mimetype ?? 'unknown',
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ files: allFiles });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to list documents', { error: err.message });
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}
