import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readPublicSupabaseEnv } from "../auth/contract";
import { applySupabaseCookiePolicy, supabaseCookieOptions } from "./cookie-options";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = readPublicSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return createServerClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, applySupabaseCookiePolicy(options)));
        } catch {
          // Server Components cannot write cookies; the proxy refreshes them.
        }
      },
    },
  });
}
