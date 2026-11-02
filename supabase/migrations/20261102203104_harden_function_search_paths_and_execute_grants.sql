/*
# Harden database function search paths and execution grants

## 1. Modified functions
- `public.set_updated_at()` keeps its existing trigger behavior but now pins
  `search_path` to `public`, preventing a role-controlled search path from
  shadowing referenced objects.
- `public.increment_usage(uuid, text)` remains available for trusted server
  migrations or future internal use, but is not part of the current API path.

## 2. Security changes
- Revoke EXECUTE on `increment_usage(uuid, text)` from PUBLIC, anon, and
  authenticated. The current server records usage through the service-role
  client, so no browser role needs to call this SECURITY DEFINER function.
- Grant EXECUTE only to service_role.

## 3. Data safety
- No tables, rows, or columns are changed.
- Existing trigger behavior is preserved.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_usage(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, text) TO service_role;
