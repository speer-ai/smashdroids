import { createBrowserClient } from "@supabase/ssr";
import { parseCookie, stringifySetCookie } from "cookie";
import { readPublicSupabaseEnv } from "../auth/contract";
import { applySupabaseCookiePolicy, supabaseCookieOptions } from "./cookie-options";

export function createClient() {
  const { url, publishableKey } = readPublicSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return createBrowserClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll: () => Object.entries(parseCookie(document.cookie)).flatMap(([name, value]) => value === undefined ? [] : [{ name, value }]),
      setAll: (values) => {
        values.forEach(({ name, value, options }) => {
          document.cookie = stringifySetCookie({ name, value, ...applySupabaseCookiePolicy(options) });
        });
      },
    },
  });
}
