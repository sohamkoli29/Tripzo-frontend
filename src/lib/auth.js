// frontend/src/lib/auth.js
// Use this instead of calling createClient() + supabase.auth directly
// in components. Ensures the singleton is always used.

import { createClient } from "@/lib/supabase/client";

export function getSupabase() {
  return createClient(); // always the singleton
}

export async function getUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

export async function signOut() {
  const { clearTokenCache } = await import("@/lib/api");
  clearTokenCache();
  await createClient().auth.signOut();
}