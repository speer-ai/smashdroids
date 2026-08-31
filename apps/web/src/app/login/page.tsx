import Link from "next/link";
import { AUTH_ERROR_MESSAGE, safeNextPath } from "../../lib/auth/contract";
import { signIn, signUp } from "./actions";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/onboarding");
  const hasError = typeof params.error === "string";
  const checkEmail = params.status === "check-email";
  return (
    <main className="auth-shell">
      <Link className="wordmark" href="/" aria-label="Smash Droids home"><i>SD</i> SMASH DROIDS</Link>
      <section className="auth-panel">
        <p className="kicker">PILOT AUTHORIZATION</p>
        <h1>ENTER THE<br /><span>WAR ROOM.</span></h1>
        <p className="auth-intro">Authenticate to establish your command identity and enter the war room. No clearance beyond your public pilot identity is requested.</p>
        {hasError && <p className="form-message error" role="alert">{AUTH_ERROR_MESSAGE}</p>}
        {checkEmail && <p className="form-message" role="status">Check your email to confirm your pilot identity.</p>}
        <form className="auth-form">
          <input type="hidden" name="next" value={next} />
          <label>EMAIL<input name="email" type="email" autoComplete="email" required /></label>
          <label>PASSCODE<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
          <div className="form-actions">
            <button className="button-primary" formAction={signIn}>Sign in + continue</button>
            <button className="button-ghost" formAction={signUp}>Create pilot</button>
          </div>
        </form>
      </section>
      <p className="auth-index">AUTH / 001<br />SECURE SESSION CHANNEL</p>
    </main>
  );
}
