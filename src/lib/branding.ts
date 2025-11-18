import { pgGet, uniqStrings } from './postgrest';

export type BrandingRow = {
  branding_position: string | null;
  branding_type: string | null;
  branding_size: string | null;
};

export type BrandingFacets = {
  positions: string[];
  typesByPosition: Record<string, string[]>;
  sizesByPositionType: Record<string, Record<string, string[]>>;
};

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }
function clean(s: string | null | undefined) {
  return (s ?? "").trim();
}

export async function fetchBrandingFacets(stockHeaderId: number): Promise<BrandingFacets> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url  = `${base}/rest/v1/branding_options?stock_header_id=eq.${stockHeaderId}&select=branding_position,branding_type,branding_size&limit=2000`;

  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });

  if (!res.ok) throw new Error(`branding facets ${res.status}`);

  const rows = (await res.json()) as BrandingRow[];

  // Normalize & build maps
  const norm = rows.map(r => ({
    pos: clean(r.branding_position),
    typ: clean(r.branding_type),
    siz: clean(r.branding_size),
  })).filter(r => r.pos);

  const positions = uniq(norm.map(r => r.pos)).sort((a,b)=>a.localeCompare(b));

  const typesByPosition: Record<string, string[]> = {};
  const sizesByPositionType: Record<string, Record<string, string[]>> = {};

  for (const p of positions) {
    const rowsP = norm.filter(r => r.pos === p);
    const typesP = uniq(rowsP.map(r => r.typ).filter(Boolean)).sort((a,b)=>a.localeCompare(b));
    typesByPosition[p] = typesP;

    sizesByPositionType[p] = {};
    for (const t of typesP) {
      const sizes = uniq(rowsP.filter(r => r.typ === t).map(r => r.siz).filter(Boolean))
        .sort((a,b)=>a.localeCompare(b));
      sizesByPositionType[p][t] = sizes;
    }
  }

  return { positions, typesByPosition, sizesByPositionType };
}

export async function fetchBrandingPositions(stockHeaderId: number) {
  // returns distinct positions for this item
  const rows = await pgGet<{ branding_position: string | null }[]>(
    'branding_options',
    {
      select: 'branding_position',
      'stock_header_id': `eq.${stockHeaderId}`,
      'branding_position': 'not.is.null',
      order: 'branding_position.asc',
    }
  );
  return uniqStrings(rows.map(r => r.branding_position));
}

export async function fetchBrandingTypes(stockHeaderId: number, position: string) {
  const rows = await pgGet<{ branding_type: string | null }[]>(
    'branding_options',
    {
      select: 'branding_type',
      'stock_header_id': `eq.${stockHeaderId}`,
      'branding_position': `eq.${position}`, // Don't double-encode, pgGet will handle it
      'branding_type': 'not.is.null',
      order: 'branding_type.asc',
    }
  );
  return uniqStrings(rows.map(r => r.branding_type));
}

export async function fetchBrandingSizes(stockHeaderId: number, position: string, type: string) {
  const rows = await pgGet<{ branding_size: string | null }[]>(
    'branding_options',
    {
      select: 'branding_size',
      'stock_header_id': `eq.${stockHeaderId}`,
      'branding_position': `eq.${position}`, // Don't double-encode, pgGet will handle it
      'branding_type': `eq.${type}`, // Don't double-encode, pgGet will handle it
      'branding_size': 'not.is.null',
      order: 'branding_size.asc',
    }
  );
  return uniqStrings(rows.map(r => r.branding_size));
}

// Fetch branding selections from quote_branding_selections table
export type QuoteBrandingSelection = {
  item_key: string;
  stock_header_id: number;
  branding_position: string;
  branding_type: string;
  branding_size: string;
  color_count: number;
  comment?: string | null;
  artwork_url?: string | null; // Original raster image URL
  logo_file?: string | null; // Vectorized SVG URL
};

export async function fetchQuoteBrandingSelections(
  sessionToken: string,
  itemKeys: string[]
): Promise<QuoteBrandingSelection[]> {
  if (itemKeys.length === 0) {
    return [];
  }

  // PostgREST 'in' operator: item_key=in.(key1,key2,key3)
  // Values should be comma-separated within parentheses, each value URL-encoded
  const itemKeysParam = itemKeys.map(k => encodeURIComponent(k)).join(',');
  
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Build query string manually to preserve PostgREST operator syntax
  const queryParts = [
    `session_token=eq.${encodeURIComponent(sessionToken)}`,
    `item_key=in.(${itemKeysParam})`,
    `select=${encodeURIComponent('item_key,stock_header_id,branding_position,branding_type,branding_size,color_count,comment,artwork_url,logo_file')}`,
  ];
  
  const url = `${base}/rest/v1/quote_branding_selections?${queryParts.join('&')}`;
  
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: 'no-store',
  });
  
  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed to fetch branding selections: ${res.status} - ${body}`, { url });
    throw new Error(`Failed to fetch branding selections: ${res.status}`);
  }
  
  return (await res.json()) as QuoteBrandingSelection[];
}

