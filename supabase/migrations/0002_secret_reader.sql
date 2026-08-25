-- Lets the Edge Function (service_role) read a Vault secret directly from
-- Postgres. This exists so the OpenRouter key can be provisioned entirely
-- over SQL, without needing dashboard/CLI access to set an Edge Function
-- secret. The function still prefers the OPENROUTER_API_KEY env var when
-- one is set (see process-run/index.ts -> resolveOpenRouterKey).
create or replace function public.get_secret(secret_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v text;
begin
  select decrypted_secret into v
  from vault.decrypted_secrets
  where name = secret_name
  limit 1;
  return v;
end;
$$;

-- Only the backend may read secrets. anon/authenticated must never call this.
revoke all on function public.get_secret(text) from public;
revoke all on function public.get_secret(text) from anon;
revoke all on function public.get_secret(text) from authenticated;
grant execute on function public.get_secret(text) to service_role;
