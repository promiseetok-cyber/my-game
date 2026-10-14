# NIGERIA 2027 — browser political and public-life sim prototype

An original, playable vertical slice of a cinematic Nigerian public-life simulation. It uses React for the game interface, Three.js for the procedural 3D story district, MapLibre GL JS for an optional live 3D geographic view, and Node/Express + Socket.IO for realtime presence, direct messages and civic meetings. The live map uses OpenFreeMap vector tiles derived from OpenStreetMap; it needs no Google key. Optional Supabase Auth/Postgres integration adds accounts and persistent profiles/messages when configured.

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

- Start-role onboarding offers a registered-party political participant or fictional non-partisan personnel perspectives in **INEC/SIEC election administration, the judiciary, or the CBN**. Institutional roleplay is not real employment or an appointment and has no separate promotion/office ladder; players may voluntarily switch later into the one existing political ladder. Every start receives a **₦1,000,000 fictional fund**.
- Political characters may choose among all **22 parties in the INEC registered-party register snapshot checked 11 October 2026**, including each acronym and logo. INEC-published national chair and secretary fields link back to the official register; local branches and local executives are explicitly fictional.
- One continuous 12-stage political ladder from a shared civic opening (no office awarded) through party congress, councillor, state assembly, House of Representatives, Senate, internal legislative leadership, a competitive merit review, governorship and the fictional presidential contest. Every office stage has a visible in-game entry fee, a rival/competitive result, and a single active current position; the previous position must be vacated before the next contest.
- Judiciary, INEC, State Independent Electoral Commissions and CBN story encounters work both as optional perspectives from the political route and as short institutional roleplay scenes. They never create a parallel institutional ladder, real appointment, statutory authority, or free political office. Switching from institutional roleplay opens chapter 1 of the same political ladder; later offices still require paid contests.
- Campaign actions now launch story scenes at 3D venues. Players type public statements, reply to fictional speakers and choose an approach before the in-game effects apply.
- Town halls are realtime meeting rooms: connected players can travel to the selected locality, deliver typed speeches, reply to one another, cast a meeting-direction vote, and publish an outcome shaped by the room’s responses. Votes set the meeting record; a transparent prototype rule uses specific plan/evidence/listening/accountability cues versus dismissive wording to adjust trust. Players can DM and invite nearby players to an open meeting.
- A legal desk with evidence preparation and a simplified election-petition outcome. Only simulated public-election losses can open the petition route; it models uncertainty and due process and is not legal advice.
- A differentiated 3D district for every state and the FCT. Biome palettes, relief, waterways, building styles, vegetation, settlement density, transit and a state-signature landmark are selected per state; scenes are procedurally varied by the chosen locality. Akwa Ibom, for example, uses a humid coastal-creek profile rather than a generic northern or plateau scene.
- A lazy-loaded **state → LGA → ward** explorer. Only the currently selected state's compact JSON is fetched; players can choose any of the **774 LGAs** and **8,809 named electoral wards / registration areas** to regenerate and enter a distinct stylised 3D neighbourhood. The directory data is not a full village gazetteer.
- A switchable **LIVE MAP** view powered by MapLibre GL JS and OpenFreeMap. It centers on the selected ward's approximate representative point, renders mapped roads/places, offers four free vector-map styles, and extrudes mapped buildings in 3D when height data exists. Map labels/features are OpenStreetMap-derived; their completeness varies by locality.
- Tap-to-enter doors open explorable interiors for generated homes, stadiums, buses, cars, planes, civic venues and state-signature landmarks, with the player avatar visibly inside. Every rendered ward also has a physical branded office for each of the 22 registered parties; the branch street and six local executive names per party are simulated gameplay content, not verified real-world offices/officeholders. The INEC-published national chair and secretary fields remain separate and dated.
- A schematic atlas with **all 36 states and the FCT**, their capitals, six geopolitical zones, and a state-by-state travel loop. It links the capital directory to the LGA/ward explorer.
- An office directory distinguishing public elections from party-internal titles, legislative leadership, executive appointments, and non-partisan institutions; the live-world party directory shows the dated INEC register snapshot alongside simulated local branches.
- Research cards covering the 2023 election-observation findings, party primaries, vote-buying law, court challenges, identity rhetoric, off-cycle elections, and the official 2027 dates.
- Guest saves in this browser preserve the starting role and optional party switch. Optional Supabase email/password signup/login and server-side profile autosave also preserve role fields; real accounts need deployment secrets and `supabase/schema.sql` (see [ACCOUNT_SETUP.md](ACCOUNT_SETUP.md)).
- Socket.IO room presence, avatar movement, locality-scoped world chat, online-player DMs, meeting invites, speeches, replies and votes. Without Supabase configuration, accounts are unavailable and guest chat/DM/meeting records are temporary.

### Controls

- **Mobile / Android touchscreen:** tap ground to walk or tap a marked door to approach and enter; drag the 3D view to orbit; pinch to zoom. The player, pedestrians and remote avatars use articulated, animated legs while walking. No keyboard is required. Scroll outside the 3D viewport to reach venues, missions, party offices and the ward directory.
- **Desktop:** WASD or arrow keys to move in the Story World; click a ground point or venue to walk; drag to orbit; scroll to zoom.
- **LIVE MAP:** pan and zoom the OpenFreeMap basemap; MapLibre navigation controls adjust zoom/bearing/pitch. Use the style selector and **3D ON/OFF** control for alternate free styles and building extrusions.
- Use **State Atlas** to travel to another capital; in the live world, use the LGA selector and ward directory to move between localities.

## National locality data and procedural scenes

The app stores the split-by-state directory in `public/data/locations/`: `index.json` plus one compact JSON file per state/FCT. It fetches a state's file on demand rather than loading all 8,809 records up front. The source is [temikeezy/nigeria-geojson-data](https://github.com/temikeezy/nigeria-geojson-data), used under its MIT license; attribution and the license are included beside the data. The source contains 37 states/FCT, 774 LGAs and 8,809 named wards/registration areas with representative points. `Nassarawa` is normalized to `Nasarawa`, and a handful of abbreviated/misspelled LGA labels are expanded for display; ward records and coordinates are retained. See `public/data/locations/README.md` for source and label-normalization notes.

Those records identify electoral wards/registration areas; they are **not** an exhaustive list of villages, streets, homes, polling units, or legal administrative boundaries. A representative coordinate is an approximate map center, not a surveyed address or ward polygon.

The **3D Story World** uses fictional procedural roads, blocks, buildings and landmark treatments, with 37 state/FCT environment profiles in `src/stateWorldProfiles.js` and deterministic LGA/ward/community variation in `src/localityStyles.js`. That locality layer varies palette, building forms, road plan/width, roadside markets, a small locality landmark and the mix of vehicles (including danfo, BRT, keke, okada, buses, pickups and—where appropriate—water taxis). The current camera starts in a bright, low third-person road view inspired by the supplied Nigerian traffic reference. These generated details are art direction, not surveyed assets. The separate **LIVE MAP** uses OpenFreeMap's OpenStreetMap-derived vector tiles to show mapped roads, labels and places. Map coverage varies; many Nigerian buildings have no height metadata, so 3D extrusions will be sparse in some wards. Neither view should be treated as a surveyed GIS, engineering record, election boundary, or complete landmark register.

### Free live-map stack

- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) is the open-source WebGL renderer.
- [OpenFreeMap](https://openfreemap.org/) supplies the public vector-tile styles (Liberty, Bright, Positron and Dark) from OpenStreetMap data. Its official site currently states that the public instance needs no key/registration and lists no request/view limits; it is donation-funded and has **no SLA**, so availability and terms are not guaranteed. The map requires an internet connection.
- MapLibre's style attribution is shown in the map controls: OpenFreeMap / OpenMapTiles / OpenStreetMap contributors. The underlying OpenStreetMap data is ODbL-licensed.
- OpenFreeMap is a tile/style source, not a geocoder or directions/routing service. This integration does **not** use Google Maps Studio or Google map content. If a different provider is needed later, MapLibre can keep the renderer while the style/tile source is swapped.

## Multiplayer and accounts boundary

The realtime server supports locality-scoped presence, movement, world chat, direct messages, and typed civic meetings in a single Node process. If `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the SQL schema are configured, Supabase Auth provides account sessions and Postgres stores profiles, eligible account-to-account DMs, meeting records, speeches, votes and outcomes. The service-role key is server-only. Setup is documented in [ACCOUNT_SETUP.md](ACCOUNT_SETUP.md).

Without those deployment variables, the game deliberately falls back to guests: browser-local profile saves and in-memory realtime messages/meetings. It does not pretend those are durable accounts. The current prototype is not a production MMO; it still lacks matchmaking, moderation tooling, authoritative economy transactions, abuse review, recovery support beyond the identity provider, and horizontal scaling. The ₦1,000,000 start balance is fictional and never connected to real money.

Before a public MMO launch, the next engineering steps include account recovery/privacy safeguards, rate limiting and moderation, authoritative server-side campaign/economy validation, load tests and multi-instance Socket.IO scaling.
4. Add Redis/Socket.IO adapter or a dedicated room service for cross-node presence and state fan-out; partition the world into regional/capital instances rather than broadcasting every player to every player.
5. Add rate limits, anti-cheat validation, moderation/reporting, audit trails, backups, observability, load tests, and incident response.
6. Deploy behind TLS/WAF/load balancing with autoscaling and tested recovery procedures.

This sequence is required before describing the product as a massive multiplayer game. The included server is a foundation for iteration, not that finished infrastructure.

## Research and design guardrails

The civic desk includes links to the INEC election calendar and FAQ, the EU Election Observation Mission’s 2023 final report, the Electoral Act 2022 (PLAC-hosted copy), coverage of the 2023 Supreme Court ruling, and Freedom House’s 2025 country report. As of **11 October 2026**, INEC lists Presidential/National Assembly elections for **16 January 2027** and Governorship/State House of Assembly elections for **6 February 2027**. No real 2027 outcome is represented.

“Dirty politicking” is framed as reported practices and institutional pressure points—not as an inherent Nigerian cultural trait. The vote-buying mechanic is abstract, explicitly illegal/high-risk, and provides no operational guidance. Real communities are not treated as uniform ethnic, religious, regional, or voting blocs. Party names, acronyms, logos and the published national chair/secretary fields are copied from the INEC register snapshot checked 11 October 2026; local branch locations, local executive characters, candidate endorsements and election/appointment results are fictional. Registered-party status is not a guarantee of final 2027 ballot or candidate eligibility.

## Verification status · 13 October 2026

- `npm run build` passes with Vite 6.4.4 after the locality graphics and interior updates.
- Chromium headless QA with software WebGL confirmed the React/Three.js world starts without page exceptions or console errors. The 22-party directory renders; entering an INEC-branded fictional ward office opens the interior with six clearly simulated local executives, and the exit returns to the exterior.
- Mobile emulation at 390 × 844 showed the 3D canvas and touch hints with no horizontal page overflow.
- A deterministic-data audit found 22 registered parties, 22 generated party-office placements, 132 fictional executive roles in the tested locality and 132 unique names.
- Previous contest-flow checks used synthetic test profiles: keeping the current office cancels without charge; confirming entry charges the displayed fee; a win replaces the prior office with exactly one new office; a loss charges the fee and leaves no current office. Both outcomes include a rival and are labelled fictional.
- Building, road-vehicle, venue, state-landmark and locality-hub portals are present. Entry/exit QA was repeated on the party-office path; every other physical portal variant has not yet been exhaustively tested.

## Project structure

```text
src/
  App.jsx       React UI, career simulation, research/atlas screens, Socket.IO client
  World.jsx     procedural Three.js story world and player movement
  MapLibreWorld.jsx live MapLibre/OpenFreeMap geographic view with optional 3D building extrusions
  data.js       state/capital data, one political ladder, side stories, offices, scenes and research notes
  partyRegistry.js dated INEC registered-party snapshot: names, acronyms, national officers and logo paths
  partyBranches.js fictional local-roster generator with one unique person per branch position
  localityStyles.js repeatable LGA/ward palette, road, market and vehicle-mix profiles
  stateWorldProfiles.js biome and architectural profiles for 37 state/FCT scenes
  style.css     responsive game UI, story/meeting/account surfaces
  locality.css  responsive LGA/ward explorer
public/data/locations/
  index.json    coverage counts and state file slugs
  *.json        one lazy-loadable state/FCT LGA → ward directory per file
public/data/party-logos/
  *             downloaded logo assets from INEC's registered-party pages
server/
  server.js     Express auth/profile API, persistence adapter and Socket.IO story rooms
supabase/
  schema.sql    account profile, direct-message and meeting tables with RLS policies
ACCOUNT_SETUP.md Supabase/Render configuration and guest-mode boundary
vite.config.js Vite host/proxy/build configuration
```
