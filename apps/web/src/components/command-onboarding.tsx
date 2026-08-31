"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeOnboarding } from "../app/onboarding/actions";

const doctrines = [
  { id: "aggressive", name: "SHOCK ADVANCE", detail: "Pressure the relay early. Trade armor for initiative." },
  { id: "adaptive", name: "ADAPTIVE CONTROL", detail: "Read the field, preserve options, punish overextension." },
  { id: "fortified", name: "FORTIFIED SIGNAL", detail: "Guard key droids and force the enemy into bad attacks." },
] as const;

export function CommandOnboarding({ defaultCallsign }: { defaultCallsign: string }) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const callsignInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [callsign, setCallsign] = useState(defaultCallsign.slice(0, 18));
  const [doctrine, setDoctrine] = useState<(typeof doctrines)[number]["id"]>("adaptive");
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
      const profile = await completeOnboarding({ callsign, doctrine });
      localStorage.setItem("smashdroids:command-profile", JSON.stringify(profile));
      router.push("/play");
    } catch {
      setError("Command profile could not be established. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="onboarding-panel" aria-labelledby="onboarding-title">
      <p className="sr-only" role="status">Command onboarding step {step + 1} of 3</p>
      <div className="onboarding-progress" aria-label={`Onboarding step ${step + 1} of 3`}>
        {[0, 1, 2].map((item) => <span key={item} className={item <= step ? "active" : ""} aria-current={item === step ? "step" : undefined}>{String(item + 1).padStart(2, "0")}</span>)}
      </div>

      {step === 0 && <div className="onboarding-step">
        <p className="kicker">COMMAND IDENTITY</p>
        <h1 id="onboarding-title">NAME YOUR<br /><span>COMMAND.</span></h1>
        <p id="callsign-help">Your callsign marks every order issued from this command seat. Use 2–18 letters, numbers, spaces, hyphens, or underscores.</p>
        <label className="callsign-field" htmlFor="callsign">CALLSIGN</label>
        <input ref={callsignInput} id="callsign" className="callsign-input" autoFocus value={callsign} onChange={(event) => setCallsign(event.target.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, ""))} minLength={2} maxLength={18} autoComplete="nickname" aria-describedby="callsign-help" />
        <button className="button-primary onboarding-next" onClick={() => setStep(1)} disabled={callsign.trim().length < 2}>Continue <b>→</b></button>
      </div>}

      {step === 1 && <div className="onboarding-step">
        <p className="kicker">COMMAND DOCTRINE</p>
        <h1 id="onboarding-title" ref={heading} tabIndex={-1}>CHOOSE YOUR<br /><span>INSTINCT.</span></h1>
        <p>Doctrine changes your briefing posture, never the deterministic rules.</p>
        <fieldset className="doctrine-fieldset">
          <legend>DOCTRINE</legend>
          <div className="doctrine-grid">
            {doctrines.map((item, index) => <label key={item.id} className={doctrine === item.id ? "selected" : ""}>
              <input type="radio" name="doctrine" value={item.id} checked={doctrine === item.id} onChange={() => setDoctrine(item.id)} />
              <span>0{index + 1}</span><strong>{item.name}</strong><small>{item.detail}</small>
            </label>)}
          </div>
        </fieldset>
        <div className="onboarding-actions"><button className="button-ghost" onClick={() => setStep(0)}>Back</button><button className="button-primary" onClick={() => setStep(2)}>Lock doctrine <b>→</b></button></div>
      </div>}

      {step === 2 && <div className="onboarding-step briefing-step">
        <p className="kicker">OPERATION BRIEFING</p>
        <h1 id="onboarding-title" ref={heading} tabIndex={-1}>TAKE THE<br /><span>RELAY.</span></h1>
        <p>Stack up to three orders. They resolve in sequence. The baseline force answers only after your command set completes.</p>
        <dl className="briefing-list">
          <div><dt>COMMANDER</dt><dd>{callsign || "COMMANDER"}</dd></div>
          <div><dt>DOCTRINE</dt><dd>{doctrines.find((item) => item.id === doctrine)?.name}</dd></div>
          <div><dt>VICTORY</dt><dd>CAPTURE RELAY / ELIMINATE FORCE</dd></div>
          <div><dt>GEOMETRY</dt><dd>POINTY-TOP AXIAL HEX</dd></div>
        </dl>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <div className="onboarding-actions"><button className="button-ghost" onClick={() => setStep(1)} disabled={submitting}>Back</button><button className="button-primary deploy-button" onClick={deploy} disabled={submitting}>{submitting ? "Establishing…" : "Deploy now"} <b>↗</b></button></div>
      </div>}
    </section>
  );
}
