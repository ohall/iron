export type ProgramStatus = "draft" | "active" | "archived";

export type Difficulty = "easy" | "moderate" | "hard";

export interface ExerciseTarget {
  sets: number;
  reps: string;
  restSeconds: number;
  intensity?: string;
  notes?: string;
}

export interface ExerciseDefinition {
  name: string;
  category: string;
  target: ExerciseTarget;
}

export interface SessionDefinition {
  title: string;
  dayLabel: string;
  focus: string;
  notes?: string;
  exercises: ExerciseDefinition[];
}

export interface WeekDefinition {
  label: string;
  objective: string;
  sessions: SessionDefinition[];
}

export interface ProgramStructure {
  summary: string;
  progression_notes: string[];
  weeks: WeekDefinition[];
}

export interface Program {
  id: string;
  name: string;
  goal: string;
  experience_level: Difficulty;
  days_per_week: number;
  status: ProgramStatus;
  started_at: string | null;
  created_at: string;
  updated_at: string;
  structure: ProgramStructure;
}

export interface ExerciseLog {
  id: string;
  session_key: string;
  exercise_name: string;
  performed_sets: string;
  effort: number;
  notes: string;
  completed_at: string;
}

export interface ProgramDraftInput {
  name: string;
  goal: string;
  experienceLevel: Difficulty;
  daysPerWeek: number;
}

export interface AiProgramRequest {
  prompt: string;
  currentProgram?: ProgramStructure;
  changeRequest?: string;
}

export interface GeneratedProgramPayload extends ProgramDraftInput {
  structure: ProgramStructure;
}
