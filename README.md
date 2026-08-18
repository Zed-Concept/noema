# Noema

TODO(owner) — one-line description not yet recorded.

Every agent and human working here reads [AGENTS.md](AGENTS.md) first.

## Supabase

The app talks to Supabase through one shared typed client,
`src/lib/supabase.ts`. It reads `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the environment and throws at load
if either is missing. Copy `.env.example` to `.env` (gitignored) and fill in
the staging values — they are owner-held and never committed.

**Generated types.** The client's generics come from
`src/lib/database.types.ts`. The committed file is a placeholder matching an
empty public schema; regenerate it after any schema change with:

    SUPABASE_PROJECT_REF=<project ref> npm run types:gen

This is owner-executed: the Supabase CLI authenticates with
`SUPABASE_ACCESS_TOKEN`, which builders do not hold. The project ref is read
from the environment at run time and is not committed anywhere.

**Connectivity check.** With the two `EXPO_PUBLIC_` variables set (Node 24+):

    npm run check:supabase

It instantiates the shared client against staging, performs unauthenticated
calls only, redacts the URL and key from all output, and exits 0 when every
check passes. It never runs in CI — CI has no Supabase credentials.
