import { createClient } from '@supabase/supabase-js';

// Ensure we have the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a product image to the 'Products' bucket on Supabase.
 * Uses a timestamp-prefixed filename to ensure uniqueness.
 *
 * @param file The File object to upload
 * @returns The public URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Create a unique filename
  const timestamp = Date.now();
  // Replace spaces and special chars to keep it clean
  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const fileName = `${timestamp}-${cleanName}`;

  const { data, error } = await supabaseClient.storage
    .from('Products')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabaseClient.storage
    .from('Products')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
