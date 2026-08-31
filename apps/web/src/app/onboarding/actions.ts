"use server";

import { cookies } from "next/headers";
import { createClient } from "../../lib/supabase/server";

const doctrines = new Set(["aggressive", "adaptive", "fortified"]);

export async function completeOnboarding(profile: { callsign: string; doctrine: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const callsign = profile.callsign.trim().toUpperCase();
  if (!/^[A-Z0-9 _-]{2,18}$/.test(callsign) || !doctrines.has(profile.doctrine)) throw new Error("Invalid command profile");
  const store = await cookies();
  store.set("sd_onboarded_user", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { callsign, doctrine: profile.doctrine };
}
