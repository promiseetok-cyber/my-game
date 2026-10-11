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
- A procedural isometric-style 3D capital district with walk controls, drag-to-orbit camera, clickable venues, roads, a flyover, animated traffic, pedestrians, a market, civic buildings, airport/plane, and stadium.
- A schematic atlas with **all 36 states and the FCT**, their capitals, six geopolitical zones, and a state-by-state travel loop. The 3D city is generated art, not a survey-grade map.
- An office directory distinguishing public elections from party-internal titles, legislative leadership, executive appointments, and non-partisan institutions.
- Research cards covering the 2023 election-observation findings, party primaries, vote-buying law, court challenges, identity rhetoric, off-cycle elections, and the official 2027 dates.
- Local browser save for the candidate’s career and finances.
- Socket.IO room presence, avatar movement, and world chat across tabs/players on the same running demo server.

### Controls

- **Mobile:** drag the on-screen joystick to walk; tap a ground point or venue to move there. Swipe the 3D view to orbit and pinch to zoom. Scroll the page outside the 3D viewport to reach venues, missions, and the atlas.
- **Desktop:** WASD or arrow keys to move; click a ground point or venue to walk; drag to orbit; scroll to zoom.
- Use **State Atlas** to travel to another capital.

## Multiplayer boundary

The running backend is intentionally a **single-process, in-memory demo**. It supports lightweight world presence, movement intents, and chat for a small test room. It does not yet include accounts, durable player saves, matchmaking, payments, content moderation, authoritative economy transactions, or horizontal scaling. The ₦1,000,000 start balance is a local demo value; it is not connected to a real registration or money system.

Before a public MMO launch, the next engineering steps would be:

1. Add identity/authentication, account recovery, session security, and age/privacy safeguards.
2. Move movement, campaign actions, inventory, and transaction validation to authoritative game services; never trust client balances.
3. Add Postgres persistence and migrations, then pool connections (e.g. PgBouncer) for production workloads.
4. Add Redis/Socket.IO adapter or a dedicated room service for cross-node presence and state fan-out; partition the world into regional/capital instances rather than broadcasting every player to every player.
5. Add rate limits, anti-cheat validation, moderation/reporting, audit trails, backups, observability, load tests, and incident response.
6. Deploy behind TLS/WAF/load balancing with autoscaling and tested recovery procedures.

This sequence is required before describing the product as a massive multiplayer game. The included server is a foundation for iteration, not that finished infrastructure.

## Research and design guardrails

The civic desk includes links to the INEC election calendar and FAQ, the EU Election Observation Mission’s 2023 final report, the Electoral Act 2022 (PLAC-hosted copy), coverage of the 2023 Supreme Court ruling, and Freedom House’s 2025 country report. As of **10 October 2026**, INEC lists Presidential/National Assembly elections for **16 January 2027** and Governorship/State House of Assembly elections for **6 February 2027**. No real 2027 outcome is represented.

“Dirty politicking” is framed as reported practices and institutional pressure points—not as an inherent Nigerian cultural trait. The vote-buying mechanic is abstract, explicitly illegal/high-risk, and provides no operational guidance. Real communities are not treated as uniform ethnic, religious, regional, or voting blocs. All in-game parties, NPCs, endorsements, and results are invented.

## Project structure

```text
src/
  App.jsx       React UI, career simulation, research/atlas screens, Socket.IO client
  World.jsx     procedural Three.js world and player movement
  data.js       state/capital data, offices, chapters, NPCs, research notes
  style.css     complete responsive game UI
server/
  server.js     Express health endpoint and small Socket.IO room server
vite.config.js Vite host/proxy/build configuration
```
