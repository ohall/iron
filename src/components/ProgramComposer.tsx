import { useState } from "react";
import type { GeneratedProgramPayload, Program } from "../types";
import { generateProgram } from "../lib/ai";

interface ProgramComposerProps {
  mode: "create" | "edit";
  program?: Program;
  onGenerate: (payload: GeneratedProgramPayload) => void;
}

export function ProgramComposer({ mode, program, onGenerate }: ProgramComposerProps) {
  const [prompt, setPrompt] = useState(
    mode === "edit"
      ? `Modify "${program?.name}" so it better fits these changes:\n`
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const generated = await generateProgram({
        prompt,
        currentProgram: program?.structure,
      });
      onGenerate(generated);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something broke while generating the program.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel prompt-form" onSubmit={handleSubmit}>
      <div className="section-label">{mode === "create" ? "Build New Program" : "Rework Program"}</div>
      <label>
        Prompt
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            mode === "create"
              ? "4-day strength block. Mostly barbell work. 45 minute sessions. Intermediate lifter. Prioritize squat and bench, keep deadlift volume moderate, include a clear 4-week progression."
              : "Reduce joint stress, keep the same weekly structure, and swap movements that aggravate my shoulder."
          }
          required
          rows={10}
        />
      </label>
      {error ? <div className="error-banner">{error}</div> : null}
      <button className="cta-button" disabled={loading} type="submit">
        {loading ? "calling the machine..." : mode === "create" ? "generate program" : "modify program"}
      </button>
      <p className="muted-copy">
        Write whatever matters: goals, schedule, equipment, injuries, time limits, preferred lifts, and style. AI is only used here while creating or modifying a program.
      </p>
    </form>
  );
}
