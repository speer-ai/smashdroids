import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorialBattle } from "../../components/tutorial-battle";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../login/actions";

export default async function Play() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  const store = await cookies();
  if (store.get("sd_onboarded_user")?.value !== user.id) redirect("/onboarding");

  return (
    <main className="play-shell">
      <header className="play-header">
        <Link className="wordmark" href="/"><i>SD</i> SMASH DROIDS</Link>
        <p><span /> LIVE OPERATION / PILOT {user.email?.split("@")[0]?.toUpperCase()}</p>
        <form action={signOut}><button className="text-button">SIGN OUT ↗</button></form>
      </header>
      <TutorialBattle />
    </main>
  );
}
