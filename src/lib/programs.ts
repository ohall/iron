import { z } from "zod";
import { supabase } from "./supabase";
import type { ExerciseLog, Program, ProgramStructure } from "../types";

export class MissingSchemaError extends Error {
  constructor(message = "Supabase schema is missing.") {
    super(message);
    this.name = "MissingSchemaError";
  }
}

const targetSchema = z.object({
  sets: z.number(),
  reps: z.string(),
  restSeconds: z.number(),
  intensity: z.string().optional(),
  notes: z.string().optional(),
});

const exerciseSchema = z.object({
  name: z.string(),
  category: z.string(),
  target: targetSchema,
});

const sessionSchema = z.object({
  title: z.string(),
  dayLabel: z.string(),
  focus: z.string(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema),
});

const structureSchema: z.ZodType<ProgramStructure> = z.object({
  summary: z.string(),
  progression_notes: z.array(z.string()),
  weeks: z.array(
    z.object({
      label: z.string(),
      objective: z.string(),
      sessions: z.array(sessionSchema),
    }),
  ),
});

function parseProgram(record: Record<string, unknown>): Program {
  return {
    id: String(record.id),
    name: String(record.name),
    goal: String(record.goal),
    experience_level: record.experience_level as Program["experience_level"],
    days_per_week: Number(record.days_per_week),
    status: record.status as Program["status"],
    started_at: (record.started_at as string | null) ?? null,
    created_at: String(record.created_at),
    updated_at: String(record.updated_at),
    structure: structureSchema.parse(record.structure),
  };
}

function normalizeSupabaseError(error: { code?: string; message?: string }) {
  if (
    error.code === "PGRST205" ||
    error.message?.includes("schema cache")
  ) {
    throw new MissingSchemaError(
      "Supabase is connected, but the workout tables have not been created yet.",
    );
  }

  throw error;
}

export async function listPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    normalizeSupabaseError(error);
  }

  return (data ?? []).map((item) => parseProgram(item));
}

export async function createProgram(input: Omit<Program, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("programs")
    .insert({
      name: input.name,
      goal: input.goal,
      experience_level: input.experience_level,
      days_per_week: input.days_per_week,
      status: input.status,
      started_at: input.started_at,
      structure: input.structure,
    })
    .select("*")
    .single();

  if (error) {
    normalizeSupabaseError(error);
  }

  return parseProgram(data);
}

export async function updateProgram(
  id: string,
  patch: Partial<Omit<Program, "id" | "created_at" | "updated_at">>,
) {
  const { data, error } = await supabase
    .from("programs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    normalizeSupabaseError(error);
  }

  return parseProgram(data);
}

export async function listLogs(programId: string) {
  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("program_id", programId)
    .order("completed_at", { ascending: false });

  if (error) {
    normalizeSupabaseError(error);
  }

  return (data ?? []) as ExerciseLog[];
}

export async function createExerciseLog(programId: string, log: Omit<ExerciseLog, "id">) {
  const { data, error } = await supabase
    .from("exercise_logs")
    .insert({
      program_id: programId,
      ...log,
    })
    .select("*")
    .single();

  if (error) {
    normalizeSupabaseError(error);
  }

  return data as ExerciseLog;
}
