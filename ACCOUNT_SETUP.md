# Account-backed story mode setup

The game now has an optional Supabase Auth + Postgres integration. Without deployment credentials it stays playable as a **guest preview**; guest profiles are browser-local and multiplayer meetings/DMs are session-only. The UI must not describe those guest records as accounts or cloud saves.

## Enable accounts and persistence

1. Create a Supabase project and configure its Auth email/password provider. Use the project URL, the public anon key, and the service-role key from Project Settings → API.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Add these variables to the server deployment (Render → service → Environment):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Restart/redeploy the service, then check `/api/config`. `authEnabled` and `persistenceEnabled` should both be `true`.
5. For local development, provide the same values to the Node server using a local `.env` loader or shell environment. Do not commit `.env`.

Passwords are submitted to Supabase Auth over HTTPS and are never stored by this game server. The service-role key is read only by `server/server.js` and is never returned by `/api/config`. The server verifies access tokens with Supabase before attaching an account identity to a realtime socket. Database calls use the service role and server-side ownership checks; keep that key private and rotate it if it is ever exposed.

## What persists

- Candidate profile, fictional campaign purse, career branch/progress, current state and story day.
- Authenticated direct messages, meeting records, meeting speeches/replies, votes, and meeting outcomes when the meeting host and sender have signed in.
- Guest meetings may be visible while the server process is running but are not cloud-saved. Anonymous world chat is also ephemeral.

The ₦1,000,000 starter purse is fictional game currency, is not redeemable, and cannot be transferred as real money. No payment/transfer API is part of this project.

## Career-structure notes

The shared first chapter is a civic/Youth Leader opening; it is not represented as a public elected office. Political offices, party/internal roles, statutory appointments, professional legal service, and independent public institutions remain different routes. Judiciary, INEC/SIEC and CBN stages are fictional, accelerated story reviews—not real appointments, legal qualification, job offers, or forecasts. See `src/careerTracks.js` for the route notes and in-game caveats.
