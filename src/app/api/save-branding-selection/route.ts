import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
      logo_file,
    } = body;

    console.debug('[branding] save API received', {
      has_artwork_url: !!artwork_url,
      has_logo_file: !!logo_file,
      branding_position: position,
      branding_size: brandingSize,
      branding_type: brandingType,
      session_token: sessionToken ? 'present' : 'missing',
      item_key: itemKey,
      stock_header_id: stockHeaderId,
    });

    if (!sessionToken || !itemKey || !stockHeaderId || !position || !brandingType || !brandingSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save to database via RPC
    const supabase = getSupabaseAdmin();
    const rpcPayload = {
      p_session_token: sessionToken,
      p_item_key: itemKey,
      p_stock_header_id: parseInt(stockHeaderId, 10),
      p_branding_position: position,
      p_branding_type: brandingType,
      p_branding_size: brandingSize,
      p_color_count: colorCount ? parseInt(colorCount, 10) : null,
      p_comment: comment || null,
      p_artwork_url: artwork_url || null,
      p_logo_file: logo_file || null, // Include vectorized SVG URL
    };
    
    console.debug('[branding] RPC call payload', rpcPayload);
    
    const { error: rpcError } = await supabase.rpc('save_branding_selection', rpcPayload);
    
    if (!rpcError) {
      // Verify the saved row
      const { data: savedRow, error: fetchError } = await supabase
        .from('quote_branding_selections')
        .select('artwork_url, logo_file, updated_at')
        .eq('session_token', sessionToken)
        .eq('item_key', itemKey)
        .eq('branding_position', position)
        .single();
      
      if (!fetchError && savedRow) {
        console.debug('[branding] saved row verified', {
          artwork_url: savedRow.artwork_url,
          logo_file: savedRow.logo_file,
          updated_at: savedRow.updated_at,
        });
      } else {
        console.warn('[branding] failed to verify saved row', fetchError);
      }
    }

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

