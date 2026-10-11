import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { STATES } from '../src/data.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distPath = path.join(projectRoot, 'dist');
const indexPath = path.join(distPath, 'index.html');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: { origin: true, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 24_000,
  pingInterval: 25_000,
  pingTimeout: 20_000,
});
const port = Number(process.env.PORT || 4100);
const sessions = new Map();
const roomCount = (room) => io.sockets.adapter.rooms.get(room)?.size || 0;
const safeText = (value, max = 24) => String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36);
const palette = ['#d8f36b', '#ff9c75', '#8cb9ff', '#9be4cd', '#e9a4cf', '#e5c46e'];

app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nigeria-2027-realtime-prototype', connectedPlayers: sessions.size, rooms: io.sockets.adapter.rooms.size });
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

io.on('connection', (socket) => {
  socket.data.lastMoveAt = 0;
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
      name: displayName,
      state: state.name,
      capital: state.capital,
      lga,
      ward,
      room,
      color,
      x: -5.8,
      z: 3.5,
      joinedAt: Date.now(),
    };
    sessions.set(socket.id, player);
    socket.data.lastMoveAt = 0;
    socket.join(room);
    const others = [...sessions.values()].filter((item) => item.room === room && item.id !== socket.id).map(({ joinedAt, ...publicPlayer }) => publicPlayer);
    socket.emit('world:snapshot', { self: player, players: others, online: roomCount(room) });
    socket.to(room).emit('player:joined', player);
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

  socket.on('disconnect', () => {
    const player = sessions.get(socket.id);
    if (!player) return;
    sessions.delete(socket.id);
    socket.to(player.room).emit('player:left', { id: socket.id });
    io.to(player.room).emit('world:count', { online: roomCount(player.room), state: player.state });
  });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`NIGERIA 2027 realtime prototype listening on 0.0.0.0:${port}`);
});
