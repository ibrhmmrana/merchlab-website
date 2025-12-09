import OpenAI from 'openai';
import { getSupabaseAdmin } from '../supabaseAdmin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Filter options for knowledge base search
 */
export interface KnowledgeBaseFilter {
  doc_type?: string;
  brand?: string;
  file_id?: string;
  [key: string]: string | undefined;
}

/**
 * Metadata structure for knowledge base chunks
 * This matches the metadata JSONB column in the Supabase table
 */
export interface KnowledgeBaseMetadata {
  file_id?: string;
  doc_type?: string;
  title?: string;
  section?: string;
  brand?: string;
  [key: string]: unknown;
}

/**
 * Result from a knowledge base search
 */
export interface KnowledgeBaseResult {
  content: string;
  metadata: KnowledgeBaseMetadata;
  similarityScore: number; // Normalized to 0-1 range
  sourceLabel: string; // Human-readable source identifier (e.g., "Terms & Conditions - Section 3")
}

/**
 * Search result response
 */
export interface KnowledgeBaseSearchResponse {
  results: KnowledgeBaseResult[];
  error?: string;
}

/**
 * Maximum query length before truncation (to prevent extremely long queries)
 * OpenAI embeddings have token limits, so we cap at a reasonable character count
 */
const MAX_QUERY_LENGTH = 2000;

/**
 * Normalize similarity score to 0-1 range
 * Some RPC functions may return scores outside this range (e.g., cosine similarity can be -1 to 1)
 */
function normalizeSimilarityScore(score: number | undefined | null): number {
  if (typeof score !== 'number' || isNaN(score)) {
    return 0;
  }
  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, score));
}

/**
 * Generate a human-readable source label from metadata
 * Combines title and section for easy reference (e.g., "Terms & Conditions - Section 3")
 */
function generateSourceLabel(metadata: KnowledgeBaseMetadata): string {
  const parts: string[] = [];
  
  if (metadata.title && typeof metadata.title === 'string') {
    parts.push(metadata.title);
  }
  
  if (metadata.section && typeof metadata.section === 'string') {
    parts.push(metadata.section);
  }
  
  if (metadata.doc_type && typeof metadata.doc_type === 'string') {
    // Only add doc_type if we don't already have a title
    if (parts.length === 0) {
      // Format doc_type nicely (e.g., "privacy_policy" -> "Privacy Policy")
      const formatted = metadata.doc_type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      parts.push(formatted);
    }
  }
  
  return parts.length > 0 ? parts.join(' - ') : 'Knowledge Base';
}

/**
 * Search the MerchLab knowledge base using semantic search
 * 
 * Control flow: query → validate & normalize → embed → Supabase RPC → normalize results → return
 * 
 * @param query - The user's question/search query
 * @param topK - Number of chunks to return (default: 5)
 * @param filter - Optional filter object (e.g. { doc_type: 'terms', brand: 'merchlab' })
 * @returns Array of knowledge base results with content, metadata, similarity scores, and source labels
 */
export async function searchKnowledgeBase(
  query: string,
  topK: number = 5,
  filter?: KnowledgeBaseFilter
): Promise<KnowledgeBaseSearchResponse> {
  try {
    // Step 1: Validate and normalize query input
    // Safeguard: Skip Supabase call if query is empty or just whitespace
    if (!query || typeof query !== 'string') {
      return {
        results: [],
        error: 'Query is required and must be a non-empty string',
      };
    }
    
    // Trim whitespace and check if empty after trimming
    const trimmedQuery = query.trim();
    if (trimmedQuery === '') {
      return {
        results: [],
        error: 'Query cannot be empty or just whitespace',
      };
    }
    
    // Safeguard: Truncate extremely long queries before embedding
    // This prevents API errors and reduces costs for malformed inputs
    const normalizedQuery = trimmedQuery.length > MAX_QUERY_LENGTH
      ? trimmedQuery.substring(0, MAX_QUERY_LENGTH)
      : trimmedQuery;
    
    if (trimmedQuery.length > MAX_QUERY_LENGTH) {
      console.warn(`Query truncated from ${trimmedQuery.length} to ${MAX_QUERY_LENGTH} characters`);
    }

    // Validate topK parameter
    if (topK < 1 || topK > 50) {
      console.warn(`topK value ${topK} is out of range, using default of 5`);
      topK = 5;
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return {
        results: [],
        error: 'OpenAI API key is not configured',
      };
    }

    // Step 2: Generate embedding for the query
    // Use the same model that was used for ingestion (configurable via env var)
    const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    console.log(`Generating embedding for query: "${normalizedQuery.substring(0, 50)}..." using model: ${embeddingModel}`);
    let queryEmbedding: number[];
    
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: embeddingModel,
        input: normalizedQuery, // Use normalized (trimmed and truncated) query
      });

      if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
        throw new Error('No embedding data returned from OpenAI');
      }

      queryEmbedding = embeddingResponse.data[0].embedding;
      console.log(`Generated embedding with dimension: ${queryEmbedding.length}`);
    } catch (embeddingError) {
      const errorMessage = embeddingError instanceof Error 
        ? embeddingError.message 
        : 'Unknown error generating embedding';
      console.error('Error generating embedding:', errorMessage);
      return {
        results: [],
        error: `Failed to generate embedding: ${errorMessage}`,
      };
    }

    // Step 3: Get Supabase client and call RPC function
    let supabase;
    try {
      supabase = getSupabaseAdmin();
      // Log Supabase URL for debugging (without exposing full key)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'unknown';
      console.log(`Using Supabase URL: ${supabaseUrl}`);
      console.log(`Using service role key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'yes' : 'no (falling back to anon key)'}`);
    } catch (supabaseError) {
      const errorMessage = supabaseError instanceof Error 
        ? supabaseError.message 
        : 'Unknown error connecting to Supabase';
      console.error('Error connecting to Supabase:', errorMessage);
      return {
        results: [],
        error: `Failed to connect to Supabase: ${errorMessage}`,
      };
    }

    // Prepare filter for RPC call
    // The filter should be a JSONB object that can be used in the SQL function
    // Use empty object {} instead of null to match the function's default parameter
    const filterJson: KnowledgeBaseFilter = filter && Object.keys(filter).length > 0 
      ? filter 
      : {};

    // Call the Supabase RPC function (vector store search)
    // Try match_documents_merchlab first, fallback to match_documents if needed
    console.log(`Calling RPC function with topK=${topK}, filter=${JSON.stringify(filterJson)}`);
    
    let rpcResult;
    try {
      // Try match_documents_merchlab first
      // Function signature: match_documents_merchlab(query_embedding, match_count, filter)
      const { data, error } = await supabase.rpc('match_documents_merchlab', {
        query_embedding: queryEmbedding,
        match_count: topK,
        filter: filterJson,
      });

      if (error) {
        // Log full error details for debugging
        console.error('match_documents_merchlab RPC error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status: error.status,
        });
        
        // If match_documents_merchlab doesn't exist, try match_documents
        console.warn(`match_documents_merchlab failed: ${error.message}, trying match_documents`);
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: topK,
          filter: filterJson,
        });

        if (fallbackError) {
          console.error('match_documents fallback RPC error details:', {
            message: fallbackError.message,
            code: fallbackError.code,
            details: fallbackError.details,
            hint: fallbackError.hint,
            status: fallbackError.status,
          });
          throw fallbackError;
        }
        rpcResult = fallbackData;
      } else {
        rpcResult = data;
      }
    } catch (rpcError) {
      // Enhanced error logging with full Supabase error details
      let errorMessage = 'Unknown error calling RPC function';
      let errorDetails: Record<string, unknown> = {};
      
      if (rpcError && typeof rpcError === 'object') {
        // Check if it's a Supabase error object
        if ('message' in rpcError) {
          errorMessage = String(rpcError.message);
        }
        if ('code' in rpcError) {
          errorDetails.code = rpcError.code;
        }
        if ('details' in rpcError) {
          errorDetails.details = rpcError.details;
        }
        if ('hint' in rpcError) {
          errorDetails.hint = rpcError.hint;
        }
        if ('status' in rpcError) {
          errorDetails.status = rpcError.status;
        }
      } else if (rpcError instanceof Error) {
        errorMessage = rpcError.message;
      }
      
      console.error('Error calling RPC function - full details:', {
        errorMessage,
        ...errorDetails,
        rpcError: rpcError,
      });
      
      return {
        results: [],
        error: `Failed to search knowledge base: ${errorMessage}. Please ensure the RPC function match_documents_merchlab exists in your Supabase database.`,
      };
    }

    // Step 4: Normalize and transform results
    if (!rpcResult || !Array.isArray(rpcResult)) {
      console.warn('RPC function returned invalid data:', rpcResult);
      return {
        results: [],
        error: 'Invalid response from knowledge base search',
      };
    }

    // Type for raw RPC result row from Supabase
    // The metadata field comes as unknown from Supabase and must be validated and cast
    interface RpcResultRow {
      id?: string;
      content: string;
      metadata?: unknown; // Raw metadata from Supabase JSONB column (will be validated and cast to KnowledgeBaseMetadata)
      similarity?: number;
      similarity_score?: number;
    }

    const results: KnowledgeBaseResult[] = rpcResult.map((row: RpcResultRow): KnowledgeBaseResult => {
      // Extract similarity score (different RPC functions may return it with different field names)
      const rawSimilarity: number | undefined = row.similarity ?? row.similarity_score ?? 0;
      
      // Normalize similarity score to 0-1 range
      const similarityScore: number = normalizeSimilarityScore(rawSimilarity);
      
      // Extract and validate metadata (ensure it's an object and properly typed)
      // Cast from unknown to KnowledgeBaseMetadata after type guard check
      let rawMetadata: KnowledgeBaseMetadata;
      if (row.metadata && typeof row.metadata === 'object' && row.metadata !== null) {
        // Type assertion: we've verified it's an object, now cast to our metadata type
        rawMetadata = row.metadata as KnowledgeBaseMetadata;
      } else {
        // Default to empty metadata object if missing or invalid
        rawMetadata = {} as KnowledgeBaseMetadata;
      }

      // Generate source label for easy reference
      const sourceLabel: string = generateSourceLabel(rawMetadata);

      // Build normalized metadata object with explicit type
      const metadata: KnowledgeBaseMetadata = {
        file_id: rawMetadata.file_id,
        doc_type: rawMetadata.doc_type,
        title: rawMetadata.title,
        section: rawMetadata.section,
        brand: rawMetadata.brand,
        ...rawMetadata, // Include any other metadata fields from the spread
      };

      return {
        content: row.content || '',
        metadata,
        similarityScore, // Normalized to 0-1 range
        sourceLabel, // Human-readable source identifier
      };
    });

    console.log(`Knowledge base search returned ${results.length} results`);
    return { results };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during knowledge base search';
    console.error('Unexpected error in searchKnowledgeBase:', errorMessage);
    return {
      results: [],
      error: `Unexpected error: ${errorMessage}`,
    };
  }
}

