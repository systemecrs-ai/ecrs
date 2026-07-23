/**
 * Environment Configuration
 * 
 * Centralized, validated access to all environment variables.
 * Throws descriptive errors at startup if required vars are missing.
 * 
 * @module config/env
 */

interface EnvConfig {
  MONGODB_URI: string;
  MONGODB_DB_NAME: string;
  NVIDIA_API_KEY: string;
  NVIDIA_BASE_URL: string;
  NVIDIA_CHAT_MODEL: string;
  NVIDIA_EMBED_MODEL: string;
  NVIDIA_SUMMARIZATION_MODEL: string;
  LLAMA_CLOUD_API_KEY: string;
  BLOB_READ_WRITE_TOKEN: string;
  NODE_ENV: string;
  LANGFUSE_SECRET_KEY: string;
  LANGFUSE_PUBLIC_KEY: string;
  LANGFUSE_BASE_URL: string;
}

/**
 * Retrieves and validates a required environment variable.
 * @throws {Error} If the variable is not set or is empty.
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[ENV] Missing required environment variable: ${key}. ` +
      `Please add it to your .env.local file. See .env.example for reference.`
    );
  }
  return value.trim();
}

/**
 * Retrieves an optional environment variable with a default fallback.
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

/**
 * Lazily-cached configuration singleton.
 * Only validates on first access, then returns cached values.
 */
let _cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (_cachedConfig) return _cachedConfig;

  _cachedConfig = {
    MONGODB_URI: getRequiredEnv('MONGODB_URI'),
    MONGODB_DB_NAME: getOptionalEnv('MONGODB_DB_NAME', 'ecrs_apparel'),
    NVIDIA_API_KEY: getRequiredEnv('NVIDIA_API_KEY'),
    NVIDIA_BASE_URL: getOptionalEnv(
      'NVIDIA_BASE_URL',
      'https://integrate.api.nvidia.com/v1'
    ),
    NVIDIA_CHAT_MODEL: getOptionalEnv(
      'NVIDIA_CHAT_MODEL',
      'nvidia/nemotron-3-ultra-550b-a55b'
    ),
    NVIDIA_EMBED_MODEL: getOptionalEnv(
      'NVIDIA_EMBED_MODEL',
      'nvidia/llama-nemotron-embed-1b-v2'
    ),
    NVIDIA_SUMMARIZATION_MODEL: getOptionalEnv(
      'NVIDIA_SUMMARIZATION_MODEL',
      'meta/llama-3.1-8b-instruct'
    ),
    LLAMA_CLOUD_API_KEY: getRequiredEnv('LLAMA_CLOUD_API_KEY'),
    BLOB_READ_WRITE_TOKEN: getOptionalEnv('BLOB_READ_WRITE_TOKEN', ''),
    NODE_ENV: getOptionalEnv('NODE_ENV', 'development'),
    LANGFUSE_SECRET_KEY: getOptionalEnv('LANGFUSE_SECRET_KEY', ''),
    LANGFUSE_PUBLIC_KEY: getOptionalEnv('LANGFUSE_PUBLIC_KEY', ''),
    LANGFUSE_BASE_URL: getOptionalEnv('LANGFUSE_BASE_URL', 'https://cloud.langfuse.com'),
  };

  return _cachedConfig;
}

// ─── Typed Accessors ─────────────────────────────────────────────────────────

export const getMongoUri = () => getEnvConfig().MONGODB_URI;
export const getMongoDbName = () => getEnvConfig().MONGODB_DB_NAME;
export const getNvidiaApiKey = () => getEnvConfig().NVIDIA_API_KEY;
export const getNvidiaBaseUrl = () => getEnvConfig().NVIDIA_BASE_URL;
export const getNvidiaChatModel = () => getEnvConfig().NVIDIA_CHAT_MODEL;
export const getNvidiaEmbedModel = () => getEnvConfig().NVIDIA_EMBED_MODEL;
export const getNvidiaSummarizationModel = () => getEnvConfig().NVIDIA_SUMMARIZATION_MODEL;
export const getLlamaCloudApiKey = () => getEnvConfig().LLAMA_CLOUD_API_KEY;
export const getBlobReadWriteToken = () => getEnvConfig().BLOB_READ_WRITE_TOKEN;
export const isDevelopment = () => getEnvConfig().NODE_ENV === 'development';
export const getLangfuseSecretKey = () => getEnvConfig().LANGFUSE_SECRET_KEY;
export const getLangfusePublicKey = () => getEnvConfig().LANGFUSE_PUBLIC_KEY;
export const getLangfuseBaseUrl = () => getEnvConfig().LANGFUSE_BASE_URL;
export const isLangfuseEnabled = () => !!getEnvConfig().LANGFUSE_SECRET_KEY && !!getEnvConfig().LANGFUSE_PUBLIC_KEY;
