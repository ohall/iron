import { useMemo, useState } from "react";
import type { ExerciseDefinition, Program, SessionDefinition } from "../types";

interface LogDraft {
  performedWeight: string;
  performedSetsCount: number;
  performedReps: string;
  effort: number;
  notes: string;
}

interface ProgramViewProps {
  program: Program;
  onBack: () => void;
  onStart: (program: Program) => void;
  onEdit: (program: Program) => void;
  onSaveLog: (
    session: SessionDefinition,
    exercise: ExerciseDefinition,
    draft: LogDraft,
  ) => Promise<void>;
}

export function ProgramView({ program, onBack, onStart, onEdit, onSaveLog }: ProgramViewProps) {
  const firstWeek = program.structure.weeks[0];
  const [drafts, setDrafts] = useState<Record<string, LogDraft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const sessions = useMemo(() => firstWeek?.sessions ?? [], [firstWeek]);

  function getDraft(sessionKey: string, exercise: ExerciseDefinition) {
    const key = `${sessionKey}:${exercise.name}`;
    return (
      drafts[key] ?? {
        performedWeight: exercise.target.weight,
        performedSetsCount: exercise.target.sets,
        performedReps: exercise.target.reps,
        effort: 7,
        notes: "",
      }
    );
  }

  async function handleSave(session: SessionDefinition, exercise: ExerciseDefinition) {
    const sessionKey = `${program.id}:${session.dayLabel}:${session.title}`;
    const key = `${sessionKey}:${exercise.name}`;
    setSavingKey(key);
    try {
      await onSaveLog(session, exercise, getDraft(sessionKey, exercise));
      setDrafts((current) => ({
        ...current,
        [key]: {
          performedWeight: exercise.target.weight,
          performedSetsCount: exercise.target.sets,
          performedReps: exercise.target.reps,
          effort: 7,
          notes: "",
        },
      }));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="detail-shell">
      <div className="detail-topline">
        <button className="ghost-button" onClick={onBack} type="button">
          back
        </button>
        <div className="detail-actions">
          {program.status === "draft" ? (
            <button className="ghost-button" onClick={() => onStart(program)} type="button">
              start block
            </button>
          ) : null}
          <button className="ghost-button" onClick={() => onEdit(program)} type="button">
            rework
          </button>
        </div>
      </div>

      <section className="hero-panel">
        <div className="hero-panel__noise" />
        <div className="section-label">Program</div>
        <h2>{program.name}</h2>
        <p>{program.structure.summary}</p>
        <div className="hero-stats">
          <span>{program.days_per_week} days/week</span>
          <span>{program.experience_level}</span>
          <span>{program.status}</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-label">Progression Rules</div>
        <ul className="riot-list">
          {program.structure.progression_notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="section-label">Progressive Overload</div>
        <ul className="riot-list">
          {program.structure.overload_scheme.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      {sessions.map((session) => {
        const sessionKey = `${program.id}:${session.dayLabel}:${session.title}`;
        return (
          <section className="panel" key={sessionKey}>
            <div className="section-label">{session.dayLabel}</div>
            <h3>{session.title}</h3>
            <p className="session-focus">{session.focus}</p>
            <div className="exercise-stack">
              {session.exercises.map((exercise) => {
                const draft = getDraft(sessionKey, exercise);
                const key = `${sessionKey}:${exercise.name}`;
                return (
                  <article className="exercise-card" key={exercise.name}>
                    <div className="exercise-card__head">
                      <div>
                        <h4>{exercise.name}</h4>
                        <p>{exercise.category}</p>
                      </div>
                      <div className="exercise-badge">
                        {exercise.target.sets} x {exercise.target.reps}
                      </div>
                    </div>
                    <p className="muted-copy">
                      Weight {exercise.target.weight} • Rest {exercise.target.restSeconds}s
                      {exercise.target.intensity ? ` • ${exercise.target.intensity}` : ""}
                    </p>
                    {exercise.target.notes ? <p className="muted-copy">{exercise.target.notes}</p> : null}
                    <div className="log-grid">
                      <label>
                        Weight
                        <input
                          value={draft.performedWeight}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [key]: { ...draft, performedWeight: event.target.value },
                            }))
                          }
                          placeholder={exercise.target.weight}
                        />
                      </label>
                      <label>
                        Sets
                        <input
                          type="number"
                          min={1}
                          value={draft.performedSetsCount}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [key]: {
                                ...draft,
                                performedSetsCount: Number(event.target.value),
                              },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Reps
                        <input
                          value={draft.performedReps}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [key]: { ...draft, performedReps: event.target.value },
                            }))
                          }
                          placeholder={exercise.target.reps}
                        />
                      </label>
                      <label>
                        Effort
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={draft.effort}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [key]: { ...draft, effort: Number(event.target.value) },
                            }))
                          }
                        />
                      </label>
                      <label className="log-grid__notes">
                        Notes
                        <input
                          value={draft.notes}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [key]: { ...draft, notes: event.target.value },
                            }))
                          }
                          placeholder="Moved fast. Left one rep in the tank."
                        />
                      </label>
                    </div>
                    <button
                      className="cta-button cta-button--small"
                      disabled={savingKey === key}
                      onClick={() => handleSave(session, exercise)}
                      type="button"
                    >
                      {savingKey === key ? "saving..." : "log set results"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
