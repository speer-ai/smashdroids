export const AUTH_ERROR_MESSAGE = "We couldn't complete that request. Check your details and try again.";

type PublicEnv = Readonly<{ url: string; publishableKey: string }>;
type EnvSource = Readonly<Record<string, string | undefined>>;

export function readPublicSupabaseEnv(source: EnvSource = process.env): PublicEnv {
  const url = source.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("Missing public Supabase URL");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid public Supabase URL");
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
    throw new Error("Invalid public Supabase URL");
  }
  if (!publishableKey) throw new Error("Missing public Supabase publishable key");
  return Object.freeze({ url: parsed.origin, publishableKey });
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return "/play";
  return value;
}

const PRODUCTION_ORIGIN = "https://smashdroids.com";

export function safeRequestOrigin(value: string | null | undefined): string {
  if (!value) return PRODUCTION_ORIGIN;
  try {
    const origin = new URL(value).origin;
    if (origin === PRODUCTION_ORIGIN || origin === "https://www.smashdroids.com") return origin;
    if (origin === "http://localhost:3000" || origin === "http://localhost:3100") return origin;
  } catch {
    return PRODUCTION_ORIGIN;
  }
  return PRODUCTION_ORIGIN;
}
