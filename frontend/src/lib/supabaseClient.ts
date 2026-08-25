import { createClient } from "@supabase/supabase-js";

// The Supabase URL and anon key are intentionally safe to ship to the
// browser: RLS on `runs` and `evaluation_dimensions` (migration 0001) limits
// what an anonymous caller can do, and every server-side write goes through
// the service role key from inside the Edge Function — never from the client.
// The values below are the production project's public credentials; env vars
// override them so a local dev pointing at a different project still works.
const FALLBACK_URL = "https://tyjbfyxlpoefqezbjwfy.supabase.co";
const FALLBACK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amJmeXhscG9lZnFlemJqd2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDM3MDYsImV4cCI6MjEwMzA3OTcwNn0.VrMlNNi9sI-aKnMEPTj491EHFfwgzoriDDfvylN3F-A";

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON;

export const supabase = createClient(url, anonKey);
