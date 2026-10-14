# Account-backed story mode setup

The game now has an optional Supabase Auth + Postgres integration. Without deployment credentials it stays playable as a **guest preview**; guest profiles are browser-local and multiplayer meetings/DMs are session-only. The UI must not describe those guest records as accounts or cloud saves.

## Enable accounts and persistence

1. Create a Supabase project and configure its Auth email/password provider. Use the project URL, the public anon key, and the service-role key from Project Settings → API. Set Supabase Auth’s Site URL and allowed redirect URLs to the deployed game URL (and your local Vite URL for development) so email confirmation returns to the game.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Add these variables to the server deployment (Render → service → Environment):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Restart/redeploy the service, then check `/api/config`. `authEnabled` and `persistenceEnabled` should both be `true`.
5. For local development, provide the same values to the Node server using a local `.env` loader or shell environment. Do not commit `.env`.

Passwords are submitted to Supabase Auth over HTTPS and are never stored by this game server. The service-role key is read only by `server/server.js` and is never returned by `/api/config`. The server verifies access tokens with Supabase before attaching an account identity to a realtime socket. Database calls use the service role and server-side ownership checks; keep that key private and rotate it if it is ever exposed.

## What persists

- Candidate profile, fictional campaign purse, political-ladder progress, current state and story day.
- Authenticated direct messages, meeting records, meeting speeches/replies, votes, and meeting outcomes when the meeting host and sender have signed in.
- Guest meetings may be visible while the server process is running but are not cloud-saved. Anonymous world chat is also ephemeral.

The ₦1,000,000 starter purse is fictional game currency, is not redeemable, and cannot be transferred as real money. No payment/transfer API is part of this project.

## Career-structure notes

There is one continuous political ladder, from the shared youth/community opening through local government, legislatures and the fictional presidential contest. The judiciary, INEC, State Independent Electoral Commissions and CBN appear as separate side stories and institutional perspectives; they do not replace, branch or advance the player's political career. Judges, election officials and central-bank leaders are not public-ballot campaign offices. Side-story scenes are fictional civic encounters, not real appointments, legal qualification, job offers, or forecasts. Structural notes live in `src/data.js` (`CHAPTERS`, `OTHER_SIDE_STORIES`, and `OFFICE_CATALOG`).
