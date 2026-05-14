import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { bootstrapDatabase, getSetupStatus } from "./db";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const requestSchema = z.object({
  prompt: z.string().min(1),
  currentProgram: z.unknown().optional(),
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/setup/status", async (_request, response) => {
  try {
    response.json(await getSetupStatus());
  } catch (error) {
    response.status(500).json({
      configuredDbAccess: false,
      tablesReady: false,
      details: error instanceof Error ? error.message : "Failed to inspect database setup.",
    });
  }
});

app.post("/api/setup/bootstrap", async (_request, response) => {
  try {
    response.json(await bootstrapDatabase());
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Failed to bootstrap schema.",
    });
  }
});

app.post("/api/programs/generate", async (request, response) => {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel =
    process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";

  if (!openRouterApiKey) {
    response.status(500).json({
      error: "Missing OPENROUTER_API_KEY on the server.",
    });
    return;
  }

  const parsed = requestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid generation payload.",
      details: parsed.error.flatten(),
    });
    return;
  }

  const payload = parsed.data;
  const mode = payload.currentProgram ? "edit" : "create";

  const systemPrompt = `
You are a veteran strength coach building a concrete lifting program.
Return JSON only.
No markdown.
No prose before or after the JSON.

Required JSON shape:
{
  "name": string,
  "goal": string,
  "experienceLevel": "easy" | "moderate" | "hard",
  "daysPerWeek": number,
  "summary": string,
  "progression_notes": string[],
  "weeks": [
    {
      "label": string,
      "objective": string,
      "sessions": [
        {
          "title": string,
          "dayLabel": string,
          "focus": string,
          "notes": string,
          "exercises": [
            {
              "name": string,
              "category": string,
              "target": {
                "sets": number,
                "reps": string,
                "restSeconds": number,
                "intensity": string,
                "notes": string
              }
            }
          ]
        }
      ]
    }
  ]
}

Constraints:
- Generate exactly 4 weeks.
- Infer the weekly frequency from the user's prompt and set daysPerWeek to match the number of sessions per week.
- Keep daysPerWeek between 2 and 6.
- Programs are for humans logging workouts later without AI assistance, so progression must be explicit and deterministic.
- Favor concise, realistic exercises and set/rep prescriptions.
- Respect the user's prompt exactly, including equipment, session length, injuries, available days, and preferred style.
- Keep the tone practical, not motivational.
`.trim();

  const userPrompt = `
Mode: ${mode}
User prompt:
${payload.prompt}

${
  payload.currentProgram
    ? `Current program JSON: ${JSON.stringify(payload.currentProgram)}`
    : "No current program. Build a new one."
}
`.trim();

  try {
    const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_object",
        },
      }),
    });

    if (!completion.ok) {
      const details = await completion.text();
      response.status(502).json({
        error: "OpenRouter request failed.",
        details,
      });
      return;
    }

    const json = (await completion.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      response.status(502).json({
        error: "OpenRouter returned an empty payload.",
      });
      return;
    }

    response.json({
      structure: JSON.parse(content),
    });
  } catch (error) {
    response.status(500).json({
      error: "Program generation failed.",
      details: error instanceof Error ? error.message : "Unknown server error.",
    });
  }
});

app.listen(port, () => {
  console.log(`IRON server listening on http://localhost:${port}`);
});
