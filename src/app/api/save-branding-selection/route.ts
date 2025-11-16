import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionToken,
      itemKey,
      stockHeaderId,
      position,
      brandingType,
      brandingSize,
      colorCount,
      comment,
      artwork_url,
    } = body;

    if (!sessionToken || !itemKey || !stockHeaderId || !position || !brandingType || !brandingSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save to database via RPC
    const { error: rpcError } = await supabaseAdmin.rpc('save_branding_selection', {
      p_session_token: sessionToken,
      p_item_key: itemKey,
      p_stock_header_id: parseInt(stockHeaderId, 10),
      p_branding_position: position,
      p_branding_type: brandingType,
      p_branding_size: brandingSize,
      p_color_count: colorCount ? parseInt(colorCount, 10) : null,
      p_comment: comment || null,
      p_artwork_url: artwork_url || null,
    });

    if (rpcError) {
      console.error('RPC save_branding_selection error:', rpcError);
      return NextResponse.json(
        { error: rpcError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save branding selection route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

