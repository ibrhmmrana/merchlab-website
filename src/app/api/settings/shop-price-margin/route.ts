import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthed } from '@/lib/adminAuth';
import { cookies } from 'next/headers';

const KEY = 'shop_price_margin';

/** GET: return current shop price margin (percentage). Public so /shop can read it. */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', KEY)
      .maybeSingle();

    if (error) {
      console.error('shop-price-margin GET:', error);
      return NextResponse.json({ margin: 0 });
    }
    const margin = data?.value != null ? parseFloat(String(data.value)) : 0;
    return NextResponse.json({ margin: Number.isFinite(margin) ? margin : 0 });
  } catch (e) {
    console.error('shop-price-margin GET:', e);
    return NextResponse.json({ margin: 0 });
  }
}

/** PUT: set shop price margin. Admin only. */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const mockRequest = {
      cookies: { get: (name: string) => cookieStore.get(name) },
    };
    if (!isAuthed(mockRequest)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const margin = body?.margin;
    if (margin === undefined || margin === null) {
      return NextResponse.json(
        { error: 'Body must include margin (number)' },
        { status: 400 }
      );
    }
    const value = parseFloat(String(margin));
    if (!Number.isFinite(value) || value < 0 || value > 1000) {
      return NextResponse.json(
        { error: 'margin must be a number between 0 and 1000' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: KEY, value: String(value), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('shop-price-margin PUT:', error);
      return NextResponse.json(
        { error: 'Failed to save setting' },
        { status: 500 }
      );
    }
    return NextResponse.json({ margin: value });
  } catch (e) {
    console.error('shop-price-margin PUT:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
