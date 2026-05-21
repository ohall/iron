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

const generatedProgramSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  experienceLevel: z.enum(["easy", "moderate", "hard"]),
  daysPerWeek: z.number().min(2).max(6),
  summary: z.string(),
  progression_notes: z.array(z.string()),
  overload_scheme: z.array(z.string()),
  weeks: z.array(
    z.object({
      label: z.string(),
      objective: z.string(),
      sessions: z.array(
        z.object({
          title: z.string(),
          dayLabel: z.string(),
          focus: z.string(),
          notes: z.string().optional().default(""),
          exercises: z.array(
            z.object({
              name: z.string(),
              category: z.string(),
              target: z.object({
                sets: z.number(),
                reps: z.string(),
                weight: z.string(),
                restSeconds: z.number(),
                intensity: z.string().optional(),
                notes: z.string().optional(),
              }),
            }),
          ),
        }),
      ),
    }),
  ),
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
  const startedAt = Date.now();

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
  "overload_scheme": string[],
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
              "weight": string,
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
- Every exercise must include explicit target sets, target reps, and target weight.
- Include a concrete overload_scheme array that explains when to add reps, when to add weight, and how to deload.
- If the user does not provide exact loads, estimate a reasonable starting weight and indicate that it is a starting estimate.
- Favor concise, realistic exercises and set/rep/weight prescriptions.
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
    console.log(
      `[generate] start mode=${mode} prompt_chars=${payload.prompt.length}`,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "IRON",
      },
      signal: controller.signal,
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
    clearTimeout(timeout);

    if (!completion.ok) {
      const details = await completion.text();
      console.error(`[generate] openrouter_error status=${completion.status}`);
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

    const generated = generatedProgramSchema.parse(JSON.parse(content));
    console.log(`[generate] success ms=${Date.now() - startedAt}`);

    response.json({
      name: generated.name,
      goal: generated.goal,
      experienceLevel: generated.experienceLevel,
      daysPerWeek: generated.daysPerWeek,
      structure: {
        summary: generated.summary,
        progression_notes: generated.progression_notes,
        overload_scheme: generated.overload_scheme,
        weeks: generated.weeks,
      },
    });
  } catch (error) {
    console.error("[generate] failure", error);
    response.status(500).json({
      error:
        error instanceof Error && error.name === "AbortError"
          ? "Program generation timed out after 45 seconds."
          : "Program generation failed.",
      details: error instanceof Error ? error.message : "Unknown server error.",
    });
  }
});

app.listen(port, () => {
  console.log(`IRON server listening on http://localhost:${port}`);
});
