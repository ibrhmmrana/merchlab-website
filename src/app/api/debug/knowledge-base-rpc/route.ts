import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * DEV-ONLY: Direct RPC function test endpoint
 * 
 * This endpoint directly calls the Supabase RPC function to test it without going through
 * the knowledge base wrapper. Useful for debugging RPC function issues.
 * 
 * GET /api/debug/knowledge-base-rpc?query=YOUR_QUERY&topK=3
 */
export async function GET(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || 'What is your refund policy?';
    const topK = parseInt(searchParams.get('topK') || '3', 10);

    console.log('=== Direct RPC Function Test ===');
    console.log(`Query: "${query}"`);
    console.log(`topK: ${topK}`);
    
    // Get Supabase client
    const supabase = getSupabaseAdmin();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'unknown';
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Using service role key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'yes' : 'no (using anon key)'}`);

    // Generate embedding
    const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    console.log(`Generating embedding using model: ${embeddingModel}`);
    
    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: query,
    });

    if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate embedding',
      }, { status: 500 });
    }

    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`Generated embedding with dimension: ${queryEmbedding.length}`);

    // Call RPC function directly
    const filter = {};
    console.log(`Calling RPC with: { query_embedding: [${queryEmbedding.length} dims], match_count: ${topK}, filter: {} }`);
    
    const { data, error } = await supabase.rpc('match_documents_merchlab', {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter: filter,
    });

    // Log full error details if present
    if (error) {
      console.error('RPC Error - Full Details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    } else {
      console.log(`RPC Success: Received ${Array.isArray(data) ? data.length : 'non-array'} result(s)`);
      if (Array.isArray(data) && data.length > 0) {
        console.log('Sample result structure:', JSON.stringify(data[0], null, 2));
      }
    }

    return NextResponse.json({
      success: !error,
      query,
      topK,
      embeddingDimension: queryEmbedding.length,
      supabaseUrl,
      usingServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      rpcCall: {
        functionName: 'match_documents_merchlab',
        parameters: {
          query_embedding: `[vector of ${queryEmbedding.length} dimensions]`,
          match_count: topK,
          filter: filter,
        },
      },
      result: {
        data: data,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        } : null,
      },
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Direct RPC test error:', errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

