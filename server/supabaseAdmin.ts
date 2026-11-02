/**
 * Supabase service-role client — server-side privileged access.
 * Used for writing subscription tier changes after verified payments.
 * The client SDK cannot modify tier/status/expiry/usage (blocked by RLS policies).
 *
 * Bypasses RLS. NEVER expose the service role key to the client.
 */
import { createClient } from '@supabase/supabase-js';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is not configured on the server.`);
  }
  return value;
}

export function getSupabaseAdmin() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
