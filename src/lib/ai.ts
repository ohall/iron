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
    throw new Error("Program generation failed.");
  }

  return (await response.json()) as GeneratedProgramPayload;
}
