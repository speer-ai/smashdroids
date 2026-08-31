import Link from "next/link";
import { redirect } from "next/navigation";
import { CommandOnboarding } from "../../components/command-onboarding";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../login/actions";

export default async function Onboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  const defaultCallsign = String(user.user_metadata?.callsign ?? user.email?.split("@")[0] ?? "COMMANDER").toUpperCase();
  return <main className="onboarding-shell">
    <header className="play-header">
      <Link className="wordmark" href="/"><i>SD</i> SMASH DROIDS</Link>
      <p><span /> COMMAND INTAKE / SECURE</p>
      <form action={signOut}><button className="text-button">SIGN OUT ↗</button></form>
    </header>
    <CommandOnboarding defaultCallsign={defaultCallsign} />
  </main>;
}
