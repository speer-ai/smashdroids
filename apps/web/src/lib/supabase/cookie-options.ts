import type { CookieOptions } from "@supabase/ssr";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function supabaseCookieOptions(isProduction = process.env.NODE_ENV === "production") {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: isProduction,
    maxAge: SESSION_MAX_AGE,
  };
}

export function applySupabaseCookiePolicy(
  options: CookieOptions = {},
  isProduction = process.env.NODE_ENV === "production",
): CookieOptions {
  const policy = supabaseCookieOptions(isProduction);
  return {
    ...options,
    ...policy,
    maxAge: options.maxAge === 0 ? 0 : policy.maxAge,
  };
}
