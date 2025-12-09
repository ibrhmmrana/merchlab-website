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
    const filterJson = filter && Object.keys(filter).length > 0 
      ? filter 
      : null;

    // Call the Supabase RPC function (vector store search)
    // Try match_documents_merchlab first, fallback to match_documents if needed
    console.log(`Calling RPC function with topK=${topK}, filter=${JSON.stringify(filterJson)}`);
    
    let rpcResult;
    try {
      // Try match_documents_merchlab first
      const { data, error } = await supabase.rpc('match_documents_merchlab', {
        query_embedding: queryEmbedding,
        match_count: topK,
        filter: filterJson,
      });

      if (error) {
        // If match_documents_merchlab doesn't exist, try match_documents
        console.warn(`match_documents_merchlab failed: ${error.message}, trying match_documents`);
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: topK,
          filter: filterJson,
        });

        if (fallbackError) {
          throw fallbackError;
        }
        rpcResult = fallbackData;
      } else {
        rpcResult = data;
      }
    } catch (rpcError) {
      const errorMessage = rpcError instanceof Error 
        ? rpcError.message 
        : 'Unknown error calling RPC function';
      console.error('Error calling RPC function:', errorMessage);
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
    interface RpcResultRow {
      id?: string;
      content: string;
      metadata?: unknown; // Raw metadata from Supabase (will be validated and cast)
      similarity?: number;
      similarity_score?: number;
    }

    const results: KnowledgeBaseResult[] = rpcResult.map((row: RpcResultRow) => {
      // Extract similarity score (different RPC functions may return it with different field names)
      const rawSimilarity = row.similarity ?? row.similarity_score ?? 0;
      
      // Normalize similarity score to 0-1 range
      const similarityScore = normalizeSimilarityScore(rawSimilarity);
      
      // Extract metadata (ensure it's an object and properly typed)
      const rawMetadata = row.metadata && typeof row.metadata === 'object' 
        ? row.metadata as KnowledgeBaseMetadata
        : ({} as KnowledgeBaseMetadata);

      // Generate source label for easy reference
      const sourceLabel = generateSourceLabel(rawMetadata);

      // Build normalized metadata object
      const metadata: KnowledgeBaseMetadata = {
        file_id: rawMetadata.file_id,
        doc_type: rawMetadata.doc_type,
        title: rawMetadata.title,
        section: rawMetadata.section,
        brand: rawMetadata.brand,
        ...rawMetadata, // Include any other metadata fields
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

