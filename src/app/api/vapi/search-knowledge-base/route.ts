import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { searchKnowledgeBase } from '@/lib/whatsapp/knowledgeBase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/search-knowledge-base
 * Search MerchLab knowledge base
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    // Parse request body
    const body = await request.json();
    const { caller_phone, query, topK, doc_type } = body;

    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        errorResponse(
          'Search query is required',
          'Please provide a search query or question'
        ),
        { status: 400 }
      );
    }

    // Validate topK if provided
    const validatedTopK = topK && typeof topK === 'number' && topK > 0 && topK <= 50
      ? Math.floor(topK)
      : 5;

    // Build filter if doc_type provided
    const filter = doc_type && typeof doc_type === 'string' && doc_type.trim() !== ''
      ? { doc_type: doc_type.trim() }
      : undefined;

    // Search knowledge base
    const searchResult = await searchKnowledgeBase(query.trim(), validatedTopK, filter);

    if (searchResult.error) {
      return NextResponse.json(
        errorResponse(
          'An error occurred while searching the knowledge base',
          'Please try again or contact support'
        ),
        { status: 500 }
      );
    }

    if (searchResult.results.length === 0) {
      return NextResponse.json(
        errorResponse(
          'No relevant information found in our knowledge base',
          'Please contact support for more specific information'
        ),
        { status: 404 }
      );
    }

    // Build spoken summary from first result
    const firstResult = searchResult.results[0];
    let spoken_summary = firstResult.content.substring(0, 200);
    if (firstResult.content.length > 200) {
      spoken_summary += '...';
    }
    spoken_summary += ' Would you like me to send the full document to your WhatsApp?';

    // Build response data
    const responseData = {
      results: searchResult.results.map(result => ({
        content: result.content,
        metadata: result.metadata,
        similarity_score: result.similarityScore,
        source_label: result.sourceLabel,
      })),
      result_count: searchResult.results.length,
    };

    return NextResponse.json(successResponse(responseData, spoken_summary));
  } catch (error) {
    console.error('Error in search-knowledge-base:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while searching the knowledge base',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
