# IRON

Mobile-first workout tracking for a local internal deployment.

## Product shape

- Supabase stores programs and workout logs.
- OpenRouter is only used when creating or modifying a workout program.
- Session logging and progression tracking do not call AI.
- No auth layer is included.
- Visual direction is loud, flat, and 90s punk/hardcore.

## Stack

- React + Vite + TypeScript
- Express server for the OpenRouter boundary
- Supabase JS client

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `OPENROUTER_API_KEY`.
3. Apply [supabase/schema.sql](/Users/oakley/Documents/projects/iron/supabase/schema.sql:1) in your Supabase SQL editor.
4. Install dependencies with `npm install`.
5. Run `npm run dev`.

## Deployment note

This schema disables RLS on the app tables because the product intentionally has no auth layer. That is only appropriate for the internal/local deployment model you described.

## Architecture

- `src/lib/programs.ts` talks to Supabase for program and log CRUD.
- `server/index.ts` handles the only AI endpoint: `/api/programs/generate`.
- `server/index.ts` also exposes setup helpers at `/api/setup/status` and `/api/setup/bootstrap`.
- `src/components/ProgramComposer.tsx` is the only UI surface allowed to trigger AI.
- `src/components/ProgramView.tsx` logs workout results directly with no model involvement.
