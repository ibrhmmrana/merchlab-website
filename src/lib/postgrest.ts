export async function pgGet<T>(path: string, params: Record<string, string>) {
  const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Build query string manually to handle PostgREST operators correctly
  const queryParts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    // URL encode the value, but keep operators like 'eq.', 'not.is.null' intact
    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  const queryString = queryParts.join('&');
  
  const url = `${urlBase}/rest/v1/${path}?${queryString}`;
  
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`PostgREST GET failed: ${url}`, { status: res.status, body });
    throw new Error(`PostgREST GET ${path} failed: ${res.status} - ${body}`);
  }
  return (await res.json()) as T;
}

export function uniqStrings(a: (string|null|undefined)[]) {
  return Array.from(new Set(a.filter((s): s is string => !!s))).sort();
}

