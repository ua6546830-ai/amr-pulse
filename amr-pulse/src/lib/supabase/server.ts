import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS-constrained server client. Returns null when workspace mode is unconfigured so that
 * the public demo never depends on Supabase being present.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          for (const item of items) store.set(item.name, item.value, item.options);
        } catch {
          // Server Components cannot write cookies; session refresh happens in route handlers.
        }
      },
    },
  });
}
