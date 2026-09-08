import { parseWorldArtifactBrowser, type WorldArtifact } from "../../../../packages/world/src/validation";

export async function loadVerifiedWorld(response: Response): Promise<WorldArtifact> {
  if (!response.ok) throw new Error(`World artifact returned HTTP ${response.status}`);
  return parseWorldArtifactBrowser(await response.text());
}
