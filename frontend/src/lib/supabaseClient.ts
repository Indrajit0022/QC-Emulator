import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill them in.",
  );
}

// Anon key only — RLS (see migration 0001) restricts this to insert + select
// on runs, and select on evaluation_dimensions. Writes to status/report/
// dimensions only ever happen server-side via the service role key.
export const supabase = createClient(url, anonKey);
