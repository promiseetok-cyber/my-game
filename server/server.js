import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import { CHAPTERS, OTHER_SIDE_STORIES, STATES } from '../src/data.js';
import { meetingArrivalPoint } from '../src/meetingWorld.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distPath = path.join(projectRoot, 'dist');
const indexPath = path.join(distPath, 'index.html');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: { origin: true, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 32_000,
  pingInterval: 25_000,
  pingTimeout: 20_000,
});
const port = Number(process.env.PORT || 4100);
const sessions = new Map();
const meetings = new Map();
const meetingMessages = new Map();
const meetingVotes = new Map();
const palette = ['#d8f36b', '#ff9c75', '#8cb9ff', '#9be4cd', '#e9a4cf', '#e5c46e'];

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const authConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const persistenceConfigured = Boolean(authConfigured && SUPABASE_SERVICE_ROLE_KEY);
const roomCount = (room) => io.sockets.adapter.rooms.get(room)?.size || 0;
const safeText = (value, max = 120) => String(value ?? '').replace(/[<>\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36);
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

app.use(express.json({ limit: '48kb' }));

async function supabaseAuthRequest(endpoint, { method = 'POST', body, accessToken } = {}) {
  if (!authConfigured) throw new Error('Account service is not configured.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

async function verifyAccessToken(accessToken) {
  if (!authConfigured || !accessToken) return null;
  const response = await supabaseAuthRequest('user', { method: 'GET', accessToken });
  return response.ok && response.payload?.id ? response.payload : null;
}

async function dbRequest(table, query = {}, { method = 'GET', body, prefer = 'return=representation' } = {}) {
  if (!persistenceConfigured) return null;
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  const response = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const reason = payload?.message || payload?.details || `database request failed (${response.status})`;
    throw new Error(reason);
  }
  return payload;
}

async function persistQuietly(table, query, options, context) {
  try { return await dbRequest(table, query, options); }
  catch (error) { console.warn(`[persistence:${context}]`, error.message); return null; }
}

function bearerFromRequest(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

async function authenticatedUser(req, res) {
  if (!authConfigured) {
    res.status(503).json({ error: 'Account service is not configured on this deployment.' });
    return null;
  }
  const token = bearerFromRequest(req);
  const user = await verifyAccessToken(token);
  if (!user) {
    res.status(401).json({ error: 'Your account session is invalid or expired. Sign in again.' });
    return null;
  }
  return user;
}

function sanitizedSave(input = {}) {
  const sourceProfile = input.profile && typeof input.profile === 'object' ? input.profile : {};
  const knownStates = STATES.map((state) => state.name);
  const state = knownStates.includes(input.state) ? input.state : 'Lagos';
  const validInstitutions = new Set(['election-admin', 'judiciary', 'cbn']);
  const institutionalRole = sourceProfile.roleMode === 'institutional' && validInstitutions.has(sourceProfile.institution);
  const profile = {
    started: Boolean(sourceProfile.started),
    roleMode: institutionalRole ? 'institutional' : 'political',
    institution: institutionalRole ? sourceProfile.institution : null,
    alias: safeText(sourceProfile.alias, 26) || 'New Candidate',
    party: institutionalRole ? null : safeText(sourceProfile.party, 60),
    partyTag: institutionalRole ? null : safeText(sourceProfile.partyTag, 12),
    color: /^#[0-9a-f]{6}$/i.test(String(sourceProfile.color || '')) ? sourceProfile.color : palette[0],
    cash: clamp(Math.round(safeNumber(sourceProfile.cash, 1_000_000)), 0, 1_000_000),
    trust: clamp(Math.round(safeNumber(sourceProfile.trust, 32)), 0, 100),
    influence: clamp(Math.round(safeNumber(sourceProfile.influence, 12)), 0, 100),
    integrity: clamp(Math.round(safeNumber(sourceProfile.integrity, 78)), 0, 100),
    coalition: clamp(Math.round(safeNumber(sourceProfile.coalition, 1)), 0, 12),
    energy: clamp(Math.round(safeNumber(sourceProfile.energy, 88)), 0, 100),
    scandals: clamp(Math.round(safeNumber(sourceProfile.scandals, 0)), 0, 999),
    evidence: clamp(Math.round(safeNumber(sourceProfile.evidence, 0)), 0, 999),
    wins: clamp(Math.round(safeNumber(sourceProfile.wins, 0)), 0, 999),
    lastContest: sourceProfile.lastContest && typeof sourceProfile.lastContest === 'object' ? sourceProfile.lastContest : null,
    legalBoost: Boolean(sourceProfile.legalBoost),
    completed: Boolean(sourceProfile.completed),
  };
  const validStoryIds = new Set(OTHER_SIDE_STORIES.map((story) => story.id));
  return {
    profile,
    careerTrack: 'politics',
    stageIndex: clamp(Math.floor(safeNumber(input.stageIndex, 0)), 0, CHAPTERS.length - 1),
    missionProgress: clamp(Math.floor(safeNumber(input.missionProgress, 0)), 0, 3),
    sideStoriesSeen: Array.isArray(input.sideStoriesSeen) ? input.sideStoriesSeen.filter((id) => validStoryIds.has(id)).slice(0, 32) : [],
    storyDay: clamp(Math.floor(safeNumber(input.storyDay, 1)), 1, 100_000),
    state,
    updatedAt: new Date().toISOString(),
  };
}

function publicPlayer(player) {
  if (!player) return null;
  return {
    id: player.id,
    name: player.name,
    state: player.state,
    capital: player.capital,
    lga: player.lga,
    ward: player.ward,
    color: player.color,
    x: player.x,
    z: player.z,
    accountBacked: Boolean(player.userId),
    meetingId: player.meetingId || null,
    meetingStatus: player.meetingStatus || null,
    meetingSlot: Number.isInteger(player.meetingSlot) ? player.meetingSlot : null,
  };
}

function publicMeeting(meeting, viewerSocketId = '') {
  const votes = meetingVotes.get(meeting.id) || new Map();
  const tally = { support: 0, mixed: 0, concern: 0 };
  const attendees = [...meeting.members].map((socketId) => sessions.get(socketId)).filter(Boolean);
  for (const value of votes.values()) if (Object.hasOwn(tally, value)) tally[value] += 1;
  const enRoute = attendees.filter((player) => player.meetingStatus === 'en-route').length;
  const atVenue = attendees.filter((player) => ['at-venue', 'in-session'].includes(player.meetingStatus)).length;
  const inSession = attendees.filter((player) => player.meetingStatus === 'in-session').length;
  return {
    id: meeting.id,
    title: meeting.title,
    topic: meeting.topic,
    actionId: meeting.actionId,
    hostName: meeting.hostName,
    location: meeting.location,
    status: meeting.status,
    createdAt: meeting.createdAt,
    participants: meeting.members.size,
    interested: meeting.members.size,
    enRoute,
    atVenue,
    inSession,
    votes: tally,
    isHost: viewerSocketId ? meeting.hostSocketId === viewerSocketId || Boolean(meeting.hostUserId && sessions.get(viewerSocketId)?.userId === meeting.hostUserId) : false,
    outcome: meeting.outcome || null,
  };
}

function allOpenMeetings() {
  return [...meetings.values()].filter((meeting) => meeting.status === 'open').sort((a, b) => b.createdAt - a.createdAt).slice(0, 30).map((meeting) => publicMeeting(meeting));
}

function liveParticipants(meeting) {
  return [...meeting.members].map((socketId) => publicPlayer(sessions.get(socketId))).filter(Boolean);
}

function assignMeetingSlot(meeting, socketId) {
  if (!meeting.arrivalSlots) meeting.arrivalSlots = new Map();
  if (meeting.arrivalSlots.has(socketId)) return meeting.arrivalSlots.get(socketId);
  const occupied = new Set(meeting.arrivalSlots.values());
  let slot = 0;
  while (occupied.has(slot)) slot += 1;
  meeting.arrivalSlots.set(socketId, slot);
  return slot;
}

async function hydrateMeeting(row) {
  if (!row?.id) return null;
  if (meetings.has(row.id)) return meetings.get(row.id);
  const [messages, votes] = await Promise.all([
    dbRequest('meeting_messages', { meeting_id: `eq.${row.id}`, select: '*', order: 'created_at.asc', limit: '100' }).catch(() => []),
    dbRequest('meeting_votes', { meeting_id: `eq.${row.id}`, select: '*' }).catch(() => []),
  ]);
  const meeting = {
    id: row.id,
    hostUserId: row.host_id || null,
    hostSocketId: '',
    hostName: safeText(row.host_name, 40) || 'Meeting host',
    title: safeText(row.title, 90) || 'Civic meeting',
    topic: safeText(row.topic, 280),
    actionId: safeText(row.action_id, 32),
    location: row.location || {},
    status: row.status || 'closed',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    members: new Set(),
    arrivalSlots: new Map(),
    outcome: row.outcome || null,
  };
  meetings.set(meeting.id, meeting);
  meetingMessages.set(meeting.id, (Array.isArray(messages) ? messages : []).map((message) => ({
    id: message.id,
    meetingId: message.meeting_id,
    senderId: message.sender_id || null,
    senderName: safeText(message.sender_name, 40) || 'Player',
    kind: message.kind === 'reply' ? 'reply' : message.kind === 'summary' ? 'summary' : 'speech',
    body: safeText(message.body, 500),
    replyTo: message.reply_to || null,
    at: message.created_at ? new Date(message.created_at).getTime() : Date.now(),
  })));
  const voteMap = new Map();
  for (const vote of Array.isArray(votes) ? votes : []) if (vote.voter_key && ['support', 'mixed', 'concern'].includes(vote.vote)) voteMap.set(vote.voter_key, vote.vote);
  meetingVotes.set(meeting.id, voteMap);
  return meeting;
}

async function loadOpenMeetingsFromDb() {
  if (!persistenceConfigured) return [];
  try {
    const rows = await dbRequest('meetings', { status: 'eq.open', select: '*', order: 'created_at.desc', limit: '30' });
    for (const row of Array.isArray(rows) ? rows : []) await hydrateMeeting(row);
  } catch (error) { console.warn('[persistence:meetings-load]', error.message); }
  return allOpenMeetings();
}

app.get('/api/config', async (_req, res) => {
  let persistenceReady = false;
  if (persistenceConfigured) {
    try {
      const schemaProbes = [['profiles', 'id'], ['meetings', 'id'], ['meeting_participants', 'meeting_id'], ['meeting_messages', 'id'], ['meeting_votes', 'meeting_id'], ['direct_messages', 'id']];
      await Promise.all(schemaProbes.map(([table, column]) => dbRequest(table, { select: column, limit: '0' })));
      persistenceReady = true;
    } catch { /* The client will stay honest and use guest/session-only mode until setup is fixed. */ }
  }
  res.json({
    authEnabled: authConfigured,
    persistenceConfigured,
    persistenceEnabled: persistenceReady,
    accountProvider: authConfigured ? 'supabase' : null,
    guestMode: true,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'nigeria-2027-story-world',
    connectedPlayers: sessions.size,
    activeMeetings: [...meetings.values()].filter((meeting) => meeting.status === 'open').length,
    rooms: io.sockets.adapter.rooms.size,
    accountsConfigured: authConfigured,
    persistenceConfigured,
  });
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    if (!authConfigured) return res.status(503).json({ error: 'Account creation is not configured on this deployment. Continue as a local guest for now.' });
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const alias = safeText(req.body?.alias, 26);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Use a password between 10 and 128 characters.' });
    const result = await supabaseAuthRequest('signup', { body: { email, password, data: { display_name: alias || 'New Candidate' } } });
    if (!result.ok) return res.status(result.status).json({ error: result.payload?.msg || result.payload?.message || 'The account could not be created. Check your details and try again.' });
    const user = result.payload?.user || result.payload;
    const session = result.payload?.access_token ? result.payload : result.payload?.session || null;
    res.json({ user: user ? { id: user.id, email: user.email, emailConfirmed: Boolean(user.email_confirmed_at) } : null, session, confirmationRequired: !session });
  } catch (error) {
    res.status(502).json({ error: 'The account provider could not be reached. Try again in a moment.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    if (!authConfigured) return res.status(503).json({ error: 'Account sign-in is not configured on this deployment.' });
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
    const result = await supabaseAuthRequest('token?grant_type=password', { body: { email, password } });
    if (!result.ok) return res.status(result.status).json({ error: result.payload?.msg || result.payload?.message || 'Sign-in failed. Check your details and try again.' });
    res.json({ session: result.payload, user: result.payload?.user ? { id: result.payload.user.id, email: result.payload.user.email, emailConfirmed: Boolean(result.payload.user.email_confirmed_at) } : null });
  } catch {
    res.status(502).json({ error: 'The account provider could not be reached. Try again in a moment.' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    if (!authConfigured) return res.status(503).json({ error: 'Account sign-in is not configured.' });
    const refreshToken = String(req.body?.refresh_token || '');
    if (!refreshToken) return res.status(400).json({ error: 'No refresh token was provided.' });
    const result = await supabaseAuthRequest('token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
    if (!result.ok) return res.status(result.status).json({ error: 'Your session could not be refreshed. Sign in again.' });
    res.json({ session: result.payload });
  } catch {
    res.status(502).json({ error: 'The account provider could not be reached.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    res.json({ user: { id: user.id, email: user.email, emailConfirmed: Boolean(user.email_confirmed_at) } });
  } catch {
    res.status(502).json({ error: 'Could not verify the account session.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = bearerFromRequest(req);
    if (authConfigured && token) await supabaseAuthRequest('logout', { accessToken: token });
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
});

app.get('/api/profile', async (req, res) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    if (!persistenceConfigured) return res.status(503).json({ error: 'Profile persistence needs the server-only Supabase database key.' });
    const rows = await dbRequest('profiles', { id: `eq.${user.id}`, select: 'game_save,updated_at', limit: '1' });
    res.json({ save: Array.isArray(rows) && rows[0]?.game_save ? rows[0].game_save : null });
  } catch (error) {
    console.warn('[persistence:profile-read]', error.message);
    res.status(502).json({ error: 'Could not load the saved account profile.' });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    if (!persistenceConfigured) return res.status(503).json({ error: 'Profile persistence needs the server-only Supabase database key.' });
    const save = sanitizedSave(req.body?.save || {});
    const profileRow = {
      id: user.id,
      alias: save.profile.alias,
      party: save.profile.party,
      color: save.profile.color,
      state: save.state,
      career_track: save.careerTrack,
      game_save: save,
      updated_at: new Date().toISOString(),
    };
    await dbRequest('profiles', { on_conflict: 'id' }, { method: 'POST', body: profileRow, prefer: 'resolution=merge-duplicates,return=minimal' });
    res.json({ ok: true, updatedAt: profileRow.updated_at });
  } catch (error) {
    console.warn('[persistence:profile-write]', error.message);
    res.status(502).json({ error: 'Could not save the account profile.' });
  }
});

app.get('/api/dms', async (req, res) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    if (!persistenceConfigured) return res.status(503).json({ error: 'Message history needs the server-only Supabase database key.' });
    const rows = await dbRequest('direct_messages', {
      or: `(sender_id.eq.${user.id},recipient_id.eq.${user.id})`,
      select: 'id,sender_id,recipient_id,sender_name,recipient_name,body,message_type,meeting_id,created_at',
      order: 'created_at.desc',
      limit: '100',
    });
    res.json({ messages: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    console.warn('[persistence:dm-read]', error.message);
    res.status(502).json({ error: 'Could not load your direct-message history.' });
  }
});

app.post('/api/dms', async (req, res) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    if (!persistenceConfigured) return res.status(503).json({ error: 'Message persistence needs the server-only Supabase database key.' });
    const recipientId = String(req.body?.recipientId || '');
    const body = safeText(req.body?.body, 300);
    if (!isUuid(recipientId) || !body) return res.status(400).json({ error: 'A valid recipient and message are required.' });
    if (recipientId === user.id) return res.status(400).json({ error: 'You cannot message your own account.' });
    const recipients = await dbRequest('profiles', { id: `eq.${recipientId}`, select: 'id,alias', limit: '1' });
    if (!Array.isArray(recipients) || !recipients.length) return res.status(404).json({ error: 'That account could not be found.' });
    const rows = await dbRequest('direct_messages', {}, { method: 'POST', body: {
      sender_id: user.id,
      recipient_id: recipientId,
      sender_name: safeText(req.body?.senderName || user.user_metadata?.display_name || 'Player', 40),
      recipient_name: safeText(recipients[0].alias || 'Player', 40),
      body,
      message_type: 'text',
    } });
    res.json({ message: Array.isArray(rows) ? rows[0] : null });
  } catch (error) {
    console.warn('[persistence:dm-write]', error.message);
    res.status(502).json({ error: 'Could not save the direct message.' });
  }
});

app.get('/api/meetings', async (req, res) => {
  try {
    const live = allOpenMeetings();
    if (persistenceConfigured) {
      const rows = await dbRequest('meetings', { status: 'eq.open', select: '*', order: 'created_at.desc', limit: '30' });
      for (const row of Array.isArray(rows) ? rows : []) await hydrateMeeting(row);
    }
    const list = allOpenMeetings();
    res.json({ meetings: list.length ? list : live, persistent: persistenceConfigured });
  } catch (error) {
    console.warn('[persistence:meeting-list]', error.message);
    res.json({ meetings: allOpenMeetings(), persistent: false });
  }
});

// In production, serve the Vite build from this same origin so the game and
// Socket.IO can share one Render Web Service. Local Vite development stays separate.
if (existsSync(indexPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(indexPath, (error) => { if (error) next(error); });
  });
}

io.use(async (socket, next) => {
  try {
    const accessToken = socket.handshake.auth?.accessToken || '';
    if (!accessToken) return next(); // Anonymous local/guest sessions remain available.
    const user = await verifyAccessToken(accessToken);
    if (!user) return next(new Error('Account session is invalid. Please sign in again.'));
    socket.data.accountUser = user;
    next();
  } catch {
    next(new Error('Account verification is temporarily unavailable.'));
  }
});

io.on('connection', async (socket) => {
  socket.data.lastMoveAt = 0;
  socket.data.lastChatAt = 0;
  socket.data.lastDmAt = 0;
  socket.data.lastMeetingMessageAt = 0;
  const persisted = persistenceConfigured ? await loadOpenMeetingsFromDb() : [];
  socket.emit('meeting:list', [...persisted, ...allOpenMeetings()].filter((meeting, index, rows) => rows.findIndex((item) => item.id === meeting.id) === index));

  socket.on('world:join', (payload = {}) => {
    const stateRequest = safeText(payload.state, 64);
    const state = STATES.find((item) => item.name.toLowerCase() === stateRequest.toLowerCase()) || STATES.find((item) => item.name === 'Lagos');
    const displayName = safeText(payload.nickname, 24) || 'New Candidate';
    const lga = safeText(payload.lga, 64);
    const ward = safeText(payload.ward, 96);
    const color = palette[Math.abs(socket.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length];
    const previous = sessions.get(socket.id);
    if (previous) {
      socket.leave(previous.room);
      socket.to(previous.room).emit('player:left', { id: socket.id });
    }
    const room = `world:${slug(state.name)}:${slug(lga || 'capital')}:${slug(ward || 'centre')}`;
    const player = {
      id: socket.id,
      userId: socket.data.accountUser?.id || null,
      name: displayName,
      state: state.name,
      capital: state.capital,
      lga,
      ward,
      room,
      color,
      x: -5.8,
      z: 3.5,
      meetingId: previous?.meetingId || null,
      meetingStatus: previous?.meetingStatus || null,
      meetingSlot: Number.isInteger(previous?.meetingSlot) ? previous.meetingSlot : null,
      joinedAt: Date.now(),
    };
    sessions.set(socket.id, player);
    socket.data.lastMoveAt = 0;
    socket.join(room);
    const others = [...sessions.values()].filter((item) => item.room === room && item.id !== socket.id).map(publicPlayer);
    socket.emit('world:snapshot', { self: publicPlayer(player), players: others, online: roomCount(room) });
    socket.to(room).emit('player:joined', publicPlayer(player));
    for (const other of sessions.values()) {
      if (other.room !== room || other.id === player.id) continue;
      socket.emit('player:contact', { id: other.id, accountId: other.userId || null });
      io.to(other.id).emit('player:contact', { id: player.id, accountId: player.userId || null });
    }
    io.to(room).emit('world:count', { online: roomCount(room), state: state.name });
  });

  socket.on('player:move', (payload = {}) => {
    const player = sessions.get(socket.id);
    if (!player) return;
    const now = Date.now();
    if (now - socket.data.lastMoveAt < 80) return;
    socket.data.lastMoveAt = now;
    const nextX = clamp(safeNumber(payload.x), -22, 22);
    const nextZ = clamp(safeNumber(payload.z), -22, 22);
    const delta = Math.hypot(nextX - player.x, nextZ - player.z);
    const maxStep = 2.4;
    const ratio = delta > maxStep ? maxStep / delta : 1;
    player.x = player.x + (nextX - player.x) * ratio;
    player.z = player.z + (nextZ - player.z) * ratio;
    socket.to(player.room).volatile.emit('player:moved', { id: player.id, x: player.x, z: player.z });
  });

  socket.on('world:chat', (payload = {}) => {
    const player = sessions.get(socket.id);
    if (!player) return;
    const now = Date.now();
    if (now - socket.data.lastChatAt < 450) return;
    socket.data.lastChatAt = now;
    const message = safeText(payload.message, 180);
    if (!message) return;
    io.to(player.room).emit('world:chat', {
      id: `${socket.id}-${Date.now()}`,
      name: player.name,
      state: player.state,
      message,
      at: Date.now(),
    });
  });

  socket.on('dm:send', async (payload = {}) => {
    const player = sessions.get(socket.id);
    const recipientId = safeText(payload.recipientId, 80);
    const recipient = sessions.get(recipientId);
    if (!player || !recipient || recipient.id === player.id) return;
    const now = Date.now();
    if (now - socket.data.lastDmAt < 450) return;
    socket.data.lastDmAt = now;
    const body = safeText(payload.message, 300);
    if (!body) return;
    const id = randomUUID();
    const base = { id, fromId: player.id, fromName: player.name, body, at: Date.now(), type: 'text' };
    socket.emit('dm:message', { ...base, peerId: recipient.id, peerAccountId: recipient.userId || null, incoming: false, state: recipient.state });
    io.to(recipient.id).emit('dm:message', { ...base, peerId: player.id, peerAccountId: player.userId || null, incoming: true, state: player.state });
    if (persistenceConfigured && player.userId && recipient.userId) {
      await persistQuietly('direct_messages', {}, { method: 'POST', body: {
        id,
        sender_id: player.userId,
        recipient_id: recipient.userId,
        sender_name: player.name,
        recipient_name: recipient.name,
        body,
        message_type: 'text',
      }, prefer: 'return=minimal' }, 'dm-write');
    }
  });

  socket.on('meeting:create', async (payload = {}) => {
    const player = sessions.get(socket.id);
    if (!player) return;
    if (player.meetingId) { socket.emit('meeting:error', { message: 'Leave your current gathering before starting another one.' }); return; }
    const id = randomUUID();
    const venueId = safeText(payload.location?.venueId, 32) || 'square';
    const meeting = {
      id,
      hostUserId: player.userId,
      hostSocketId: socket.id,
      hostName: player.name,
      title: safeText(payload.title, 90) || 'Community listening meeting',
      topic: safeText(payload.topic, 280),
      actionId: safeText(payload.actionId, 32),
      location: {
        state: player.state,
        lga: player.lga,
        ward: player.ward,
        venueId,
        venueName: safeText(payload.location?.venueName, 60) || 'Community Square',
      },
      status: 'open',
      createdAt: Date.now(),
      members: new Set([socket.id]),
      arrivalSlots: new Map([[socket.id, 0]]),
      outcome: null,
    };
    player.meetingId = id;
    player.meetingStatus = 'en-route';
    player.meetingSlot = 0;
    meetings.set(id, meeting);
    meetingMessages.set(id, []);
    meetingVotes.set(id, new Map());
    socket.join(`meeting:${id}`);
    if (persistenceConfigured && player.userId) {
      await persistQuietly('meetings', { on_conflict: 'id' }, { method: 'POST', body: {
        id,
        host_id: player.userId,
        host_name: player.name,
        title: meeting.title,
        topic: meeting.topic,
        action_id: meeting.actionId,
        location: meeting.location,
        status: 'open',
        created_at: new Date(meeting.createdAt).toISOString(),
      }, prefer: 'resolution=merge-duplicates,return=minimal' }, 'meeting-create');
      await persistQuietly('meeting_participants', { on_conflict: 'meeting_id,participant_key' }, { method: 'POST', body: {
        meeting_id: id,
        user_id: player.userId,
        participant_key: player.userId,
        display_name: player.name,
      }, prefer: 'resolution=merge-duplicates,return=minimal' }, 'meeting-host');
    }
    io.to(player.room).emit('player:meeting-status', publicPlayer(player));
    socket.emit('meeting:snapshot', { meeting: publicMeeting(meeting, socket.id), messages: [], participants: liveParticipants(meeting) });
    io.emit('meeting:list', allOpenMeetings());
  });

  socket.on('meeting:join', async ({ meetingId } = {}) => {
    const player = sessions.get(socket.id);
    const id = safeText(meetingId, 80);
    if (!player || !isUuid(id)) return;
    let meeting = meetings.get(id);
    if (!meeting && persistenceConfigured) {
      try {
        const rows = await dbRequest('meetings', { id: `eq.${id}`, select: '*', limit: '1' });
        meeting = await hydrateMeeting(Array.isArray(rows) ? rows[0] : null);
      } catch (error) { console.warn('[persistence:meeting-join]', error.message); }
    }
    if (!meeting || meeting.status !== 'open') {
      socket.emit('meeting:error', { message: 'That meeting has ended or is no longer available.' });
      return;
    }
    if (player.meetingId && player.meetingId !== id) {
      socket.emit('meeting:error', { message: 'Leave your current gathering before travelling to another one.' });
      return;
    }
    const alreadyMember = meeting.members.has(socket.id);
    meeting.members.add(socket.id);
    player.meetingId = id;
    if (!alreadyMember) player.meetingStatus = 'en-route';
    player.meetingSlot = assignMeetingSlot(meeting, socket.id);
    socket.join(`meeting:${id}`);
    if (persistenceConfigured && meeting.hostUserId && player.userId) {
      await persistQuietly('meeting_participants', { on_conflict: 'meeting_id,participant_key' }, { method: 'POST', body: {
        meeting_id: id,
        user_id: player.userId,
        participant_key: player.userId,
        display_name: player.name,
      }, prefer: 'resolution=merge-duplicates,return=minimal' }, 'meeting-participant');
    }
    const messages = meetingMessages.get(id) || [];
    io.to(player.room).emit('player:meeting-status', publicPlayer(player));
    io.to(`meeting:${id}`).emit('meeting:participants', liveParticipants(meeting));
    socket.emit('meeting:snapshot', { meeting: publicMeeting(meeting, socket.id), messages, participants: liveParticipants(meeting) });
    io.emit('meeting:list', allOpenMeetings());
  });

  socket.on('meeting:arrived', ({ meetingId } = {}) => {
    const player = sessions.get(socket.id);
    const id = safeText(meetingId, 80);
    const meeting = meetings.get(id);
    if (!player || !meeting || meeting.status !== 'open' || !meeting.members.has(socket.id)) return;
    const venueId = meeting.location?.venueId || 'square';
    const slot = Number.isInteger(player.meetingSlot) ? player.meetingSlot : null;
    const arrival = meetingArrivalPoint(id, venueId, socket.id, slot);
    if (Math.hypot(player.x - arrival.x, player.z - arrival.z) > 4.5) {
      socket.emit('meeting:error', { message: 'Walk to the gathering marker before opening the live discussion.' });
      return;
    }
    player.meetingStatus = 'at-venue';
    io.to(player.room).emit('player:meeting-status', publicPlayer(player));
    io.to(`meeting:${id}`).emit('meeting:participants', liveParticipants(meeting));
    io.emit('meeting:list', allOpenMeetings());
  });

  socket.on('meeting:enter', ({ meetingId } = {}) => {
    const player = sessions.get(socket.id);
    const id = safeText(meetingId, 80);
    const meeting = meetings.get(id);
    if (!player || !meeting || meeting.status !== 'open' || !meeting.members.has(socket.id)) return;
    if (player.meetingStatus !== 'at-venue' && player.meetingStatus !== 'in-session') {
      socket.emit('meeting:error', { message: 'Reach the venue before opening the live discussion.' });
      return;
    }
    player.meetingStatus = 'in-session';
    io.to(player.room).emit('player:meeting-status', publicPlayer(player));
    io.to(`meeting:${id}`).emit('meeting:participants', liveParticipants(meeting));
    io.emit('meeting:list', allOpenMeetings());
  });

  socket.on('meeting:message', async (payload = {}) => {
    const player = sessions.get(socket.id);
    const meeting = meetings.get(safeText(payload.meetingId, 80));
    if (!player || !meeting || meeting.status !== 'open' || !meeting.members.has(socket.id) || !['at-venue', 'in-session'].includes(player.meetingStatus)) return;
    const now = Date.now();
    if (now - socket.data.lastMeetingMessageAt < 600) return;
    socket.data.lastMeetingMessageAt = now;
    const body = safeText(payload.body, 500);
    if (body.length < 2) return;
    const kind = payload.kind === 'reply' ? 'reply' : 'speech';
    const replyTo = kind === 'reply' ? safeText(payload.replyTo, 80) || null : null;
    const message = {
      id: randomUUID(),
      meetingId: meeting.id,
      senderId: player.userId,
      senderSocketId: socket.id,
      senderName: player.name,
      kind,
      body,
      replyTo,
      at: Date.now(),
    };
    const messages = meetingMessages.get(meeting.id) || [];
    messages.push(message);
    meetingMessages.set(meeting.id, messages.slice(-100));
    io.to(`meeting:${meeting.id}`).emit('meeting:message', message);
    if (persistenceConfigured && meeting.hostUserId && player.userId) {
      await persistQuietly('meeting_messages', {}, { method: 'POST', body: {
        id: message.id,
        meeting_id: meeting.id,
        sender_id: player.userId,
        sender_name: player.name,
        kind,
        body,
        reply_to: replyTo,
        created_at: new Date(message.at).toISOString(),
      }, prefer: 'return=minimal' }, 'meeting-message');
    }
  });

  socket.on('meeting:vote', async (payload = {}) => {
    const player = sessions.get(socket.id);
    const meeting = meetings.get(safeText(payload.meetingId, 80));
    const vote = ['support', 'mixed', 'concern'].includes(payload.vote) ? payload.vote : null;
    if (!player || !meeting || meeting.status !== 'open' || !meeting.members.has(socket.id) || !['at-venue', 'in-session'].includes(player.meetingStatus) || !vote) return;
    const votes = meetingVotes.get(meeting.id) || new Map();
    const voterKey = player.userId || socket.id;
    votes.set(voterKey, vote);
    meetingVotes.set(meeting.id, votes);
    if (persistenceConfigured && meeting.hostUserId && player.userId) {
      await persistQuietly('meeting_votes', { on_conflict: 'meeting_id,voter_key' }, { method: 'POST', body: {
        meeting_id: meeting.id,
        user_id: player.userId,
        voter_key: voterKey,
        display_name: player.name,
        vote,
      }, prefer: 'resolution=merge-duplicates,return=minimal' }, 'meeting-vote');
    }
    const tally = { support: 0, mixed: 0, concern: 0 };
    for (const value of votes.values()) if (Object.hasOwn(tally, value)) tally[value] += 1;
    io.to(`meeting:${meeting.id}`).emit('meeting:update', { meeting: publicMeeting(meeting), participants: liveParticipants(meeting), votes: tally });
  });

  socket.on('meeting:invite', async (payload = {}) => {
    const player = sessions.get(socket.id);
    const target = sessions.get(safeText(payload.targetId, 80));
    const meeting = meetings.get(safeText(payload.meetingId, 80));
    if (!player || !target || !meeting || meeting.status !== 'open' || !meeting.members.has(socket.id)) return;
    const invitation = {
      id: randomUUID(),
      meeting: publicMeeting(meeting),
      meetingId: meeting.id,
      fromName: player.name,
      state: meeting.location.state,
      at: Date.now(),
      type: 'meeting_invite',
    };
    io.to(target.id).emit('meeting:invite', invitation);
    const inviteText = `Meeting invitation: ${meeting.title}`;
    socket.emit('dm:message', { ...invitation, peerId: target.id, peerAccountId: target.userId || null, incoming: false, fromId: player.id, fromName: player.name, body: `Invited ${target.name} to “${meeting.title}”.` });
    io.to(target.id).emit('dm:message', { ...invitation, peerId: player.id, peerAccountId: player.userId || null, incoming: true, fromId: player.id, fromName: player.name, body: inviteText });
    if (persistenceConfigured && player.userId && target.userId) {
      await persistQuietly('direct_messages', {}, { method: 'POST', body: {
        id: invitation.id,
        sender_id: player.userId,
        recipient_id: target.userId,
        sender_name: player.name,
        recipient_name: target.name,
        body: `Meeting invitation: ${meeting.title}`,
        message_type: 'meeting_invite',
        meeting_id: meeting.id,
      }, prefer: 'return=minimal' }, 'meeting-invite');
    }
  });

  socket.on('meeting:leave', ({ meetingId } = {}) => {
    const player = sessions.get(socket.id);
    const id = safeText(meetingId, 80);
    const meeting = meetings.get(id);
    if (!player || !meeting || !meeting.members.has(socket.id)) return;
    meeting.members.delete(socket.id);
    meeting.arrivalSlots?.delete(socket.id);
    if (player.meetingId === id) { player.meetingId = null; player.meetingStatus = null; player.meetingSlot = null; }
    socket.leave(`meeting:${id}`);
    io.to(player.room).emit('player:meeting-status', publicPlayer(player));
    io.to(`meeting:${id}`).emit('meeting:participants', liveParticipants(meeting));
    io.emit('meeting:list', allOpenMeetings());
  });

  socket.on('meeting:close', async (payload = {}) => {
    const player = sessions.get(socket.id);
    const meeting = meetings.get(safeText(payload.meetingId, 80));
    if (!player || !meeting || meeting.status !== 'open' || !meeting.members.has(socket.id)) return;
    if (!['at-venue', 'in-session'].includes(player.meetingStatus)) { socket.emit('meeting:error', { message: 'The host must reach the meeting venue before publishing its record.' }); return; }
    const isHost = meeting.hostSocketId === socket.id || Boolean(meeting.hostUserId && player.userId === meeting.hostUserId);
    if (!isHost) {
      socket.emit('meeting:error', { message: 'Only the meeting host can publish the meeting record.' });
      return;
    }
    const votes = meetingVotes.get(meeting.id) || new Map();
    const tally = { support: 0, mixed: 0, concern: 0 };
    for (const value of votes.values()) if (Object.hasOwn(tally, value)) tally[value] += 1;
    const outcome = tally.support > tally.concern ? 'supported' : tally.concern > tally.support ? 'rework' : 'contested';
    meeting.outcome = { outcome, votes: tally, participants: meeting.members.size, closedBy: player.name, summary: safeText(payload.summary, 220), closedAt: Date.now() };
    meeting.status = 'closed';
    if (persistenceConfigured) {
      await persistQuietly('meetings', { id: `eq.${meeting.id}` }, { method: 'PATCH', body: { status: 'closed', outcome: meeting.outcome, ended_at: new Date().toISOString() }, prefer: 'return=minimal' }, 'meeting-close');
    }
    for (const socketId of meeting.members) {
      const attendee = sessions.get(socketId);
      if (attendee?.meetingId === meeting.id) {
        attendee.meetingId = null; attendee.meetingStatus = null; attendee.meetingSlot = null;
        io.to(attendee.room).emit('player:meeting-status', publicPlayer(attendee));
      }
    }
    io.to(`meeting:${meeting.id}`).emit('meeting:participants', liveParticipants(meeting));
    io.to(`meeting:${meeting.id}`).emit('meeting:closed', { meeting: publicMeeting(meeting), outcome: meeting.outcome });
    io.emit('meeting:list', allOpenMeetings());
  });

  socket.on('disconnect', () => {
    const player = sessions.get(socket.id);
    if (player) {
      sessions.delete(socket.id);
      socket.to(player.room).emit('player:left', { id: socket.id });
      io.to(player.room).emit('world:count', { online: roomCount(player.room), state: player.state });
    }
    let leftMeeting = false;
    for (const meeting of meetings.values()) {
      if (meeting.members.delete(socket.id)) {
        meeting.arrivalSlots?.delete(socket.id);
        socket.to(`meeting:${meeting.id}`).emit('meeting:participants', liveParticipants(meeting));
        leftMeeting = true;
      }
    }
    if (leftMeeting) io.emit('meeting:list', allOpenMeetings());
  });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`NIGERIA 2027 story server listening on 0.0.0.0:${port}`);
});
