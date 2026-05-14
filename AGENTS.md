# AGENTS.md

This file is written for a less capable coding model or automation agent that needs explicit, low-ambiguity instructions to deploy and maintain this project on a local internal server.

## Project intent

- App name: `IRON`
- Purpose: mobile-first workout tracking
- Storage: Supabase
- AI usage: only for program creation or program modification
- No auth: this is intentionally optimized for a trusted internal/local deployment
- Visual direction: 90s punk / hardcore, not generic SaaS

## Non-negotiable product rules

- Do not add AI to workout logging, progression tracking, completion scoring, or history views.
- Only call OpenRouter from the server.
- Do not expose the OpenRouter key in browser code.
- Do not expose a Supabase service-role key in browser code.
- Keep the UI usable on a phone first. Desktop is secondary.
- Preserve the no-auth assumption unless the user explicitly asks to change it.

## File map

- Client entry: [src/main.tsx](/Users/oakley/Documents/projects/iron/src/main.tsx:1)
- Main app shell: [src/App.tsx](/Users/oakley/Documents/projects/iron/src/App.tsx:1)
- Program prompt UI: [src/components/ProgramComposer.tsx](/Users/oakley/Documents/projects/iron/src/components/ProgramComposer.tsx:1)
- Program detail and logging UI: [src/components/ProgramView.tsx](/Users/oakley/Documents/projects/iron/src/components/ProgramView.tsx:1)
- Supabase CRUD client: [src/lib/programs.ts](/Users/oakley/Documents/projects/iron/src/lib/programs.ts:1)
- OpenRouter client call wrapper: [src/lib/ai.ts](/Users/oakley/Documents/projects/iron/src/lib/ai.ts:1)
- Setup/bootstrap client calls: [src/lib/setup.ts](/Users/oakley/Documents/projects/iron/src/lib/setup.ts:1)
- Server entry: [server/index.ts](/Users/oakley/Documents/projects/iron/server/index.ts:1)
- Server-side DB bootstrap helpers: [server/db.ts](/Users/oakley/Documents/projects/iron/server/db.ts:1)
- Schema source of truth: [supabase/schema.sql](/Users/oakley/Documents/projects/iron/supabase/schema.sql:1)
- Local env example: [.env.example](/Users/oakley/Documents/projects/iron/.env.example:1)

## Required environment variables

Browser-visible variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only variables:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `PORT`
- `SUPABASE_DB_URL`

Important:

- `VITE_SUPABASE_URL` must be the base project URL like `https://<project-ref>.supabase.co`
- Do not use the Postgres connection string as `VITE_SUPABASE_URL`
- `SUPABASE_DB_URL` is optional for normal runtime, but required if you want the server to bootstrap the database schema automatically

## Local server deployment

Assume the target server is a trusted machine on a local network. Follow these steps exactly.

1. Install Node.js 20+.
2. Clone the repository.
3. Create `.env` from `.env.example`.
4. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY`
   - `SUPABASE_DB_URL` if automatic schema bootstrap is desired
5. Run `npm install`.
6. Run `npm run build`.
7. For development, run `npm run dev`.
8. For a simple local deployment, run a process manager that starts:
   - the API server from this repo
   - a static file server for `dist/`

## Recommended local deployment pattern

If the agent is weak, do not invent infrastructure. Use this pattern:

1. Build frontend assets with `npm run build`.
2. Run the Express server on the internal machine.
3. Put a reverse proxy like Nginx or Caddy in front of it.
4. Serve `dist/` as static assets.
5. Proxy `/api/*` to the Express server.

The safer simple deployment is to add a small static-file serving route to Express if the user asks for a single-process deployment. Do not make that change unless requested.

## First-run bootstrap

There are two valid setup paths.

Manual path:

1. Open Supabase SQL editor.
2. Paste [supabase/schema.sql](/Users/oakley/Documents/projects/iron/supabase/schema.sql:1).
3. Run it.

Automatic path:

1. Set `SUPABASE_DB_URL` in `.env`.
2. Start the server.
3. Open the app.
4. If the setup panel appears, click `bootstrap schema`.

## How to verify setup

Use these checks in order.

1. `npm run check`
2. `npm run build`
3. Open the app at `http://localhost:5173` during dev
4. Confirm the home screen does not show a Supabase error
5. Create a new prompt-only program
6. Confirm the program saves and appears in Drafts
7. Start the block
8. Log one exercise result
9. Reload the page and confirm the saved program still appears

## Common failure modes

If the app says the schema is missing:

- Check whether `public.programs` and `public.exercise_logs` exist
- Apply [supabase/schema.sql](/Users/oakley/Documents/projects/iron/supabase/schema.sql:1)
- If relying on auto-bootstrap, verify `SUPABASE_DB_URL` is set correctly

If Supabase requests 404 with `PGRST205`:

- The table does not exist in the exposed schema cache
- This is a schema/bootstrap problem, not a frontend problem

If OpenRouter fails:

- Verify `OPENROUTER_API_KEY`
- Verify the selected `OPENROUTER_MODEL`
- Confirm requests are going to `/api/programs/generate`, not directly from the browser to OpenRouter

If a weaker model is modifying this app:

- Do not refactor broad areas at once
- Change one layer at a time
- Run `npm run check` after each meaningful edit
- Preserve the AI boundary
- Preserve the mobile-first layout

## Safe editing rules for future agents

- Prefer changing existing files over inventing new abstraction layers.
- Keep data contracts explicit in [src/types.ts](/Users/oakley/Documents/projects/iron/src/types.ts:1).
- If changing the AI response shape, update:
  - [server/index.ts](/Users/oakley/Documents/projects/iron/server/index.ts:1)
  - [src/lib/ai.ts](/Users/oakley/Documents/projects/iron/src/lib/ai.ts:1)
  - [src/types.ts](/Users/oakley/Documents/projects/iron/src/types.ts:1)
  - [src/App.tsx](/Users/oakley/Documents/projects/iron/src/App.tsx:1)
- If changing storage behavior, update:
  - [src/lib/programs.ts](/Users/oakley/Documents/projects/iron/src/lib/programs.ts:1)
  - [supabase/schema.sql](/Users/oakley/Documents/projects/iron/supabase/schema.sql:1)
  - this file

## What not to do

- Do not add auth silently.
- Do not move AI calls into the client.
- Do not replace Supabase with local storage unless the user explicitly asks for it.
- Do not remove the schema bootstrap path once added.
- Do not weaken the setup instructions into vague prose. Keep them procedural.
