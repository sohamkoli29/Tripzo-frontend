// frontend/src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _instance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_instance) return _instance;

  _instance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        autoRefreshToken:   false,
        persistSession:     true,
        detectSessionInUrl: true,
      },
    }
  );

  return _instance;
}