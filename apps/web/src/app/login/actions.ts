"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ERROR_MESSAGE, safeNextPath, safeRequestOrigin } from "../../lib/auth/contract";
import { createClient } from "../../lib/supabase/server";

function credentials(formData: FormData) {
  return { email: String(formData.get("email") ?? "").trim(), password: String(formData.get("password") ?? "") };
}

function fail(): never {
  redirect(`/login?error=${encodeURIComponent(AUTH_ERROR_MESSAGE)}`);
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) fail();
  redirect(safeNextPath(String(formData.get("next") ?? "/play")));
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = safeRequestOrigin(requestHeaders.get("origin"));
  const { email, password } = credentials(formData);
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });
  if (error) fail();
  redirect("/login?status=check-email");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete("sd_onboarded_user");
  redirect("/");
}
