import { useEffect, useMemo, useState } from "react";
import { createExerciseLog, createProgram, listPrograms, MissingSchemaError, updateProgram, updateProgram as persistProgram } from "./lib/programs";
import { ProgramCard } from "./components/ProgramCard";
import { ProgramComposer } from "./components/ProgramComposer";
import { ProgramView } from "./components/ProgramView";
import { SetupPanel } from "./components/SetupPanel";
import { bootstrapSchema, fetchSetupStatus, type SetupStatus } from "./lib/setup";
import type { ExerciseDefinition, GeneratedProgramPayload, Program, SessionDefinition } from "./types";

type ScreenState =
  | { type: "home" }
  | { type: "create" }
  | { type: "detail"; programId: string }
  | { type: "edit"; programId: string };

export default function App() {
  const [screen, setScreen] = useState<ScreenState>({ type: "home" });
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    void refreshPrograms();
  }, []);

  async function refreshPrograms() {
    setLoading(true);
    setError(null);

    try {
      const items = await listPrograms();
      setPrograms(items);
      setSetupStatus(null);
    } catch (loadError) {
      if (loadError instanceof MissingSchemaError) {
        setPrograms([]);
        setError(null);
        try {
          const status = await fetchSetupStatus();
          setSetupStatus(status);
        } catch (statusError) {
          setSetupStatus({
            configuredDbAccess: false,
            tablesReady: false,
            details:
              statusError instanceof Error
                ? statusError.message
                : "Failed to determine setup status.",
          });
        }
      } else {
        setError(loadError instanceof Error ? loadError.message : "Failed to load programs.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleBootstrap() {
    setBootstrapping(true);
    setError(null);

    try {
      const status = await bootstrapSchema();
      setSetupStatus(status);
      await refreshPrograms();
    } catch (bootstrapError) {
      setError(
        bootstrapError instanceof Error
          ? bootstrapError.message
          : "Failed to bootstrap schema.",
      );
    } finally {
      setBootstrapping(false);
    }
  }

  const activePrograms = useMemo(
    () => programs.filter((program) => program.status === "active"),
    [programs],
  );

  const archivePrograms = useMemo(
    () => programs.filter((program) => program.status !== "active"),
    [programs],
  );

  const selectedProgram =
    screen.type === "detail" || screen.type === "edit"
      ? programs.find((program) => program.id === screen.programId) ?? null
      : null;

  async function handleProgramCreate(payload: GeneratedProgramPayload) {
    const created = await createProgram({
      name: payload.name,
      goal: payload.goal,
      experience_level: payload.experienceLevel,
      days_per_week: payload.daysPerWeek,
      status: "draft",
      started_at: null,
      structure: payload.structure,
    });

    setPrograms((current) => [created, ...current]);
    setScreen({ type: "detail", programId: created.id });
  }

  async function handleProgramEdit(payload: GeneratedProgramPayload) {
    if (!selectedProgram) {
      return;
    }

    const updated = await persistProgram(selectedProgram.id, {
      name: payload.name,
      goal: payload.goal,
      experience_level: payload.experienceLevel,
      days_per_week: payload.daysPerWeek,
      structure: payload.structure,
    });

    setPrograms((current) =>
      current.map((program) => (program.id === updated.id ? updated : program)),
    );
    setScreen({ type: "detail", programId: updated.id });
  }

  async function handleStartProgram(program: Program) {
    const updated = await updateProgram(program.id, {
      status: "active",
      started_at: new Date().toISOString(),
    });
    setPrograms((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  async function handleSaveLog(
    session: SessionDefinition,
    exercise: ExerciseDefinition,
    draft: { performedSets: string; effort: number; notes: string },
  ) {
    if (!selectedProgram) {
      return;
    }

    await createExerciseLog(selectedProgram.id, {
      session_key: `${selectedProgram.id}:${session.dayLabel}:${session.title}`,
      exercise_name: exercise.name,
      performed_sets: draft.performedSets,
      effort: draft.effort,
      notes: draft.notes,
      completed_at: new Date().toISOString(),
    });
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <p className="masthead__eyebrow">local-only iron journal</p>
        <h1>IRON</h1>
        <p className="masthead__copy">
          Mobile-first workout tracking with machine help only at program creation time.
        </p>
      </header>

      {screen.type === "create" ? (
        <ProgramComposer mode="create" onGenerate={handleProgramCreate} />
      ) : null}

      {screen.type === "edit" && selectedProgram ? (
        <ProgramComposer mode="edit" program={selectedProgram} onGenerate={handleProgramEdit} />
      ) : null}

      {screen.type === "detail" && selectedProgram ? (
        <ProgramView
          onBack={() => setScreen({ type: "home" })}
          onEdit={(program) => setScreen({ type: "edit", programId: program.id })}
          onSaveLog={handleSaveLog}
          onStart={handleStartProgram}
          program={selectedProgram}
        />
      ) : null}

      {screen.type === "home" ? (
        <>
          <section className="home-actions">
            <button className="cta-button" onClick={() => setScreen({ type: "create" })} type="button">
              start new program
            </button>
          </section>

          {loading ? <section className="panel">loading programs...</section> : null}
          {error ? <section className="error-banner">{error}</section> : null}
          {setupStatus && !setupStatus.tablesReady ? (
            <SetupPanel
              bootstrapping={bootstrapping}
              onBootstrap={handleBootstrap}
              status={setupStatus}
            />
          ) : null}

          <section className="panel">
            <div className="section-label">Active Blocks</div>
            <div className="card-stack">
              {activePrograms.length ? (
                activePrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    onSelect={(item) => setScreen({ type: "detail", programId: item.id })}
                    program={program}
                  />
                ))
              ) : (
                <p className="muted-copy">No active block yet. Build one and start logging.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="section-label">Drafts + Archive</div>
            <div className="card-stack">
              {archivePrograms.length ? (
                archivePrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    onSelect={(item) => setScreen({ type: "detail", programId: item.id })}
                    program={program}
                  />
                ))
              ) : (
                <p className="muted-copy">Drafts and archived blocks will show up here.</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
