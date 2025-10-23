import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", url ? "Set" : "Missing");
console.log("Supabase Anon Key:", anon ? "Set" : "Missing");

if (!url || !anon) {
  if (process.env.NODE_ENV !== "production") {
    // Developer-friendly message; don't crash prod
    console.warn("Supabase env vars missing. Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

export const supabase = createClient(url ?? "", anon ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});