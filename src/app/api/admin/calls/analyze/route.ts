import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CallRating = 'WON' | 'NEXT_STEP' | 'LOST' | 'NO_RESULT';

interface AnalysisResult {
  rating: CallRating;
  reason: string;
}

async function analyzeCallTranscript(transcript: string): Promise<AnalysisResult> {
  const prompt = `Analyze the following call transcript and determine the outcome. Return ONLY a JSON object with "rating" and "reason" fields.

Rating options:
- WON: customer clearly agreed to proceed (pay / place order / "yes send the link")
- NEXT_STEP: not a yes, but a clear next action is set (call back at a time, resend quote, decision by X time)
- LOST: clear no / not interested / wrong person / don't contact again
- NO_RESULT: none of the above (vague, ended early, unreachable, unclear)

The reason should be a brief explanation (1-2 sentences) explaining why this rating was chosen.

Transcript:
${transcript}

Return only valid JSON in this format:
{
  "rating": "WON" | "NEXT_STEP" | "LOST" | "NO_RESULT",
  "reason": "brief explanation"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a call analysis assistant. Always return valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const result = JSON.parse(content) as AnalysisResult;
    
    // Validate rating
    if (!['WON', 'NEXT_STEP', 'LOST', 'NO_RESULT'].includes(result.rating)) {
      throw new Error(`Invalid rating: ${result.rating}`);
    }

    return result;
  } catch (error) {
    console.error('Error analyzing call transcript:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { callId } = await request.json();

    if (!callId || typeof callId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid callId' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if rating already exists
    const { data: existingCall, error: fetchError } = await supabase
      .from('call_records')
      .select('id, transcript, rating')
      .eq('id', callId)
      .single();

    if (fetchError) {
      console.error('Error fetching call:', fetchError);
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404, headers: noIndexHeaders() }
      );
    }

    if (existingCall.rating) {
      // Rating already exists, return it
      const { data: callWithRating } = await supabase
        .from('call_records')
        .select('rating, rating_reason')
        .eq('id', callId)
        .single();

      return NextResponse.json(
        {
          rating: callWithRating?.rating,
          reason: callWithRating?.rating_reason,
        },
        { headers: noIndexHeaders() }
      );
    }

    if (!existingCall.transcript) {
      return NextResponse.json(
        { error: 'No transcript available for analysis' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    // Analyze the transcript
    const analysis = await analyzeCallTranscript(existingCall.transcript);

    // Save to database
    const { error: updateError } = await supabase
      .from('call_records')
      .update({
        rating: analysis.rating,
        rating_reason: analysis.reason,
      })
      .eq('id', callId);

    if (updateError) {
      console.error('Error updating call rating:', updateError);
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      {
        rating: analysis.rating,
        reason: analysis.reason,
      },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Unexpected error analyzing call:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
