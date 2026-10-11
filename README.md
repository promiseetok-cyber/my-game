# NIGERIA 2027 — browser political life-sim prototype

An original, playable vertical slice of a cinematic Nigerian political-career simulation. It uses React for the game interface, Three.js for a procedural 3D city district, and Node/Express + Socket.IO for a small real-time presence/chat prototype.

> This is a pre-alpha prototype—not a production MMO, a real election simulator, or an endorsement of any party or candidate. The 2027 storyline is fictional. The bonus is in-game only.

## Run locally

```bash
npm install
npm run server
```

In a second terminal:

```bash
npm run dev
```

Open the Vite URL printed in the terminal. Vite proxies `/api` and `/socket.io` to the demo server on port `4100`.

Production bundle:

```bash
npm run build
npm run preview
```

## Public preview from GitHub (Render)

GitHub stores the source but does not run this React/Three.js game. Because the prototype also uses an Express + Socket.IO server, GitHub Pages alone is not enough. This repository includes a `render.yaml` Blueprint so Render can build and run the frontend and realtime demo server together.

1. Sign in to [Render](https://render.com/) using GitHub and authorize access to `promiseetok-cyber/my-game`.
2. In the Render dashboard, choose **New → Blueprint** and select this repository.
3. Review the `nigeria-2027-preview` service and choose **Apply** / **Deploy**.
4. When the deploy is live, open the `onrender.com` URL shown on the service page. The same link works on desktop and mobile.

The Blueprint runs `npm ci && npm run build`, starts the Express/Socket.IO server, and checks `/api/health`. Later pushes to `main` can trigger redeploys. This is a small demo service: world presence/chat is in-memory and may reset when the service restarts.

## What is playable now

- New-candidate onboarding with a **₦1,000,000 fictional seed fund** and three invented parties.
- A 12-chapter career arc from ward organising and party congresses through council, state and federal contests, internal legislative leadership, an appointment, a governorship, a presidential primary, and a fictional national election.
- Reusable campaign moves: town halls, community service, policy lab, coalition talks, public rallies, senior consultations, rest, and a high-risk abstract bribery event.
- A legal desk with evidence preparation and a simplified election-petition outcome. It models uncertainty and due process; it is not legal advice.
- A differentiated 3D district for every state and the FCT. Biome palettes, relief, waterways, building styles, vegetation, settlement density, transit and a state-signature landmark are selected per state; scenes are procedurally varied by the chosen locality. Akwa Ibom, for example, uses a humid coastal-creek profile rather than a generic northern or plateau scene.
- A lazy-loaded **state → LGA → ward** explorer. Only the currently selected state's compact JSON is fetched; players can choose any of the **774 LGAs** and **8,809 named electoral wards / registration areas** to regenerate and enter a distinct stylised 3D neighbourhood. The directory data is not a full village gazetteer.
- Eight venue cards—Ward Office, Community Square, Market Street, Petition Court, Stadium, Airport, Assembly, and Party/Caucus House—animate the camera toward that location and walk the candidate to its approach. Tapping a venue in the 3D scene does the same. On mobile, choosing a card scrolls the 3D view into sight.
- A schematic atlas with **all 36 states and the FCT**, their capitals, six geopolitical zones, and a state-by-state travel loop. It links the capital directory to the LGA/ward explorer.
- An office directory distinguishing public elections from party-internal titles, legislative leadership, executive appointments, and non-partisan institutions.
- Research cards covering the 2023 election-observation findings, party primaries, vote-buying law, court challenges, identity rhetoric, off-cycle elections, and the official 2027 dates.
- Local browser save for the candidate’s career and finances.
- Socket.IO room presence, avatar movement, and world chat across tabs/players on the same running demo server.

### Controls

- **Mobile:** drag the on-screen joystick to walk; tap a ground point or venue to move there. Swipe the 3D view to orbit and pinch to zoom. Scroll the page outside the 3D viewport to reach venues, missions, and the atlas.
- **Desktop:** WASD or arrow keys to move; click a ground point or venue to walk; drag to orbit; scroll to zoom.
- Use **State Atlas** to travel to another capital; in the live world, use the LGA selector and ward directory to move between localities.

## National locality data and procedural scenes

The app stores the split-by-state directory in `public/data/locations/`: `index.json` plus one compact JSON file per state/FCT. It fetches a state's file on demand rather than loading all 8,809 records up front. The source is [temikeezy/nigeria-geojson-data](https://github.com/temikeezy/nigeria-geojson-data), used under its MIT license; attribution and the license are included beside the data. The source contains 37 states/FCT, 774 LGAs and 8,809 named wards/registration areas with representative points. `Nassarawa` is normalized to `Nasarawa`, and a handful of abbreviated/misspelled LGA labels are expanded for display; ward records and coordinates are retained. See `public/data/locations/README.md` for source and label-normalization notes.

Those records identify electoral wards/registration areas; they are **not** an exhaustive list of villages, streets, homes, polling units, or legal administrative boundaries. A representative coordinate helps distinguish and seed a selected locality's generated scene. It does not place individual buildings on surveyed parcels or make the scene a navigable GIS map. Roads, landmark treatments, block layouts, and neighbourhood details are fictional procedural art. State-specific environment profiles live in `src/stateWorldProfiles.js`.

## Story mode, accounts, and multiplayer boundary

The player follows **one continuous political ladder** from the shared Youth Leader/community-organising opening through party and public contests, council, state/federal legislature, appointed political service, Governor, party nomination and a speculative presidential scenario. Judiciary, INEC, SIEC and CBN are the **other side of the story**: optional, typed civic episodes with fictional institutional characters. They are not alternate player ladders, and they do not turn the player into a judge, election administrator or central-bank appointee. The game keeps elections, internal selections and statutory appointments distinct.

Campaign actions now route into location-based story scenes. Town Hall opens a realtime public meeting where players can travel to the venue, deliver typed speeches, reply, vote on the outcome and invite another player by DM. Service, coalition, policy, rally and senior-consultation scenes require a written response and a consequential choice rather than immediately changing stats.

The Socket.IO server currently supports small-room world presence, movement, locality-scoped chat, live meetings, replies/votes, meeting invitations and direct messages. With no account credentials configured, guest profiles stay in this browser and meeting/DM state is session-only. This is a clear guest preview, not an account. An optional Supabase Auth + Postgres integration is included for secure sign-up/sign-in, saved campaign profiles, and persistent authenticated messages/meeting records. To enable it, run `supabase/schema.sql` and configure the server-only values described in [`ACCOUNT_SETUP.md`](ACCOUNT_SETUP.md). Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend variables or source control.

The ₦1,000,000 starter purse and every action cost are fictional game values. There is no payment, attendee-compensation, wallet-transfer, withdrawal, real registration, or real-world campaign-finance API. The server remains a single-process prototype; it does not yet provide matchmaking, horizontal scaling, comprehensive content moderation, authoritative campaign-economy validation, rate-limited production messaging, or a production incident/recovery system. It is not a finished MMO.

Validation in this workspace: `npm run build` passes; the local server health/config routes and unauthenticated guest smoke tests passed for world presence, direct messages, meeting invitations, typed meeting speech, votes, and host close. Supabase signup, account saves, RLS/schema behavior, cross-session DMs, and cloud meeting records are **not verified** because this environment has no Supabase credentials. Do not treat account-backed persistence as live until the setup checklist passes against a configured project.

Before a larger public multiplayer launch, add a production Socket.IO adapter/room service, server-authoritative progression/economy checks, scalable rate limits, moderation/reporting, audit trails, backups, observability, load tests, and tested recovery procedures. Keep TLS, account recovery and privacy safeguards in place.

## Research and design guardrails

The civic desk includes links to the INEC election calendar and FAQ, the EU Election Observation Mission’s 2023 final report, the Electoral Act 2022 (PLAC-hosted copy), coverage of the 2023 Supreme Court ruling, and Freedom House’s 2025 country report. As of **11 October 2026**, INEC lists Presidential/National Assembly elections for **16 January 2027** and Governorship/State House of Assembly elections for **6 February 2027**. No real 2027 outcome is represented.

“Dirty politicking” is framed as reported practices and institutional pressure points—not as an inherent Nigerian cultural trait. The vote-buying mechanic is abstract, explicitly illegal/high-risk, and provides no operational guidance. Real communities are not treated as uniform ethnic, religious, regional, or voting blocs. All in-game parties, NPCs, endorsements, and results are invented.

## Project structure

```text
src/
  App.jsx       React UI, career simulation, research/atlas screens, Socket.IO client
  World.jsx     procedural Three.js world and player movement
  data.js       state/capital data, offices, political chapters, story scenes and research notes
  careerTracks.js single political ladder plus institutional side-story arcs
  stateWorldProfiles.js biome and architectural profiles for 37 state/FCT scenes
  style.css     responsive game UI, account panels and story/meeting room
  locality.css  responsive LGA/ward explorer
public/data/locations/
  index.json    coverage counts and state file slugs
  *.json        one lazy-loadable state/FCT LGA → ward directory per file
server/
  server.js     Express auth/profile API, Supabase persistence adapter and Socket.IO story rooms
supabase/
  schema.sql    Supabase Auth-linked profile, DM, meeting, message, participant and vote tables/RLS
ACCOUNT_SETUP.md  optional account/database deployment steps
vite.config.js Vite host/proxy/build configuration
```
