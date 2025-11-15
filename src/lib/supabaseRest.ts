export const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function supaHeaders() {
  return {
    apikey: SUPA_ANON,
    Authorization: `Bearer ${SUPA_ANON}`,
    'Content-Type': 'application/json',
  };
}

export async function listBrandingPositions(stockHeaderId: number) {
  const res = await fetch(`${SUPA_URL}/rest/v1/rpc/list_branding_positions`, {
    method: 'POST',
    headers: supaHeaders(),
    body: JSON.stringify({ p_stock_header_id: stockHeaderId }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`listBrandingPositions failed: ${res.status} ${text}`);
  }

  // [{ branding_position: string, option_count: number }]
  return (await res.json()) as Array<{ branding_position: string; option_count: number }>;
}

export async function listBrandingChoices(stockHeaderId: number, position: string) {
  const res = await fetch(`${SUPA_URL}/rest/v1/rpc/list_branding_choices`, {
    method: 'POST',
    headers: supaHeaders(),
    body: JSON.stringify({
      p_stock_header_id: stockHeaderId,
      p_branding_position: position,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`listBrandingChoices failed: ${res.status} ${text}`);
  }

  // [{ branding_type, branding_size }]
  return (await res.json()) as Array<{ branding_type: string; branding_size: string }>;
}

