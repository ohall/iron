import type { AiProgramRequest, GeneratedProgramPayload } from "../types";

export async function generateProgram(request: AiProgramRequest) {
  const response = await fetch("/api/programs/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; details?: string }
      | null;
    throw new Error(payload?.error ?? "Program generation failed.");
  }

  return (await response.json()) as GeneratedProgramPayload;
}
