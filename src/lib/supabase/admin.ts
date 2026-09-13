import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * SERVICE ROLE client — bypasses RLS entirely. Only ever import this from
 * server actions / route handlers that have already verified the caller is
 * an admin (see requireRole("admin") in lib/auth.ts). Never import this from
 * a Client Component or expose the key to the browser.
 *
 * Used for: creating intern/viewer auth accounts (auth.admin.createUser),
 * deactivating accounts, and the standalone seed:users script.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only, never expose to the client)."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
