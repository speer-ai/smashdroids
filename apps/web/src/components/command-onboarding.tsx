"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeOnboarding } from "../app/onboarding/actions";

export function CommandOnboarding({ defaultCallsign }: { defaultCallsign: string }) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const callsignInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [callsign, setCallsign] = useState(defaultCallsign.slice(0, 18));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step === 0) callsignInput.current?.focus();
    else heading.current?.focus();
  }, [step]);

  async function deploy() {
    setSubmitting(true);
    setError("");
    try {
      const profile = await completeOnboarding({ callsign, doctrine: "adaptive" });
      localStorage.setItem("smashdroids:command-profile", JSON.stringify(profile));
      router.push("/play");
    } catch {
      setError("Command profile could not be established. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="onboarding-panel" aria-labelledby="onboarding-title">
      <p className="sr-only" role="status">Command onboarding step {step + 1} of 2</p>
      <div className="onboarding-progress" aria-label={`Onboarding step ${step + 1} of 2`}>
        {[0, 1].map((item) => <span key={item} className={item <= step ? "active" : ""} aria-current={item === step ? "step" : undefined}>{String(item + 1).padStart(2, "0")}</span>)}
      </div>

      {step === 0 && <div className="onboarding-step">
        <p className="kicker">COMMAND IDENTITY</p>
        <h1 id="onboarding-title">NAME YOUR<br /><span>COMMAND.</span></h1>
        <p id="callsign-help">Your callsign marks every order issued from this command seat. Use 2–18 letters, numbers, spaces, hyphens, or underscores.</p>
        <label className="callsign-field" htmlFor="callsign">CALLSIGN</label>
        <input ref={callsignInput} id="callsign" className="callsign-input" autoFocus value={callsign} onChange={(event) => setCallsign(event.target.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, ""))} minLength={2} maxLength={18} autoComplete="nickname" aria-describedby="callsign-help" />
        <button className="button-primary onboarding-next" onClick={() => setStep(1)} disabled={callsign.trim().length < 2}>Continue <b>→</b></button>
      </div>}

      {step === 1 && <div className="onboarding-step briefing-step">
        <p className="kicker">OPERATION BRIEFING</p>
        <h1 id="onboarding-title" ref={heading} tabIndex={-1}>TAKE THE<br /><span>RELAY.</span></h1>
        <p>Stack up to four orders. They resolve in sequence. The opposing force answers only after your command set completes.</p>
        <dl className="briefing-list">
          <div><dt>COMMANDER</dt><dd>{callsign || "COMMANDER"}</dd></div>
          <div><dt>VICTORY</dt><dd>CAPTURE RELAY / ELIMINATE FORCE</dd></div>
          <div><dt>GEOMETRY</dt><dd>ROTATABLE GEODESIC WORLD</dd></div>
        </dl>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <div className="onboarding-actions"><button className="button-ghost" onClick={() => setStep(0)} disabled={submitting}>Back</button><button className="button-primary deploy-button" onClick={deploy} disabled={submitting}>{submitting ? "Establishing…" : "Deploy now"} <b>↗</b></button></div>
      </div>}
    </section>
  );
}
