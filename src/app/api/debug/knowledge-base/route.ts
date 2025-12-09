import { NextRequest, NextResponse } from 'next/server';
import { searchKnowledgeBase } from '@/lib/whatsapp/knowledgeBase';

export const runtime = 'nodejs';

/**
 * DEV-ONLY: Test endpoint for knowledge base vector search
 * 
 * This endpoint is for development/testing only and should NOT be exposed in production.
 * It allows direct testing of the knowledge base search function with hard-coded queries.
 * 
 * GET /api/debug/knowledge-base?query=YOUR_QUERY&topK=5&doc_type=terms_conditions
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
    const query = searchParams.get('query');
    const topKParam = searchParams.get('topK');
    const docType = searchParams.get('doc_type');

    // Default test query if none provided
    const testQuery = query || 'What is your refund policy?';
    const topK = topKParam ? parseInt(topKParam, 10) : 5;
    const filter = docType ? { doc_type: docType } : undefined;

    console.log('=== Knowledge Base Search Test ===');
    console.log(`Query: "${testQuery}"`);
    console.log(`topK: ${topK}`);
    console.log(`Filter: ${JSON.stringify(filter)}`);
    console.log('---');

    // Call the search function
    const result = await searchKnowledgeBase(testQuery, topK, filter);

    // Log results to console for easy debugging
    console.log(`Results: ${result.results.length} found`);
    if (result.error) {
      console.error(`Error: ${result.error}`);
    } else {
      result.results.forEach((r, i) => {
        console.log(`\n[Result ${i + 1}]`);
        console.log(`Source: ${r.sourceLabel}`);
        console.log(`Similarity: ${(r.similarityScore * 100).toFixed(2)}%`);
        console.log(`Content: ${r.content.substring(0, 200)}${r.content.length > 200 ? '...' : ''}`);
        console.log(`Metadata:`, JSON.stringify(r.metadata, null, 2));
      });
    }
    console.log('=== End Test ===\n');

    // Return JSON response
    return NextResponse.json({
      success: !result.error,
      query: testQuery,
      topK,
      filter,
      result,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Knowledge base test error:', errorMessage);
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

/**
 * POST endpoint for testing with JSON body
 * POST /api/debug/knowledge-base
 * Body: { "query": "your question", "topK": 5, "doc_type": "terms_conditions" }
 */
export async function POST(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { query, topK, doc_type } = body;

    const testQuery = query || 'What is your refund policy?';
    const testTopK = topK || 5;
    const filter = doc_type ? { doc_type } : undefined;

    console.log('=== Knowledge Base Search Test (POST) ===');
    console.log(`Query: "${testQuery}"`);
    console.log(`topK: ${testTopK}`);
    console.log(`Filter: ${JSON.stringify(filter)}`);
    console.log('---');

    const result = await searchKnowledgeBase(testQuery, testTopK, filter);

    console.log(`Results: ${result.results.length} found`);
    if (result.error) {
      console.error(`Error: ${result.error}`);
    } else {
      result.results.forEach((r, i) => {
        console.log(`\n[Result ${i + 1}]`);
        console.log(`Source: ${r.sourceLabel}`);
        console.log(`Similarity: ${(r.similarityScore * 100).toFixed(2)}%`);
        console.log(`Content: ${r.content.substring(0, 200)}${r.content.length > 200 ? '...' : ''}`);
      });
    }
    console.log('=== End Test ===\n');

    return NextResponse.json({
      success: !result.error,
      query: testQuery,
      topK: testTopK,
      filter,
      result,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Knowledge base test error:', errorMessage);
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

