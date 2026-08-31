import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("play-now onboarding product contract", () => {
  it("routes PLAY NOW through authentication and accessible command onboarding", () => {
    const landing = read("src/app/page.tsx");
    const login = read("src/app/login/page.tsx");
    const onboarding = read("src/components/command-onboarding.tsx");
    const battle = read("src/components/tutorial-battle.tsx");
    expect(landing).toContain("PLAY NOW");
    expect(landing).toContain("/login?next=/onboarding");
    expect(login).toContain('"/onboarding"');
    expect(onboarding).toContain("<fieldset");
    expect(onboarding).toContain("<legend");
    expect(onboarding).toContain('aria-describedby="callsign-help"');
    expect(onboarding).toContain('role="status"');
    expect(onboarding).toContain("/play");
    expect(battle).toContain("projectCommands(state, commands");
    expect(battle).toContain("events.map((event, index)");
    expect(battle).toContain('role="toolbar"');
    expect(battle).not.toContain('role="gridcell"');
    expect(onboarding).toContain('aria-current={item === step ? "step" : undefined}');
    expect(onboarding).toContain('if (step === 0) callsignInput.current?.focus()');
    expect(onboarding).toContain('else heading.current?.focus()');
    expect(read("src/app/onboarding/actions.ts")).toContain('store.set("sd_onboarded_user", user.id');
    expect(read("src/app/play/page.tsx")).toContain('store.get("sd_onboarded_user")?.value !== user.id');
    expect(`${landing}\n${login}\n${onboarding}\n${battle}`).not.toMatch(/tutorial system online|initiate tutorial|live tactical tutorial|live tutorial/i);
  });
  it("uses authoritative per-event VFX and a mobile-fit battlefield", () => {
    const battle = read("src/components/tutorial-battle.tsx");
    const css = read("src/app/globals.css");
    const proxy = read("src/proxy.ts");
    expect(proxy).toContain("applyPrivateAuthCachePolicy(response)");
    expect(battle).toContain("events.map((event, index)");
    expect(battle).toContain("style={effectStyle(event, index)}");
    expect(battle).toContain("--move-angle");
    expect(css).toContain("width:max(13.5%,44px)");
    expect(css).toContain(".hex-tile.legal:not(.selected)");
    expect(css).toContain(".hex-tile.unavailable{cursor:not-allowed");
    expect(css).toContain(".hex-tile.unavailable:hover");
    expect(css).toContain(".event-stream li");
    expect(css).toContain(".nav-link,.text-button{justify-self:end;min-width:44px;min-height:44px");
    expect(css).toContain(".wordmark{min-height:44px");
    expect(css).toContain("font:12px/1.4 var(--mono)");
    expect(css).not.toContain("transform:scale(.74)");
  });
  it("ships generated VFX with reduced motion and truthful provenance", () => {
    const css = read("src/app/globals.css");
    for (const effect of ["movement", "attack", "capture", "guard", "radar"]) expect(css).toContain(`effect-${effect}-gpt.png`);
    expect(css).toContain("prefers-reduced-motion");
    const manifest = JSON.parse(read("public/assets/gameplay/manifest.json"));
    expect(manifest.generator).toBe("ChatGPT GPT Image");
    expect(manifest.assets).toHaveLength(7);
  });
});
