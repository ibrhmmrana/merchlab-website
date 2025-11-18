import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Environment check at module level
if (!process.env.VECTORIZE_URL) {
  console.error('VECTORIZE_URL environment variable not set');
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    const vectorizeUrl = process.env.VECTORIZE_URL;
    if (!vectorizeUrl) {
      return NextResponse.json(
        { error: 'VECTORIZE_URL missing' },
        { status: 500 }
      );
    }

    // Check Supabase admin credentials
    try {
      getSupabaseAdmin();
    } catch (error) {
      return NextResponse.json(
        { error: 'SUPABASE service env missing' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return NextResponse.json(
        { error: 'missing_url' },
        { status: 400 }
      );
    }

    // Call vectorizer service
    console.log('Calling vectorizer:', { url, vectorizeUrl });
    const vectorizeResponse = await fetch(vectorizeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'image/svg+xml,text/plain,*/*',
      },
      body: JSON.stringify({ url }),
    });

    if (!vectorizeResponse.ok) {
      const errorText = await vectorizeResponse.text().catch(() => 'Unknown error');
      const contentType = vectorizeResponse.headers.get('content-type') || 'unknown';
      console.error('Vectorizer failed:', {
        status: vectorizeResponse.status,
        contentType,
        body: errorText.slice(0, 200),
      });
      return NextResponse.json(
        {
          error: 'upstream_error',
          status: vectorizeResponse.status,
          body: errorText.slice(0, 200),
        },
        { status: 502 }
      );
    }

    // Read SVG content as text
    const svg = await vectorizeResponse.text();

    // Validate SVG content
    if (!svg || !/<svg[\s\S]*<\/svg>/i.test(svg)) {
      console.error('Invalid SVG response:', {
        length: svg?.length || 0,
        preview: svg?.slice(0, 200) || 'empty',
      });
      return NextResponse.json(
        { error: 'invalid_svg_response' },
        { status: 502 }
      );
    }

    // Generate path for SVG upload
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const svgPath = `branding/vectors/${timestamp}-${randomStr}.svg`;

    // Upload SVG to Supabase Storage
    const supabase = getSupabaseAdmin();
    const svgBuffer = Buffer.from(svg, 'utf8');

    console.log('Uploading SVG to Supabase:', { svgPath, bucket: 'branding' });
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('branding')
      .upload(svgPath, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (uploadError) {
      console.error('SVG upload error:', uploadError);
      return NextResponse.json(
        { error: 'upload_failed', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL for SVG
    const { data: urlData } = supabase.storage
      .from('branding')
      .getPublicUrl(svgPath);

    const svgPublicUrl = urlData.publicUrl;

    if (!svgPublicUrl) {
      return NextResponse.json(
        { error: 'failed_to_generate_url' },
        { status: 500 }
      );
    }

    console.log('Vectorization successful:', { originalUrl: url, logo_file: svgPublicUrl });

    return NextResponse.json({
      logo_file: svgPublicUrl,
    });
  } catch (error) {
    console.error('Vectorize route error:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

