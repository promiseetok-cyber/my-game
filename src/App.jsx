import { useEffect, useRef, useState } from 'react';
import { io as socketClient } from 'socket.io-client';
import {
  Activity, ArrowRight, Banknote, BookOpen, CalendarDays, Check, ChevronDown,
  ChevronRight, Clock3, Flag, Globe2, Handshake, HeartHandshake, Landmark,
  Map, MapPin, Megaphone, MessageCircle, Move, Plane, Radio, Scale, Search,
  Send, Shield, ShieldAlert, Sparkles, TrendingUp, UserRound, Users, Wallet,
  X, Zap, Briefcase, Crown, BadgeCheck, CircleHelp, Eye, ScrollText, LockKeyhole,
} from 'lucide-react';
import World from './World.jsx';
import { STATE_WORLD_PROFILES } from './stateWorldProfiles.js';
import {
  CAMPAIGN_SCENES, CHAPTERS, MAP_POINTS, NPCS, OFFICE_CATALOG, PARTY_OPTIONS, RESEARCH_NOTES,
  STATES, WORLD_VENUES,
} from './data.js';
import { CAREER_TRACKS, DEFAULT_CAREER_TRACK, getCareerTrack, INSTITUTIONAL_STORY_ARCS } from './careerTracks.js';

const SAVE_KEY = 'nigeria-2027-life-sim-v1';
const AUTH_SAVE_KEY = 'nigeria-2027-auth-v1';
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const money = (amount) => new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Math.max(0, amount));
const initials = (name = '') => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'NC';
const locationSlug = (name = '') => name.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CAPITAL_LGA_BY_STATE = {
  Anambra: 'Awka South',
  Delta: 'Oshimili South',
  Edo: 'Oredo',
  Enugu: 'Enugu North',
  Kwara: 'Ilorin West',
  Niger: 'Chanchaga',
  Ogun: 'Abeokuta South',
  Ondo: 'Akure South',
  Plateau: 'Jos North',
  'Federal Capital Territory': 'Abuja Municipal Area Council',
};
const wardKey = (ward) => ward ? `${ward.name}|${ward.lat}|${ward.lon}` : '';
const focusWorldOnMobile = () => {
  if (window.matchMedia?.('(max-width: 1030px)').matches) {
    window.setTimeout(() => document.querySelector('.world-view-frame')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }
};
const defaultProfile = {
  started: false, alias: 'New Candidate', party: PARTY_OPTIONS[0].name,
  partyTag: PARTY_OPTIONS[0].tag, color: PARTY_OPTIONS[0].color,
  cash: 1_000_000, trust: 32, influence: 12, integrity: 78,
  coalition: 1, energy: 88, scandals: 0, evidence: 0, wins: 0,
  lastContest: null, legalBoost: false, completed: false, completedSideStories: [],
};

function loadSave() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch { return null; }
}

function loadAuthSession() {
  try {
    const value = JSON.parse(window.localStorage.getItem(AUTH_SAVE_KEY) || 'null');
    return value && typeof value === 'object' && value.access_token ? value : null;
  } catch { return null; }
}

function initialProgressByTrack(boot) {
  const result = Object.fromEntries(CAREER_TRACKS.map((track) => [track.id, { stageIndex: 0, missionProgress: 0 }]));
  for (const track of CAREER_TRACKS) {
    const saved = boot?.progressByTrack?.[track.id];
    if (saved && typeof saved === 'object') result[track.id] = {
      stageIndex: clamp(Number.isInteger(saved.stageIndex) ? saved.stageIndex : 0, 0, track.stages.length - 1),
      missionProgress: clamp(Number.isInteger(saved.missionProgress) ? saved.missionProgress : 0, 0, 3),
    };
  }
  if (!boot?.progressByTrack?.politics) result.politics = {
    stageIndex: Number.isInteger(boot?.stageIndex) ? clamp(boot.stageIndex, 0, CHAPTERS.length - 1) : 0,
    missionProgress: Number.isInteger(boot?.missionProgress) ? clamp(boot.missionProgress, 0, 3) : 0,
  };
  return result;
}

function dateLabel(day) {
  const start = new Date('2026-10-10T12:00:00+01:00');
  start.setDate(start.getDate() + Math.max(0, day - 1));
  return start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

const NAV_ITEMS = [
  { id: 'world', label: 'Live world', icon: Globe2 },
  { id: 'career', label: 'Career path', icon: TrendingUp },
  { id: 'offices', label: 'Political offices', icon: Landmark },
  { id: 'civic', label: 'Civic desk', icon: BookOpen },
  { id: 'atlas', label: 'State atlas', icon: Map },
];

const ACTIONS = [
  { id: 'listen', label: 'Town hall', detail: 'Listen first · no fee', cost: 0, energy: 7, icon: MessageCircle, color: 'mint' },
  { id: 'service', label: 'Service project', detail: 'Community trust · ₦80k', cost: 80_000, energy: 8, icon: HeartHandshake, color: 'lime' },
  { id: 'coalition', label: 'Coalition talks', detail: 'Build a public alliance · ₦45k', cost: 45_000, energy: 5, icon: Handshake, color: 'blue' },
  { id: 'policy', label: 'Policy lab', detail: 'Publish a practical plan · ₦30k', cost: 30_000, energy: 5, icon: ScrollText, color: 'gold' },
  { id: 'rally', label: 'Public rally', detail: 'Make the case · ₦90k', cost: 90_000, energy: 12, icon: Megaphone, color: 'rose' },
];

function App() {
  const bootRef = useRef(undefined);
  if (bootRef.current === undefined) bootRef.current = loadSave();
  const boot = bootRef.current;
  const [profile, setProfile] = useState(boot?.profile || defaultProfile);
  const [careerTrack, setCareerTrack] = useState(CAREER_TRACKS.some((track) => track.id === boot?.careerTrack) ? boot.careerTrack : DEFAULT_CAREER_TRACK);
  const [progressByTrack, setProgressByTrack] = useState(() => initialProgressByTrack(boot));
  const activeCareerTrack = getCareerTrack(careerTrack);
  const activeCareerStages = activeCareerTrack.stages;
  const stageIndex = Math.min(progressByTrack[careerTrack]?.stageIndex || 0, activeCareerStages.length - 1);
  const missionProgress = progressByTrack[careerTrack]?.missionProgress || 0;
  const updateTrackProgress = (field, value) => setProgressByTrack((current) => {
    const prior = current[careerTrack] || { stageIndex: 0, missionProgress: 0 };
    const nextValue = typeof value === 'function' ? value(prior[field]) : value;
    return { ...current, [careerTrack]: { ...prior, [field]: nextValue } };
  });
  const setStageIndex = (value) => updateTrackProgress('stageIndex', value);
  const setMissionProgress = (value) => updateTrackProgress('missionProgress', value);
  const [storyDay, setStoryDay] = useState(Number.isFinite(boot?.storyDay) ? Math.max(1, boot.storyDay) : 1);
  const [selectedStateName, setSelectedStateName] = useState(STATES.some((item) => item.name === boot?.state) ? boot.state : 'Lagos');
  const [stateLocalities, setStateLocalities] = useState(null);
  const [localityLoading, setLocalityLoading] = useState(true);
  const [localityError, setLocalityError] = useState('');
  const [selectedLgaName, setSelectedLgaName] = useState('');
  const [selectedWardKey, setSelectedWardKey] = useState('');
  const [communityFocusRequest, setCommunityFocusRequest] = useState(0);
  const [page, setPage] = useState('world');
  const [activeVenueId, setActiveVenueId] = useState('square');
  const [venueFocusRequest, setVenueFocusRequest] = useState(0);
  const [feed, setFeed] = useState([
    { id: 'start-1', title: 'The campaign begins', text: 'A new candidate enters the ward with an in-game ₦1,000,000 seed fund.', type: 'start', time: 'DAY 01' },
    { id: 'start-2', title: 'A note on the world', text: 'Original fictional parties, characters, and outcomes. The game does not predict real 2027 results.', type: 'note', time: 'BRIEFING' },
  ]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [authConfig, setAuthConfig] = useState({ authEnabled: false, persistenceEnabled: false, accountProvider: null });
  const [authSession, setAuthSession] = useState(() => loadAuthSession());
  const [authReady, setAuthReady] = useState(false);
  const [cloudProfileReady, setCloudProfileReady] = useState(() => !loadAuthSession()?.access_token);
  const [authBusy, setAuthBusy] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(!boot?.profile?.started);
  const [draftAlias, setDraftAlias] = useState(boot?.profile?.alias && boot.profile.alias !== 'New Candidate' ? boot.profile.alias : '');
  const [draftParty, setDraftParty] = useState(boot?.profile?.party || PARTY_OPTIONS[0].name);
  const [draftState, setDraftState] = useState(STATES.some((item) => item.name === boot?.state) ? boot.state : 'Lagos');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 'system-welcome', name: 'WORLD DESK', message: 'Welcome to the demo world. Keep it respectful; do not post private information.', system: true, at: Date.now() },
  ]);
  const [remotePlayers, setRemotePlayers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [networkStatus, setNetworkStatus] = useState('connecting');
  const [availableMeetings, setAvailableMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [meetingMessages, setMeetingMessages] = useState([]);
  const [meetingParticipants, setMeetingParticipants] = useState([]);
  const [meetingVotes, setMeetingVotes] = useState({ support: 0, mixed: 0, concern: 0 });
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingReplyTo, setMeetingReplyTo] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmDraft, setDmDraft] = useState('');
  const [selectedDmPeer, setSelectedDmPeer] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [consultIndex, setConsultIndex] = useState(0);
  const [atlasQuery, setAtlasQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');
  const socketRef = useRef(null);
  const worldConfigRef = useRef(null);
  const activeMeetingRef = useRef(null);
  const resolvedMeetingsRef = useRef(new Set());
  const cloudRestoreAttemptedRef = useRef(false);
  activeMeetingRef.current = activeMeeting;

  const currentChapter = activeCareerStages[Math.min(stageIndex, activeCareerStages.length - 1)];
  const stateInfo = STATES.find((item) => item.name === selectedStateName) || STATES[0];
  const stateWorldProfile = STATE_WORLD_PROFILES[stateInfo.name] || STATE_WORLD_PROFILES.Lagos;
  const currentLga = stateLocalities?.state === stateInfo.name ? stateLocalities.lgas?.find((item) => item.name === selectedLgaName) || null : null;
  const currentWard = currentLga?.wards?.find((item) => wardKey(item) === selectedWardKey) || null;
  const capitalSlug = locationSlug(stateInfo.capital);
  const currentLgaSlug = locationSlug(currentLga?.name || '');
  const isCapitalLga = Boolean(currentLga && (currentLga.name === CAPITAL_LGA_BY_STATE[stateInfo.name] || currentLgaSlug.includes(capitalSlug) || capitalSlug.includes(currentLgaSlug)));
  const sceneLocality = currentWard && currentLga ? { state: stateInfo.name, lga: currentLga.name, ward: currentWard.name, lat: currentWard.lat, lon: currentWard.lon, settlement: isCapitalLga ? 'capital' : 'local' } : null;
  const sceneLocationKey = `${sceneLocality ? `${sceneLocality.state}/${sceneLocality.lga}/${sceneLocality.ward}/${sceneLocality.lat}/${sceneLocality.lon}` : `${stateInfo.name}/capital`}/${communityFocusRequest}`;
  const activeVenue = WORLD_VENUES.find((item) => item.id === activeVenueId) || WORLD_VENUES[1];
  const currentParty = PARTY_OPTIONS.find((item) => item.name === profile.party) || PARTY_OPTIONS[0];
  const progressPercent = Math.min(100, (missionProgress / 3) * 100);
  const daysToFederal = Math.ceil((new Date('2027-01-16T00:00:00+01:00').getTime() - Date.now()) / 86_400_000);
  const daysToState = Math.ceil((new Date('2027-02-06T00:00:00+01:00').getTime() - Date.now()) / 86_400_000);
  const activeVenueName = activeVenue.id === 'stadium' && stateInfo.landmark.toLowerCase().includes('stadium') ? stateInfo.landmark : activeVenue.label;
  worldConfigRef.current = { state: selectedStateName, nickname: profile.alias || 'New Candidate', lga: currentLga?.name || '', ward: currentWard?.name || '' };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStateLocalities(null);
    setSelectedLgaName('');
    setSelectedWardKey('');
    setLocalityLoading(true);
    setLocalityError('');
    fetch(`/data/locations/${locationSlug(selectedStateName)}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Location data request failed (${response.status}).`);
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        const lgas = Array.isArray(payload?.lgas) ? payload.lgas : [];
        const capitalSlug = locationSlug(stateInfo.capital);
        const configuredCapitalLga = CAPITAL_LGA_BY_STATE[stateInfo.name];
        const capitalLga = lgas.find((item) => item.name === configuredCapitalLga) || lgas.find((item) => locationSlug(item.name).includes(capitalSlug) || capitalSlug.includes(locationSlug(item.name)));
        const firstLga = capitalLga || lgas[0];
        setStateLocalities({ ...payload, lgas });
        setSelectedLgaName(firstLga?.name || '');
        setSelectedWardKey(wardKey(firstLga?.wards?.[0]));
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') setLocalityError('The local directory could not be loaded. The 3D capital remains available; try reloading the page.');
      })
      .finally(() => { if (active) setLocalityLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [selectedStateName, stateInfo.capital]);

  useEffect(() => {
    if (!profile.started) return;
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify({ profile, careerTrack, progressByTrack, stageIndex, missionProgress, storyDay, state: selectedStateName })); }
    catch { /* Local save is optional in private browsing. */ }
  }, [profile, careerTrack, progressByTrack, stageIndex, missionProgress, storyDay, selectedStateName]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      let config = { authEnabled: false, persistenceEnabled: false, accountProvider: null };
      try {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) config = { ...config, ...(await configResponse.json()) };
      } catch { /* Local Vite-only preview may not have the API running. */ }
      if (!active) return;
      setAuthConfig(config);
      let session = authSession;
      if (session?.access_token && config.authEnabled) {
        try {
          let response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
          if (!response.ok && session.refresh_token) {
            const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
            const refreshed = refreshResponse.ok ? await refreshResponse.json() : null;
            if (refreshed?.session?.access_token) {
              session = refreshed.session;
              setAuthSession(session);
              response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
            }
          }
          if (!response.ok) { session = null; setAuthSession(null); }
        } catch { /* Keep the local save available if account verification is offline. */ }
      } else if (!config.authEnabled) {
        session = null;
        setAuthSession(null);
      }
      if (!active) return;
      setAuthReady(true);
      if (session?.access_token && config.persistenceEnabled && !cloudRestoreAttemptedRef.current) {
        cloudRestoreAttemptedRef.current = true;
        try {
          const response = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } });
          const result = response.ok ? await response.json() : null;
          if (active && result?.save?.profile?.started) restoreCloudSave(result.save, true);
        } catch { /* A local campaign remains usable when the database is temporarily unavailable. */ }
        if (active) setCloudProfileReady(true);
      } else setCloudProfileReady(true);
    };
    start();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    try {
      if (authSession?.access_token) window.localStorage.setItem(AUTH_SAVE_KEY, JSON.stringify(authSession));
      else window.localStorage.removeItem(AUTH_SAVE_KEY);
    } catch { /* Token persistence is optional in private browsing. */ }
  }, [authSession, authReady]);

  useEffect(() => {
    if (!authReady || !cloudProfileReady || !authSession?.access_token || !authConfig.persistenceEnabled || !profile.started) return undefined;
    const timer = window.setTimeout(() => {
      const save = { profile, careerTrack, progressByTrack, storyDay, state: selectedStateName };
      fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` }, body: JSON.stringify({ save }) })
        .then((response) => { if (!response.ok) throw new Error('Account save failed'); })
        .catch(() => { /* Autosave failure does not disable the local journal. */ });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [authReady, cloudProfileReady, authSession?.access_token, authConfig.persistenceEnabled, profile, careerTrack, progressByTrack, storyDay, selectedStateName]);

  useEffect(() => {
    if (!authSession?.access_token || !authConfig.persistenceEnabled) return;
    let active = true;
    fetch('/api/dms', { headers: { Authorization: `Bearer ${authSession.access_token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active || !Array.isArray(result?.messages)) return;
        const userId = authSession.user?.id;
        setDmMessages((current) => {
          const persisted = result.messages.slice().reverse().map((item) => ({
            id: item.id,
            peerAccountId: item.sender_id === userId ? item.recipient_id : item.sender_id,
            fromName: item.sender_name,
            body: item.body,
            incoming: item.recipient_id === userId,
            at: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
            type: item.message_type || 'text',
            meetingId: item.meeting_id || null,
          }));
          const ids = new Set(current.map((item) => item.id));
          return [...current, ...persisted.filter((item) => !ids.has(item.id))].slice(-150);
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [authSession?.access_token, authConfig.persistenceEnabled]);

  useEffect(() => {
    if (!authReady) return undefined;
    const socket = socketClient({ path: '/socket.io', auth: { accessToken: authSession?.access_token || '' }, transports: ['websocket', 'polling'], timeout: 7000, reconnectionAttempts: 6, reconnectionDelay: 1400 });
    socketRef.current = socket;
    const joinWorld = () => {
      const config = worldConfigRef.current || { state: 'Lagos', nickname: 'New Candidate' };
      socket.emit('world:join', { state: config.state, nickname: config.nickname, lga: config.lga, ward: config.ward });
    };
    socket.on('connect', () => { setNetworkStatus('online'); joinWorld(); });
    socket.on('disconnect', () => { setNetworkStatus('offline'); setRemotePlayers([]); });
    socket.on('connect_error', () => setNetworkStatus('offline'));
    socket.on('world:snapshot', (payload = {}) => {
      setRemotePlayers(Array.isArray(payload.players) ? payload.players : []);
      setOnlineCount(Number(payload.online) || 1);
    });
    socket.on('world:count', (payload = {}) => setOnlineCount(Number(payload.online) || 0));
    socket.on('player:joined', (player) => {
      if (!player?.id) return;
      setRemotePlayers((current) => current.some((item) => item.id === player.id) ? current : [...current, player]);
      setChatMessages((current) => [{ id: `join-${player.id}`, name: 'WORLD DESK', message: `${player.name || 'A player'} joined ${player.state || 'the world'}.`, system: true, at: Date.now() }, ...current].slice(0, 50));
    });
    socket.on('player:left', ({ id } = {}) => setRemotePlayers((current) => current.filter((item) => item.id !== id)));
    socket.on('player:moved', ({ id, x, z } = {}) => setRemotePlayers((current) => current.map((item) => item.id === id ? { ...item, x, z } : item)));
    socket.on('world:chat', (message) => setChatMessages((current) => [message, ...current].slice(0, 50)));
    socket.on('meeting:list', (list) => setAvailableMeetings(Array.isArray(list) ? list : []));
    socket.on('meeting:snapshot', (payload = {}) => {
      if (!payload.meeting) return;
      setActiveMeeting({ ...payload.meeting, local: false });
      setMeetingMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setMeetingParticipants(Array.isArray(payload.participants) ? payload.participants : []);
      setMeetingVotes(payload.meeting.votes || { support: 0, mixed: 0, concern: 0 });
      setMeetingDraft(''); setMeetingReplyTo(null);
    });
    socket.on('meeting:message', (message) => setMeetingMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-100)));
    socket.on('meeting:participants', (participants) => setMeetingParticipants(Array.isArray(participants) ? participants : []));
    socket.on('meeting:update', (payload = {}) => {
      if (payload.meeting) setActiveMeeting((current) => current?.id === payload.meeting.id ? { ...current, ...payload.meeting, isHost: current.isHost } : current);
      if (payload.votes) setMeetingVotes(payload.votes);
      if (Array.isArray(payload.participants)) setMeetingParticipants(payload.participants);
    });
    socket.on('meeting:closed', (payload = {}) => {
      const current = activeMeetingRef.current;
      if (payload.meeting) setActiveMeeting((existing) => existing?.id === payload.meeting.id ? { ...existing, ...payload.meeting, status: 'closed', outcome: payload.outcome || payload.meeting.outcome } : existing);
      if (payload.outcome?.votes) setMeetingVotes(payload.outcome.votes);
      if (current?.id === payload.meeting?.id && current.isHost && current.actionId) resolveCampaignMeeting(current, payload.outcome);
    });
    socket.on('meeting:invite', (invite) => { setIncomingInvite(invite); setModal({ type: 'meeting-invite', invite }); });
    socket.on('meeting:error', (payload = {}) => showToast(payload.message || 'Meeting action could not be completed.'));
    socket.on('dm:message', (message) => setDmMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-150)));
    socket.on('dm:peer', ({ peerId, peerAccountId } = {}) => setSelectedDmPeer((current) => current?.id === peerId ? { ...current, accountId: peerAccountId } : current));
    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
  }, [authReady, authSession?.access_token]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('world:join', { state: selectedStateName, nickname: profile.alias || 'New Candidate', lga: currentLga?.name || '', ward: currentWard?.name || '' });
      setRemotePlayers([]);
    }
  }, [selectedStateName, profile.alias, currentLga?.name, currentWard?.name]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3300);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addFeed = (title, text, type = 'move') => {
    setFeed((items) => [{ id: `${Date.now()}-${Math.random()}`, title, text, type, time: `DAY ${String(storyDay).padStart(2, '0')}` }, ...items].slice(0, 8));
  };
  const showToast = (message) => setToast(message);
  const increaseProgress = () => setMissionProgress((current) => Math.min(3, current + 1));

  const restoreCloudSave = (save, silent = false) => {
    if (!save || typeof save !== 'object') return false;
    setProfile({ ...defaultProfile, ...(save.profile || {}), started: true });
    const nextTrack = CAREER_TRACKS.some((track) => track.id === save.careerTrack) ? save.careerTrack : DEFAULT_CAREER_TRACK;
    setCareerTrack(nextTrack);
    setProgressByTrack(initialProgressByTrack(save));
    setStoryDay(Math.max(1, Number(save.storyDay) || 1));
    setSelectedStateName(STATES.some((item) => item.name === save.state) ? save.state : 'Lagos');
    setDraftAlias(save.profile?.alias || '');
    setOnboardingOpen(false); setModal(null);
    if (!silent) showToast('Account career restored from the cloud');
    return true;
  };

  const submitAccount = async (mode, email, password, alias = draftAlias) => {
    setAuthBusy(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? { email, password, alias } : { email, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, error: result.error || 'Account access failed.' };
      if (result.confirmationRequired || !result.session?.access_token) {
        return { ok: false, error: 'Account created. Confirm your email, then sign in to continue.' };
      }
      const session = { ...result.session, user: result.session.user || result.user || null };
      setCloudProfileReady(false);
      setAuthSession(session);
      let save = null;
      if (authConfig.persistenceEnabled) {
        const profileResponse = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const profileResult = profileResponse.ok ? await profileResponse.json().catch(() => null) : null;
        save = profileResult?.save || null;
      }
      if (save?.profile?.started) restoreCloudSave(save, true);
      setCloudProfileReady(true);
      return { ok: true, session, save };
    } catch {
      setCloudProfileReady(true);
      return { ok: false, error: 'Could not reach the account service. Your local campaign is still available.' };
    } finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    const token = authSession?.access_token;
    if (token) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setAuthSession(null); setCloudProfileReady(true); setDmMessages([]); setToast('Signed out · local campaign remains on this device'); setModal(null);
  };

  const startCandidate = () => {
    const party = PARTY_OPTIONS.find((item) => item.name === draftParty) || PARTY_OPTIONS[0];
    const alias = draftAlias.trim().slice(0, 26) || 'New Candidate';
    setProfile({ ...defaultProfile, started: true, alias, party: party.name, partyTag: party.tag, color: party.color, cash: 1_000_000 });
    setCareerTrack(DEFAULT_CAREER_TRACK); setProgressByTrack(initialProgressByTrack(null)); setStoryDay(1); setSelectedStateName(draftState); setActiveVenueId('square'); setOnboardingOpen(false);
    setFeed([{ id: `${Date.now()}-welcome`, title: 'Civic story begins', text: `₦1,000,000 fictional seed fund added. Start with the shared youth/community chapter, then choose a professional branch.`, type: 'start', time: 'DAY 01' }]);
    setToast(authSession ? 'Career launched · ₦1,000,000 in-game seed fund' : 'Guest career launched · ₦1,000,000 in-game seed fund');
  };

  const createNewCandidate = () => { setDraftAlias(''); setDraftParty(PARTY_OPTIONS[0].name); setDraftState(selectedStateName); setOnboardingOpen(true); };

  const actionCost = (actionId) => actionId === 'consult' ? { id: 'consult', label: 'Senior consultation', cost: 25_000, energy: 5 } : ACTIONS.find((item) => item.id === actionId);

  const applyStoryOutcome = (actionId, effects, narrative, typedText = '') => {
    const action = actionCost(actionId);
    if (!action) return false;
    if (profile.cash < action.cost) { showToast(`Not enough in-game funds for ${action.label.toLowerCase()}.`); setModal(null); return false; }
    if (profile.energy < action.energy) { showToast('Your character needs rest before the next story scene.'); setModal(null); return false; }
    setProfile((current) => ({
      ...current,
      cash: Math.max(0, current.cash - action.cost),
      trust: clamp(current.trust + (effects.trust || 0)),
      influence: clamp(current.influence + (effects.influence || 0)),
      integrity: clamp(current.integrity + (effects.integrity || 0)),
      coalition: clamp(current.coalition + (effects.coalition || 0), 0, 12),
      energy: clamp(current.energy - action.energy),
    }));
    increaseProgress(); setStoryDay((day) => day + 1);
    const quote = typedText.trim() ? ` You said: “${typedText.trim().slice(0, 120)}”.` : '';
    addFeed(action.label, `${narrative}${quote}`, actionId);
    if (actionId === 'consult') setConsultIndex((value) => value + 1);
    setModal(null); showToast(`${action.label} logged · the story now reflects your response`);
    return true;
  };

  const startCampaignAction = (actionId) => {
    const action = actionCost(actionId);
    if (!action) return;
    if (profile.cash < action.cost) { showToast(`Not enough in-game funds for ${action.label.toLowerCase()}.`); return; }
    if (profile.energy < action.energy) { showToast('Your character needs rest before the next story scene.'); return; }
    const scene = CAMPAIGN_SCENES[actionId];
    if (actionId === 'listen') {
      const venue = WORLD_VENUES.find((item) => item.id === 'square');
      setActiveVenueId('square'); setVenueFocusRequest((request) => request + 1); setPage('world'); setToast('Travelling to the community meeting'); focusWorldOnMobile();
      const location = { state: selectedStateName, lga: currentLga?.name || '', ward: currentWard?.name || '', venueId: 'square', venueName: venue?.label || 'Community Square' };
      if (socketRef.current?.connected) {
        socketRef.current.emit('meeting:create', { title: 'Town hall · community priorities', topic: 'Listen to different neighbourhood concerns, deliver a short typed opening, reply to other speakers, then vote on the meeting direction.', actionId, location });
      } else {
        const id = `local-${Date.now()}`;
        const localMeeting = { id, title: 'Town hall · community priorities', topic: 'Listen to different neighbourhood concerns, deliver a short typed opening, reply to other speakers, then vote on the meeting direction.', actionId, hostName: profile.alias, location, status: 'open', createdAt: Date.now(), participants: 1, votes: { support: 0, mixed: 0, concern: 0 }, isHost: true, local: true };
        setActiveMeeting(localMeeting); setMeetingMessages([]); setMeetingParticipants([{ id: 'local-player', name: profile.alias, state: selectedStateName }]); setMeetingVotes({ support: 0, mixed: 0, concern: 0 });
      }
      return;
    }
    if (!scene) return;
    goToVenue(scene.venueId);
    const npc = actionId === 'consult' ? NPCS[consultIndex % NPCS.length] : null;
    setModal({ type: 'story-action', actionId, npc });
  };

  const finishStoryAction = (actionId, text, choiceId) => {
    const scene = CAMPAIGN_SCENES[actionId];
    const choice = scene?.choices?.find((item) => item.id === choiceId);
    if (!choice) return;
    applyStoryOutcome(actionId, choice.effects, choice.outcome, text);
  };

  const openInstitutionStory = (arcId) => {
    const arc = INSTITUTIONAL_STORY_ARCS.find((item) => item.id === arcId);
    if (!arc) return;
    goToVenue(arc.venueId);
    setModal({ type: 'institution-story', arcId });
  };

  const finishInstitutionStory = (arcId, text, choiceId) => {
    const arc = INSTITUTIONAL_STORY_ARCS.find((item) => item.id === arcId);
    const choice = arc?.choices?.find((item) => item.id === choiceId);
    if (!arc || !choice) return;
    const done = Array.isArray(profile.completedSideStories) ? profile.completedSideStories : [];
    const firstTime = !done.includes(arcId);
    setProfile((current) => ({
      ...current,
      trust: clamp(current.trust + (firstTime ? choice.effects.trust : 0)),
      integrity: clamp(current.integrity + (firstTime ? choice.effects.integrity : 0)),
      influence: clamp(current.influence + (firstTime ? choice.effects.influence : 0)),
      completedSideStories: firstTime ? [...done, arcId] : done,
    }));
    setStoryDay((day) => day + 1);
    addFeed(`${arc.shortLabel} side story`, `${choice.outcome}${text.trim() ? ` Your note: “${text.trim().slice(0, 110)}”.` : ''}`, 'institution');
    setModal(null);
    showToast(firstTime ? `${arc.shortLabel} story recorded · the political ladder continues` : 'Side-story notes revisited · no repeated stat reward');
  };

  const openConsultation = () => startCampaignAction('consult');

  const resolveCampaignMeeting = (meeting, outcome = {}) => {
    if (!meeting?.id || resolvedMeetingsRef.current.has(meeting.id) || !meeting.isHost) return;
    resolvedMeetingsRef.current.add(meeting.id);
    const votes = outcome.votes || meeting.votes || meetingVotes;
    const support = Number(votes.support) || 0;
    const concern = Number(votes.concern) || 0;
    const replies = meetingMessages.filter((item) => item.kind === 'reply').length;
    const voices = Number(outcome.participants) || meetingParticipants.length || 1;
    let effects;
    let narrative;
    if (outcome.outcome === 'supported' || support > concern) {
      effects = { trust: 6 + Math.min(2, replies), influence: 3, integrity: 2, coalition: voices > 1 ? 2 : 1 };
      narrative = `The town hall closed with majority support (${support} support, ${concern} concern). ${replies} replies and ${voices} participant${voices === 1 ? '' : 's'} were recorded; the response shaped the meeting record.`;
    } else if (outcome.outcome === 'rework' || concern > support) {
      effects = { trust: -2, influence: 1, integrity: 3, coalition: 1 };
      narrative = `Residents asked for the proposal to be reworked (${support} support, ${concern} concern). The disagreement lowered short-term trust, but the published record preserves the concerns for follow-up.`;
    } else {
      effects = { trust: 3, influence: 2, integrity: 3, coalition: voices > 1 ? 1 : 0 };
      narrative = `The meeting ended without a clear majority. ${replies} replies were included in the minutes; the outcome is recorded as contested rather than forced into consensus.`;
    }
    applyStoryOutcome('listen', effects, narrative);
  };

  const submitMeetingMessage = (event) => {
    event?.preventDefault?.();
    const body = meetingDraft.trim().slice(0, 500);
    if (!body || !activeMeeting) return;
    const kind = meetingReplyTo ? 'reply' : 'speech';
    if (activeMeeting.local) {
      const item = { id: `local-${Date.now()}`, meetingId: activeMeeting.id, senderName: profile.alias, kind, body, replyTo: meetingReplyTo?.id || null, at: Date.now() };
      setMeetingMessages((current) => [...current, item].slice(-100));
    } else if (socketRef.current?.connected) {
      socketRef.current.emit('meeting:message', { meetingId: activeMeeting.id, kind, body, replyTo: meetingReplyTo?.id || null });
    } else { showToast('Meeting connection lost. Reconnect before sending.'); return; }
    setMeetingDraft(''); setMeetingReplyTo(null);
  };

  const castMeetingVote = (vote) => {
    if (!activeMeeting || activeMeeting.status !== 'open') return;
    if (activeMeeting.local) {
      const next = { support: 0, mixed: 0, concern: 0, [vote]: 1 };
      setMeetingVotes(next); setActiveMeeting((current) => ({ ...current, votes: next }));
    } else if (socketRef.current?.connected) socketRef.current.emit('meeting:vote', { meetingId: activeMeeting.id, vote });
  };

  const closeMeeting = () => {
    if (!activeMeeting || !activeMeeting.isHost || activeMeeting.status !== 'open') return;
    if (activeMeeting.local) {
      const support = Number(meetingVotes.support) || 0;
      const concern = Number(meetingVotes.concern) || 0;
      const outcome = { outcome: support > concern ? 'supported' : concern > support ? 'rework' : 'contested', votes: meetingVotes, participants: meetingParticipants.length || 1, closedAt: Date.now() };
      setActiveMeeting((current) => ({ ...current, status: 'closed', outcome }));
      resolveCampaignMeeting(activeMeeting, outcome);
    } else socketRef.current?.emit('meeting:close', { meetingId: activeMeeting.id, summary: 'Meeting record published by the host.' });
  };

  const leaveMeeting = () => {
    if (activeMeeting && !activeMeeting.local) socketRef.current?.emit('meeting:leave', { meetingId: activeMeeting.id });
    setActiveMeeting(null); setMeetingMessages([]); setMeetingParticipants([]); setMeetingReplyTo(null);
  };

  const joinMeeting = (meeting) => {
    if (!meeting?.id) return;
    const existingMeeting = activeMeetingRef.current;
    if (existingMeeting && existingMeeting.id !== meeting.id && !existingMeeting.local) socketRef.current?.emit('meeting:leave', { meetingId: existingMeeting.id });
    const location = meeting.location || {};
    const targetState = STATES.find((item) => item.name === location.state);
    if (targetState && targetState.name !== selectedStateName) {
      setSelectedStateName(targetState.name); setSelectedLgaName(''); setSelectedWardKey('');
    }
    setActiveVenueId(location.venueId || 'square'); setVenueFocusRequest((request) => request + 1); setPage('world');
    setMeetingDraft(''); setMeetingReplyTo(null);
    if (meeting.local) {
      setActiveMeeting(meeting);
      setMeetingMessages([]);
      return;
    }
    if (!socketRef.current?.connected) { showToast('Connect to the world before joining this meeting.'); return; }
    socketRef.current.emit('meeting:join', { meetingId: meeting.id });
    focusWorldOnMobile();
  };

  const sendDirectMessage = (event) => {
    event?.preventDefault?.();
    const body = dmDraft.trim().slice(0, 300);
    if (!body || !selectedDmPeer || !socketRef.current?.connected) return;
    socketRef.current.emit('dm:send', { recipientId: selectedDmPeer.id, message: body });
    setDmDraft('');
  };

  const selectDmPeer = (peer) => {
    setSelectedDmPeer(peer || null);
    if (peer?.id && socketRef.current?.connected) socketRef.current.emit('dm:lookup', { peerId: peer.id });
  };

  const inviteToMeeting = (peer) => {
    if (!activeMeeting || activeMeeting.status !== 'open' || !peer?.id) { showToast('Open a meeting before inviting a player.'); return; }
    if (activeMeeting.local || !socketRef.current?.connected) { showToast('This local meeting cannot send network invitations.'); return; }
    socketRef.current.emit('meeting:invite', { meetingId: activeMeeting.id, targetId: peer.id });
    showToast(`Meeting invitation sent to ${peer.name}`);
  };

  const acceptMeetingInvite = () => {
    const meeting = incomingInvite?.meeting;
    setIncomingInvite(null); setModal(null);
    if (meeting) joinMeeting(meeting);
  };

  const attemptVoteBuying = () => {
    if (profile.cash < 250_000) { showToast('The abstract risk event costs ₦250,000 in-game.'); setModal(null); return; }
    setProfile((current) => ({ ...current, cash: current.cash - 250_000, influence: clamp(current.influence + 8), trust: clamp(current.trust - 7), integrity: clamp(current.integrity - 24), scandals: current.scandals + 1, energy: clamp(current.energy - 6) }));
    increaseProgress(); setStoryDay((day) => day + 1);
    addFeed('Integrity breach logged', 'An abstract vote-buying attempt created an investigation risk. No real-world tactic is represented; short-term reach may not survive scrutiny.', 'risk');
    setModal(null); showToast('High-risk choice · investigation and disqualification risk increased');
  };

  const rest = () => {
    setProfile((current) => ({ ...current, energy: clamp(current.energy + 22), trust: clamp(current.trust + (current.integrity >= 70 ? 1 : 0)) }));
    setStoryDay((day) => day + 1); addFeed('Reset & regroup', 'A quiet day restored energy before the next public meeting.', 'rest'); showToast('Energy restored');
  };

  const goToVenue = (venueId) => {
    const venue = WORLD_VENUES.find((item) => item.id === venueId);
    if (!venue) return;
    setActiveVenueId(venueId); setVenueFocusRequest((request) => request + 1); setPage('world'); showToast(`Travelling to ${venue.label}`); focusWorldOnMobile();
  };

  const travelToState = (stateName) => {
    if (stateName !== selectedStateName) { setSelectedStateName(stateName); setSelectedLgaName(''); setSelectedWardKey(''); }
    setActiveVenueId('square'); setVenueFocusRequest((request) => request + 1); setCommunityFocusRequest((request) => request + 1); setPage('world');
    const next = STATES.find((item) => item.name === stateName);
    if (next) { addFeed(`Travelled to ${next.name}`, `Your campaign arrived in ${next.capital}. The district is procedural art, not a surveyed street map.`, 'travel'); setToast(`Arrived in ${next.capital}, ${next.name}`); }
    focusWorldOnMobile();
  };

  const travelToWard = (ward, lgaName = selectedLgaName) => {
    if (!ward || !lgaName) return;
    setSelectedLgaName(lgaName); setSelectedWardKey(wardKey(ward)); setActiveVenueId('square');
    setVenueFocusRequest((request) => request + 1); setCommunityFocusRequest((request) => request + 1); setPage('world');
    addFeed(`Arrived in ${ward.name}`, `${ward.name} ward, ${lgaName} LGA, ${stateInfo.name}. The point is approximate; the rendered streetscape is fictional.`, 'travel');
    setToast(`Now in ${ward.name} · ${lgaName} LGA`); focusWorldOnMobile();
  };

  const selectLga = (lgaName) => {
    const next = stateLocalities?.lgas?.find((item) => item.name === lgaName);
    if (!next) return;
    travelToWard(next.wards?.[0], next.name);
  };

  const selectWardByKey = (key) => {
    const ward = currentLga?.wards?.find((item) => wardKey(item) === key);
    if (ward) travelToWard(ward, currentLga.name);
  };

  const continueCareer = () => {
    if (missionProgress < 3) { showToast('Complete three story interactions to unlock the next political stage.'); return; }
    const nextIndex = Math.min(stageIndex + 1, activeCareerStages.length - 1);
    setStageIndex(nextIndex); setMissionProgress(0); setStoryDay((day) => day + 1); setPage('world');
    addFeed('Political chapter unlocked', `${activeCareerStages[nextIndex].title} is now open.`, 'promotion'); showToast(`Political chapter ${String(nextIndex + 1).padStart(2, '0')} unlocked`);
  };

  const runContest = () => {
    if (missionProgress < 3) { showToast('Complete three story interactions before the internal vote, appointment review or election.'); return; }
    const chapter = currentChapter;
    const appointment = chapter.kind === 'appointment';
    const support = appointment
      ? clamp(Math.round(profile.integrity * .5 + profile.trust * .17 + profile.influence * .1 + profile.coalition * .8 + missionProgress * 1.2 + (Math.random() * 8 - 4)), 25, 93)
      : clamp(Math.round(20 + profile.trust * .18 + profile.influence * .2 + profile.coalition * 1.65 + profile.integrity * .05 + missionProgress * 1.55 - profile.scandals * 8 + (profile.legalBoost ? 6 : 0) + (Math.random() * 8 - 4)), 16, 89);
    const opponent = appointment ? clamp(Math.round(51 + stageIndex * .35 + Math.random() * 8), 48, 76) : clamp(Math.round(47 + stageIndex * .78 + Math.random() * 7), 34, 78);
    const won = support >= opponent;
    const typeLabel = appointment ? 'FICTIONAL APPOINTMENT REVIEW' : chapter.kind === 'primary' ? 'SIMULATED INTERNAL PARTY / CAUCUS VOTE' : 'FICTIONAL PUBLIC ELECTION';
    const contest = {
      chapterId: chapter.id, chapterTitle: chapter.title, office: chapter.office, won, support, opponent,
      typeLabel, supportLabel: appointment ? 'YOUR REVIEW SCORE' : chapter.kind === 'primary' ? 'YOUR DELEGATE SUPPORT' : 'YOUR SIMULATED SUPPORT',
      opponentLabel: appointment ? 'REVIEW THRESHOLD' : chapter.kind === 'primary' ? 'RIVAL SLATE' : 'RIVAL CAMPAIGN',
      petitioned: false, eligibleForPetition: chapter.kind === 'race', appointment,
    };
    setStoryDay((day) => day + 2);
    if (won) {
      const nextIndex = Math.min(stageIndex + 1, activeCareerStages.length - 1);
      const isFinal = stageIndex === activeCareerStages.length - 1;
      setProfile((current) => ({
        ...current, wins: current.wins + 1,
        trust: clamp(current.trust + (appointment ? 2 : 4)), influence: clamp(current.influence + (appointment ? 2 : 5)),
        integrity: clamp(current.integrity + 1), coalition: clamp(current.coalition + (appointment ? 0 : 1), 0, 12), energy: clamp(current.energy + 10),
        lastContest: chapter.kind === 'race' ? contest : current.lastContest,
        legalBoost: false, completed: isFinal,
      }));
      addFeed(appointment ? `Appointment review advanced · ${chapter.office}` : `Political milestone won · ${chapter.office}`, appointment ? 'The fictional merit review advanced your political story. Real appointments require their own lawful procedures and cannot be granted by this simulation.' : `The fictional vote simulation favoured your campaign, ${support} to ${opponent}. This is not a real-world forecast.`, 'win');
      setMissionProgress(0);
      if (isFinal) setModal({ type: 'ending', contest });
      else { setStageIndex(nextIndex); setModal({ type: 'result', contest, nextChapter: activeCareerStages[nextIndex] }); }
    } else {
      setProfile((current) => ({ ...current, trust: clamp(current.trust - 2), influence: clamp(current.influence - 2), energy: clamp(current.energy - 8), ...(chapter.kind === 'race' ? { lastContest: contest } : {}), legalBoost: false }));
      addFeed(appointment ? `Review not advanced · ${chapter.office}` : `Result recorded · ${chapter.office}`, appointment ? `The fictional review score was ${support}, below the scenario threshold of ${opponent}. This is not an actual nomination decision.` : `Your simulated score was ${support}; the rival score was ${opponent}. Rebuild support or accept the result. A petition is only relevant to a genuine public-election dispute.`, 'loss');
      setModal({ type: 'result', contest, nextChapter: null });
    }
  };

  const prepareEvidence = () => {
    if (profile.cash < 65_000) { showToast('Evidence review requires ₦65,000 in-game.'); return; }
    setProfile((current) => ({ ...current, cash: current.cash - 65_000, evidence: current.evidence + 1, integrity: clamp(current.integrity + 1) }));
    setStoryDay((day) => day + 1); addFeed('Evidence review', 'Your fictional legal team reviewed public records and election procedures. A file is not proof by itself.', 'legal');
    showToast('Evidence file prepared · no outcome guaranteed');
  };

  const filePetition = () => {
    const contest = profile.lastContest;
    if (!contest || contest.won || !contest.eligibleForPetition) { showToast('There is no unresolved public-election result available for a petition.'); return; }
    if (profile.evidence < 1) { showToast('Prepare an evidence file before filing.'); return; }
    if (profile.cash < 180_000) { showToast('Filing preparation requires ₦180,000 in-game.'); return; }
    const chance = clamp(.15 + profile.integrity * .0032 + profile.evidence * .11 - profile.scandals * .04, .12, .78);
    const succeeds = Math.random() < chance;
    setProfile((current) => ({ ...current, cash: current.cash - 180_000, trust: clamp(current.trust + (succeeds ? 3 : -2)), integrity: clamp(current.integrity + (succeeds ? 2 : -1)), legalBoost: succeeds, lastContest: { ...contest, petitioned: true, petitionOutcome: succeeds ? 'remedy' : 'dismissed' } }));
    setStoryDay((day) => day + 8); addFeed(succeeds ? 'Court grants a limited remedy' : 'Petition dismissed', succeeds ? 'The fictional court orders a lawful remedial process. It does not automatically award you office.' : 'The simulated petition did not meet the required standard. The result stands in this scenario.', 'legal');
    setModal({ type: 'petition-result', succeeds });
  };

  const sendChat = (event) => {
    event.preventDefault();
    const message = chatDraft.trim().slice(0, 180);
    if (!message) return;
    if (socketRef.current?.connected) { socketRef.current.emit('world:chat', { message }); setChatDraft(''); }
    else { setChatMessages((current) => [{ id: `local-${Date.now()}`, name: profile.alias || 'Candidate', state: selectedStateName, message, local: true, at: Date.now() }, ...current].slice(0, 50)); setChatDraft(''); showToast('Saved to local chat preview; multiplayer server is offline.'); }
  };
  const sendMove = (position) => { if (socketRef.current?.connected) socketRef.current.volatile.emit('player:move', { x: position.x, z: position.z }); };

  const resetGame = () => {
    try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setProfile({ ...defaultProfile }); setCareerTrack(DEFAULT_CAREER_TRACK); setProgressByTrack(initialProgressByTrack(null)); setStoryDay(1); setSelectedStateName('Lagos');
    setActiveMeeting(null); setMeetingMessages([]); setMeetingParticipants([]); setDraftAlias(''); setDraftParty(PARTY_OPTIONS[0].name); setDraftState('Lagos'); setOnboardingOpen(true); setModal(null);
  };

  const renderMainPage = () => {
    if (page === 'career') return <CareerPage stageIndex={stageIndex} progress={missionProgress} profile={profile} onJump={setPage} onContinue={continueCareer} stages={activeCareerStages} onOpenInstitution={openInstitutionStory} />;
    if (page === 'offices') return <OfficesPage />;
    if (page === 'civic') return <CivicPage />;
    if (page === 'atlas') return <AtlasPage query={atlasQuery} setQuery={setAtlasQuery} zone={selectedZone} setZone={setSelectedZone} selected={selectedStateName} onTravel={travelToState} />;
    return <WorldPage stateInfo={stateInfo} stateWorldProfile={stateWorldProfile} venue={activeVenue} venueName={activeVenueName} focusRequest={venueFocusRequest} locationKey={sceneLocationKey} locality={sceneLocality} localityData={stateLocalities?.state === stateInfo.name ? stateLocalities : null} localityLoading={localityLoading || (!localityError && stateLocalities?.state !== stateInfo.name)} localityError={localityError} selectedLgaName={selectedLgaName} selectedWardKey={selectedWardKey} onSelectLga={selectLga} onSelectWard={selectWardByKey} onSelectVenue={goToVenue} remotePlayers={remotePlayers} onMove={sendMove} playerColor={profile.color || currentParty.color} onlineCount={onlineCount} networkStatus={networkStatus} onTravel={travelToState} daysToFederal={daysToFederal} daysToState={daysToState} storyDay={storyDay} />;
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><span /><i /></div><div className="brand-type"><strong>NIGERIA <b>2027</b></strong><small>A LIFE IN PUBLIC OFFICE</small></div></div>
      <div className="topbar-middle"><div className="season-pill"><span className="season-dot" /> STORY MODE <span className="season-divider" /> ACCELERATED CAREER</div><div className="election-clock"><CalendarDays size={14} /><span>FEDERAL <b>16 JAN 2027</b></span><i /> <span>STATE <b>06 FEB 2027</b></span></div></div>
      <div className="topbar-actions"><div className={`network-chip ${networkStatus}`}><span className="pulse-dot" />{networkStatus === 'online' ? `${onlineCount || 1} IN WORLD` : networkStatus === 'connecting' ? 'CONNECTING' : 'LOCAL MODE'}</div><button className="wallet-chip" onClick={() => showToast('In-game funds only · no real money or withdrawals')} title="In-game funds only"><Wallet size={15} /><span>₦{money(profile.cash)}</span></button><button className={`account-status-chip ${authSession ? 'connected' : ''}`} onClick={() => setModal({ type: 'account' })} title={authSession ? 'Manage your account' : 'Guest save · open account options'}>{authSession ? 'ACCOUNT' : 'GUEST'}</button><button className="top-avatar" onClick={() => setModal({ type: 'account' })} title="Account settings">{initials(profile.alias)}</button></div>
    </header>
    <div className="app-layout">
      <aside className="left-sidebar">
        <div className="candidate-summary"><div className="candidate-kicker">YOUR CAMPAIGN <span>{authSession ? 'ACCOUNT' : 'LOCAL'}</span></div><div className="candidate-id-row"><div className="candidate-avatar" style={{ '--party-color': profile.color || currentParty.color }}>{initials(profile.alias)}</div><div className="candidate-name-wrap"><strong>{profile.alias || 'New Candidate'}</strong><span>{currentParty.tag} · {currentParty.name}</span></div></div><div className="candidate-meta"><span><MapPin size={12} />{stateInfo.capital}, {stateInfo.name}</span><span><Flag size={12} />{String(stageIndex + 1).padStart(2, '0')} / {activeCareerStages.length}</span></div><div className="career-mini-progress"><span style={{ width: `${((stageIndex + 1) / activeCareerStages.length) * 100}%` }} /></div><div className="mini-progress-caption"><span>POLITICAL LADDER</span><b>{Math.round(((stageIndex + 1) / activeCareerStages.length) * 100)}%</b></div></div>
        <div className="sidebar-section-title">COMMAND DECK</div><nav className="side-nav" aria-label="Game navigation">{NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'world' && <span className="nav-online" />}</button>; })}</nav>
        <div className="sidebar-nation-card"><div className="nation-card-top"><span><Globe2 size={13} /> NIGERIA MAP</span><span>36 + FCT</span></div><strong>37 capital visits</strong><p>Travel the atlas. Hear a different set of local priorities in every stop.</p><button onClick={() => setPage('atlas')}>OPEN STATE ATLAS <ArrowRight size={13} /></button></div>
        <div className="sidebar-bottom"><div className="live-server-card"><div className="server-card-head"><span>REALTIME PROTOTYPE</span><span className={`server-led ${networkStatus}`} /></div><div className="server-card-status"><Radio size={14} /><b>{networkStatus === 'online' ? 'World link active' : networkStatus === 'connecting' ? 'Connecting to world' : 'Offline · local play'}</b></div><small>{authConfig.persistenceEnabled ? 'Account-backed profiles, DMs & meeting records' : 'Guest preview · meetings and DMs are session-only'}</small></div><button className="sidebar-reset" onClick={() => setModal({ type: 'reset' })}><Sparkles size={15} />Start a new candidate</button></div>
      </aside>
      <main className="main-content">
        <div className="main-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" />{page === 'world' ? 'LIVE SIMULATION' : page === 'career' ? 'CAMPAIGN JOURNAL' : page === 'offices' ? 'CIVIC STRUCTURE' : page === 'civic' ? 'RESEARCH & CONTEXT' : 'NATIONAL ATLAS'} <span className="heading-season">/ STORY 2027</span></div><h1>{page === 'world' ? 'The Republic is in motion.' : page === 'career' ? 'One ladder. The wider republic.' : page === 'offices' ? 'Know the titles. Know the route.' : page === 'civic' ? 'Politics, with the context intact.' : 'One federation. 37 capital stops.'}</h1><p>{page === 'world' ? 'Build a public life through meetings, decisions and a political mandate.' : page === 'career' ? 'Your political career stays continuous; courts, election administrators and the Central Bank shape the world around it.' : page === 'offices' ? 'Elected, internal party, appointed, judicial, electoral-administration and central-bank roles stay distinct.' : page === 'civic' ? 'A researched, non-partisan desk for the realities behind this fictional campaign.' : 'Select a state to travel into its capital district and continue your campaign.'}</p></div><div className="heading-location"><span className="heading-location-icon"><MapPin size={17} /></span><div><small>CURRENT STOP</small><strong>{stateInfo.capital}, {stateInfo.name}</strong><span>{stateInfo.zone.toUpperCase()}</span></div><button onClick={() => setPage('atlas')} aria-label="Choose a state"><ChevronDown size={15} /></button></div></div>
        {renderMainPage()}
      </main>
      <aside className="right-rail">
        <div className="rail-title-row"><div><div className="rail-eyebrow"><span className="pulse-dot" />CURRENT OBJECTIVE</div><h2>CHAPTER {currentChapter.number}</h2></div><button className="rail-more" onClick={() => setPage('career')} aria-label="Open career path"><ChevronRight size={17} /></button></div>
        <div className="mission-card"><div className="mission-card-top"><span>{currentChapter.phase}</span><span>{currentChapter.number} / {activeCareerStages.length}</span></div><h3>{currentChapter.title}</h3><p>{currentChapter.goal}</p><div className="mission-description">{currentChapter.description}</div><div className="mission-objectives">{currentChapter.objectives.map((item, index) => <div className={missionProgress > index ? 'done' : ''} key={item}><span>{missionProgress > index ? <Check size={10} /> : String(index + 1).padStart(2, '0')}</span>{item}</div>)}</div><div className="mission-fact"><span>FIELD NOTE</span>{currentChapter.fact}</div><div className="objective-office"><div className="office-glyph"><Landmark size={18} /></div><div><small>ROUTE TO OFFICE</small><strong>{currentChapter.office}</strong></div></div><div className="objective-meter"><div><span>STORY PREP</span><b>{missionProgress} / 3</b></div><div className="objective-meter-track"><span style={{ width: `${progressPercent}%` }} /></div></div><div className="mission-actions-row">{currentChapter.kind === 'story' ? <button className="primary-action" onClick={continueCareer} disabled={missionProgress < 3}>ADVANCE CHAPTER <ArrowRight size={14} /></button> : <button className="primary-action" onClick={runContest} disabled={missionProgress < 3}>{currentChapter.kind === 'appointment' ? 'ATTEND APPOINTMENT REVIEW' : currentChapter.kind === 'primary' ? 'CALL THE INTERNAL VOTE' : 'SIMULATE PUBLIC ELECTION'} <ArrowRight size={14} /></button>}<button className="icon-action" onClick={() => setPage('career')} title="View the full career path"><BookOpen size={16} /></button></div></div>
        <div className="stats-panel"><div className="stats-panel-title"><span>CAMPAIGN HEALTH</span><span className="stats-live"><Activity size={12} /> LIVE</span></div><StatBar label="PUBLIC TRUST" value={profile.trust} color="mint" icon={Users} /><StatBar label="INFLUENCE" value={profile.influence} color="blue" icon={TrendingUp} /><StatBar label="INTEGRITY" value={profile.integrity} color="lime" icon={Shield} /><div className="resource-row"><div className="resource-box"><div><Zap size={13} /><span>ENERGY</span></div><strong>{profile.energy}<small>/100</small></strong><div className="micro-track"><span style={{ width: `${profile.energy}%` }} /></div></div><div className="resource-box"><div><Users size={13} /><span>COALITION</span></div><strong>{profile.coalition}<small>/12</small></strong><div className="micro-track coalition"><span style={{ width: `${(profile.coalition / 12) * 100}%` }} /></div></div></div><div className="cash-line"><span><Banknote size={13} /> CAMPAIGN PURSE</span><strong>₦{money(profile.cash)}</strong></div>{profile.scandals > 0 && <div className="risk-line"><ShieldAlert size={13} /> INTEGRITY RISK · {profile.scandals} OPEN FLAG{profile.scandals === 1 ? '' : 'S'}</div>}</div>
        <div className="quick-actions-panel"><div className="quick-actions-heading"><div><span className="rail-eyebrow">YOUR NEXT MOVE</span><h3>Story interactions</h3></div><button className="rest-button" onClick={rest} title="Rest to restore energy"><Clock3 size={13} />REST</button></div><div className="action-list">{ACTIONS.map((action) => { const Icon = action.icon; return <button key={action.id} className={`action-row ${action.color}`} onClick={() => startCampaignAction(action.id)} disabled={profile.cash < action.cost || profile.energy < action.energy}><span className="action-icon"><Icon size={16} /></span><span className="action-copy"><strong>{action.label}</strong><small>{action.detail}</small></span><ChevronRight size={15} className="action-chevron" /></button>; })}<button className="action-row consult-action" onClick={openConsultation}><span className="action-icon"><Briefcase size={16} /></span><span className="action-copy"><strong>Consult a senior</strong><small>Listen to what they ask of you</small></span><ChevronRight size={15} className="action-chevron" /></button></div><div className="risk-actions"><button onClick={() => setModal({ type: 'illegal-confirm' })}><Banknote size={13} />Try illicit inducement <span>HIGH RISK</span></button><button onClick={() => setModal({ type: 'legal' })}><Scale size={13} />Open court desk <span>{profile.evidence} FILES</span></button></div></div>
        <ChatPanel messages={chatMessages} draft={chatDraft} setDraft={setChatDraft} onSend={sendChat} onlineCount={onlineCount} status={networkStatus} stateName={selectedStateName} people={remotePlayers} meetings={availableMeetings} activeMeeting={activeMeeting} dmMessages={dmMessages} dmDraft={dmDraft} setDmDraft={setDmDraft} selectedDmPeer={selectedDmPeer} onSelectDmPeer={selectDmPeer} onSendDm={sendDirectMessage} onJoinMeeting={joinMeeting} onInvite={inviteToMeeting} />
        <div className="rail-disclaimer"><LockKeyhole size={12} /><span>Fictional campaign · no real money, voting or party affiliation.</span></div>
      </aside>
    </div>
    {toast && <div className="toast-pop"><span className="toast-symbol"><Check size={14} /></span>{toast}</div>}
    {activeMeeting && <MeetingRoom meeting={activeMeeting} messages={meetingMessages} participants={meetingParticipants} votes={meetingVotes} draft={meetingDraft} setDraft={setMeetingDraft} replyTo={meetingReplyTo} setReplyTo={setMeetingReplyTo} onSend={submitMeetingMessage} onVote={castMeetingVote} onCloseMeeting={closeMeeting} onLeave={leaveMeeting} people={remotePlayers} onInvite={inviteToMeeting} />}
    {onboardingOpen && <WelcomeModal alias={draftAlias} setAlias={setDraftAlias} party={draftParty} setParty={setDraftParty} state={draftState} setState={setDraftState} onStart={startCandidate} onClose={() => setOnboardingOpen(false)} hasSave={Boolean(boot?.profile?.started)} authEnabled={authConfig.authEnabled} persistenceEnabled={authConfig.persistenceEnabled} authBusy={authBusy} authSession={authSession} onAuth={submitAccount} onAuthSuccess={(result) => { if (result.save) restoreCloudSave(result.save); else startCandidate(); }} onSignOut={signOut} />}
    {modal?.type === 'account' && <AccountModal authEnabled={authConfig.authEnabled} persistenceEnabled={authConfig.persistenceEnabled} authBusy={authBusy} authSession={authSession} onAuth={submitAccount} onSignOut={signOut} onClose={() => setModal(null)} onSuccess={(result) => { if (result.save) restoreCloudSave(result.save); else { setModal(null); setToast('Account connected · this career will sync when database persistence is enabled'); } }} />}
    {modal?.type === 'story-action' && <StoryActionModal key={modal.actionId} actionId={modal.actionId} scene={CAMPAIGN_SCENES[modal.actionId]} npc={modal.npc} onComplete={finishStoryAction} onClose={() => setModal(null)} />}
    {modal?.type === 'institution-story' && <InstitutionStoryModal key={modal.arcId} arc={INSTITUTIONAL_STORY_ARCS.find((item) => item.id === modal.arcId)} completed={(profile.completedSideStories || []).includes(modal.arcId)} onComplete={finishInstitutionStory} onClose={() => setModal(null)} />}
    {modal && !['account', 'story-action', 'institution-story'].includes(modal.type) && <GameModal modal={modal} onClose={() => setModal(null)} onAcceptMeetingInvite={acceptMeetingInvite} onIllegalConfirm={attemptVoteBuying} onPrepareEvidence={prepareEvidence} onFilePetition={filePetition} onReset={resetGame} profile={profile} />}
  </div>;
}

function StatBar({ label, value, color, icon: Icon }) {
  return <div className={`stat-row ${color}`}><div className="stat-row-label"><span><Icon size={13} />{label}</span><b>{value}<small>%</small></b></div><div className="stat-track"><span style={{ width: `${value}%` }} /></div></div>;
}

function LocalityExplorer({ stateInfo, stateWorldProfile, data, loading, error, lgaName, selectedWardKey, onSelectLga, onSelectWard }) {
  const [wardQuery, setWardQuery] = useState('');
  const lga = data?.lgas?.find((item) => item.name === lgaName) || null;
  const wards = lga?.wards || [];
  const selectedWard = wards.find((item) => wardKey(item) === selectedWardKey) || null;
  const filteredWards = wards.filter((item) => !wardQuery.trim() || item.name.toLowerCase().includes(wardQuery.trim().toLowerCase()));
  useEffect(() => setWardQuery(''), [lgaName]);

  return <section className="locality-explorer" aria-label="State, local government and ward explorer">
    <div className="locality-explorer-head">
      <div><div className="eyebrow"><span className="eyebrow-line" />STATE → LGA → WARD</div><h2>Choose a local ground</h2><p>{stateInfo.name} · {stateWorldProfile.biome}. Select a local government and a named electoral ward to regenerate the 3D neighbourhood.</p></div>
      <div className="locality-national-counts"><span><b>37</b> STATES / FCT</span><span><b>774</b> LGAs</span><span><b>8,809</b> WARD RECORDS</span></div>
    </div>
    {loading && <div className="locality-state-message"><span className="locality-loader" />Loading {stateInfo.name}’s local directory…</div>}
    {!loading && error && <div className="locality-state-message locality-error"><strong>Directory unavailable</strong><span>{error}</span></div>}
    {!loading && !error && data && <>
      <div className="locality-selectors">
        <label><span>LOCAL GOVERNMENT AREA</span><select value={lgaName} onChange={(event) => onSelectLga(event.target.value)} aria-label={`Choose an LGA in ${stateInfo.name}`}>
          {data.lgas.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select><small>{data.lgas.length} LGAs in {stateInfo.name}</small></label>
        <label><span>WARD / REGISTRATION AREA</span><select value={selectedWard ? wardKey(selectedWard) : ''} onChange={(event) => onSelectWard(event.target.value)} aria-label={`Choose a ward in ${lga?.name || stateInfo.name}`}>
          {wards.map((item) => <option key={wardKey(item)} value={wardKey(item)}>{item.name}</option>)}
        </select><small>{wards.length} named ward records in this LGA</small></label>
      </div>
      <div className="locality-active-card">
        <div className="locality-active-pin"><MapPin size={16} /></div><div className="locality-active-copy"><small>ACTIVE PROCEDURAL 3D LOCATION</small><strong>{selectedWard ? selectedWard.name : 'Select a ward'}<span> · </span>{lga?.name || 'LGA'}</strong><span>{stateInfo.name} · {selectedWard ? `approx. ${selectedWard.lat.toFixed(4)}° N, ${selectedWard.lon.toFixed(4)}° E` : 'Representative point not available'}</span></div>
        <button disabled={!selectedWard} onClick={() => selectedWard && onSelectWard(wardKey(selectedWard))}><MapPin size={13} />REVISIT IN 3D</button>
      </div>
      <div className="ward-directory-heading"><div><span className="eyebrow-line" />WARD DIRECTORY <b>{filteredWards.length}</b></div><label className="ward-search"><Search size={13} /><input value={wardQuery} onChange={(event) => setWardQuery(event.target.value)} placeholder="Filter wards in this LGA" /></label></div>
      {filteredWards.length ? <div className="ward-chip-grid">{filteredWards.map((ward, index) => {
        const key = wardKey(ward);
        const active = key === selectedWardKey;
        return <button key={key} className={`ward-chip ${active ? 'active' : ''}`} onClick={() => onSelectWard(key)} aria-label={`Travel to ${ward.name} ward, ${lga.name}`} title={`Open ${ward.name} in the 3D world`}><span className="ward-chip-index">{String(index + 1).padStart(2, '0')}</span><strong>{ward.name}</strong><small>{active ? 'CURRENT 3D LOCATION' : 'VISIT THIS WARD'}</small><ArrowRight size={13} /></button>;
      })}</div> : <div className="locality-empty">No wards match that filter.</div>}
      <div className="locality-data-note"><span>DATA NOTE</span><p>Directory entries are electoral wards / registration areas with approximate representative points—not an exhaustive gazetteer of villages, streets, homes or polling units. This neighbourhood is procedural art seeded by the selected locality; its layout is not a surveyed map.</p></div>
    </>}
  </section>;
}

function WorldPage({ stateInfo, stateWorldProfile, venue, venueName, focusRequest, locationKey, locality, localityData, localityLoading, localityError, selectedLgaName, selectedWardKey, onSelectLga, onSelectWard, onSelectVenue, remotePlayers, onMove, playerColor, onlineCount, networkStatus, onTravel, daysToFederal, daysToState, storyDay }) {
  const [venueFilter, setVenueFilter] = useState('ALL');
  const venueTypes = ['ALL', 'PUBLIC', 'POLITICS', 'TRAVEL'];
  const visibleVenues = WORLD_VENUES.filter((item) => venueFilter === 'ALL' || (venueFilter === 'PUBLIC' && ['square', 'market', 'stadium'].includes(item.type)) || (venueFilter === 'POLITICS' && ['office', 'court', 'assembly', 'caucus'].includes(item.type)) || (venueFilter === 'TRAVEL' && item.type === 'airport'));
  return <div className="world-page">
    <div className="world-topline"><div className="world-live"><span className="pulse-dot" />LOCAL WORLD <b>{(locality?.ward || stateInfo.capital).toUpperCase()}</b><span className="line-sep" />{stateInfo.zone.toUpperCase()}</div><div className="world-date"><Clock3 size={13} />{dateLabel(storyDay)} <span>·</span> 15:42 WAT <span className="weather-dot" /> OVERCAST</div><div className="world-connect"><span className={`network-led ${networkStatus}`} />{networkStatus === 'online' ? `${onlineCount || 1} PLAYERS` : 'LOCAL INSTANCE'}</div></div>
    <div className="world-view-frame"><World state={stateInfo.name} locality={locality} locationKey={locationKey} selectedVenueId={venue.id} focusRequest={focusRequest} onVenueSelect={onSelectVenue} onMove={onMove} remotePlayers={remotePlayers} playerColor={playerColor} /><div className="scene-vignette" />
      <div className="scene-location-card"><div className="scene-card-kicker"><span className="scene-pin" />{locality ? 'YOUR WARD' : 'STATE CAPITAL'} <span>·</span> {stateInfo.zone.toUpperCase()}</div><h2>{locality?.lga || stateInfo.capital}<span>,</span> {stateInfo.name}</h2><p>{locality ? `${locality.ward} · ${stateWorldProfile.biome}` : `${stateWorldProfile.biome} · ${stateInfo.capital}`} · fictional procedural scene</p><div className="scene-local-landmark"><MapPin size={13} /><span>STATE SIGNATURE</span><b>{stateInfo.landmark}</b></div></div>
      <div className="scene-brief-card"><div className="brief-head"><span className="brief-live"><Radio size={12} /> ELECTION CLOCK</span><span>INEC CALENDAR</span></div><div className="brief-countdown"><div><strong>{Number.isFinite(daysToFederal) ? Math.max(0, daysToFederal) : '—'}</strong><span>DAYS TO FEDERAL</span></div><i /><div><strong>{Number.isFinite(daysToState) ? Math.max(0, daysToState) : '—'}</strong><span>DAYS TO STATE</span></div></div><div className="brief-dates"><span>16 JAN 2027</span><span>06 FEB 2027</span></div></div>
      <div className="mini-map-card"><div className="mini-map-top"><span>{locality ? `${locality.lga.toUpperCase()} GRID` : 'CAPITAL GRID'}</span><span className="map-north">N ↑</span></div><svg viewBox="0 0 150 102" role="img" aria-label="Stylised local street grid"><path d="M8 26H138M8 50H138M8 75H138M31 10V92M67 10V92M103 10V92M128 10V92" stroke="rgba(241,240,215,.42)" strokeWidth="3" /><path d="M8 50H138M67 10V92" stroke="#d6f176" strokeWidth="6" /><circle cx="83" cy="40" r="5" fill="#fff5db" /><circle cx="83" cy="40" r="12" fill="none" stroke="#d6f176" strokeWidth="1.5" /><path d="M83 27l-5 8h10z" fill="#d6f176" /></svg><div className="mini-map-foot"><span><i /> YOU</span><span>NOT TO SCALE</span></div></div>
      <div className="scene-current-site"><span className="site-icon"><MapPin size={14} /></span><div><small>SELECTED LOCATION</small><strong>{venueName}</strong><span>{venue.desc}</span><span>{locality ? `${locality.ward} ward · ${locality.lga} LGA` : `Capital district · ${stateInfo.name}`}</span></div></div>
      <div className="scene-controls"><span><Move size={13} /> CLICK TO WALK</span><i /> <span>WASD / ARROWS MOVE</span><i /> <span>DRAG TO ORBIT</span><i /> <span>SCROLL TO ZOOM</span></div>
      <div className="mobile-gesture-hint"><span>SWIPE TO ORBIT</span><i /> <span>PINCH TO ZOOM</span></div>
      <div className="scene-cinematic-label"><span>REALTIME CITY</span><b>3D</b></div><div className="scene-asset-note">STYLISED PROCEDURAL DISTRICT · NOT A SURVEY MAP</div>
    </div>
    <div className="mobile-scroll-note"><span>SCROLL FOR PLACES, MISSIONS & WARD DIRECTORY</span><ChevronDown size={12} /></div>
    <div className="world-lower-row"><div className="location-card-grid"><div className="location-filter-row"><div><span className="eyebrow-line" />PLACES TO VISIT <b>{visibleVenues.length}</b></div><div className="location-filter">{venueTypes.map((type) => <button key={type} className={venueFilter === type ? 'active' : ''} onClick={() => setVenueFilter(type)}>{type}</button>)}</div></div><div className="venue-cards">{visibleVenues.map((place) => <button key={place.id} className={`venue-chip ${venue.id === place.id ? 'selected' : ''}`} onClick={() => onSelectVenue(place.id)} aria-label={`Travel to ${place.label} in the 3D city`} title={`Travel to ${place.label}`}><span className={`venue-icon venue-${place.type}`}>{venueIcon(place.type)}</span><span><strong>{place.label}</strong><small>{place.short} · VISIT IN 3D</small></span><ArrowRight size={13} /></button>)}</div></div>
      <div className="world-feed-card"><div className="feed-card-head"><span><Activity size={14} />DISTRICT PULSE</span><button onClick={() => onTravel('Lagos')}>RETURN TO START <ArrowRight size={12} /></button></div><div className="district-pulse-grid"><div><strong>37</strong><small>CAPITALS</small></div><div><strong>06</strong><small>GEO-ZONES</small></div><div><strong>{onlineCount || 1}</strong><small>PLAYERS</small></div></div><p>Regional biomes, roadside compounds, market stalls, civic landmarks and familiar Nigerian vehicles vary by state and locality. Multiplayer presence is a small-room prototype.</p></div></div>
    <LocalityExplorer stateInfo={stateInfo} stateWorldProfile={stateWorldProfile} data={localityData} loading={localityLoading} error={localityError} lgaName={selectedLgaName} selectedWardKey={selectedWardKey} onSelectLga={onSelectLga} onSelectWard={onSelectWard} />
  </div>;
}

function venueIcon(type) {
  if (['office', 'caucus', 'assembly'].includes(type)) return <Landmark size={15} />;
  if (type === 'court') return <Scale size={15} />;
  if (type === 'market') return <Banknote size={15} />;
  if (type === 'airport') return <Plane size={15} />;
  if (type === 'stadium') return <Flag size={15} />;
  return <Users size={15} />;
}

function CareerPage({ stageIndex, progress, profile, onJump, onContinue, stages, onOpenInstitution }) {
  return <div className="career-page">
    <div className="career-hero-card"><div className="career-hero-copy"><div className="career-label"><Sparkles size={14} /> ONE POLITICAL LADDER <span>{stages.length} STAGES</span></div><h2>From one ward<br /><em>to the whole country.</em></h2><p>{CAREER_TRACKS[0].description}</p><button className="primary-action" onClick={() => onJump('world')}>RETURN TO THE WORLD <ArrowRight size={14} /></button></div><div className="career-ring"><div className="career-ring-inner"><strong>{String(stageIndex + 1).padStart(2, '0')}</strong><span>OF {stages.length}</span></div><span className="ring-orbit" /><span className="ring-dot" /></div><div className="career-hero-stats"><div><small>SIMULATED MILESTONES</small><strong>{profile.wins}</strong></div><div><small>PUBLIC TRUST</small><strong>{profile.trust}<i>%</i></strong></div><div><small>LADDER PROGRESS</small><strong>{Math.round(((stageIndex + 1) / stages.length) * 100)}<i>%</i></strong></div></div></div>
    <div className="timeline-heading"><div><div className="eyebrow"><span className="eyebrow-line" />POLITICAL CAREER LADDER</div><h2>{stages.length} stages · one continuous route</h2></div><div className="timeline-legend"><span><i className="legend-done" />COMPLETED</span><span><i className="legend-current" />CURRENT</span><span><i className="legend-locked" />LOCKED</span></div></div>
    <div className="career-timeline">{stages.map((chapter, index) => { const completed = index < stageIndex; const current = index === stageIndex; return <div key={chapter.id} className={`timeline-item ${completed ? 'done' : ''} ${current ? 'current' : ''}`}><div className="timeline-track"><div className="timeline-node">{completed ? <Check size={13} /> : chapter.number}</div>{index < stages.length - 1 && <span className="timeline-line" />}</div><div className="timeline-content"><div className="timeline-meta"><span>{chapter.phase}</span><span>STAGE {chapter.number}</span></div><h3>{chapter.title}</h3><p>{chapter.office} · {chapter.goal}</p>{current && <div className="timeline-current-state"><span>IN PROGRESS</span><span>{progress} / 3 story interactions</span><button onClick={chapter.kind === 'story' ? onContinue : () => onJump('world')} disabled={chapter.kind === 'story' && progress < 3}>{chapter.kind === 'story' ? 'ADVANCE' : chapter.kind === 'appointment' ? 'PREPARE REVIEW' : 'PREPARE IN WORLD'}<ArrowRight size={12} /></button></div>}{completed && <div className="timeline-complete"><BadgeCheck size={13} />CHAPTER COMPLETE · {profile.alias}</div>}</div></div>; })}</div>
    <section className="institution-story-section"><div className="institution-story-heading"><div><div className="eyebrow"><span className="eyebrow-line" />THE OTHER SIDE OF THE STORY</div><h2>Institutions beyond the campaign.</h2><p>You remain on the political ladder. Meet fictional judges, election officials and central-bank professionals; their independent work shapes the world around your campaign.</p></div><span className="institution-story-stamp"><Shield size={15} />SEPARATE POWERS</span></div><div className="institution-story-grid">{INSTITUTIONAL_STORY_ARCS.map((arc) => { const complete = (profile.completedSideStories || []).includes(arc.id); return <article className={`institution-story-card ${complete ? 'complete' : ''}`} key={arc.id}><div className="institution-story-card-top"><span>{arc.shortLabel}</span><span>{complete ? 'FILED' : 'SIDE STORY'}</span></div><h3>{arc.label}</h3><p className="institution-role-path">{arc.rolePath}</p><p>{arc.pathwayNote}</p><button onClick={() => onOpenInstitution(arc.id)}>{complete ? 'REVISIT STORY' : `OPEN ${arc.shortLabel} STORY`} <ArrowRight size={12} /></button></article>; })}</div></section>
    <div className="career-footer-note"><Shield size={17} /><div><strong>Elected, internal and appointed roles stay distinct.</strong><span>Political contests advance the player. Courts, election administrators and the Central Bank are separate institutions; side stories do not make the player a judge, INEC/SIEC official, or CBN appointee.</span></div></div>
  </div>;
}

function OfficesPage() {
  const [filter, setFilter] = useState('ALL ROLES');
  const filters = ['ALL ROLES', 'ELECTED', 'INTERNAL', 'APPOINTED'];
  const groups = OFFICE_CATALOG.filter((group) => filter === 'ALL ROLES' || group.group.includes(filter));
  return <div className="offices-page"><div className="offices-intro"><div className="offices-intro-icon"><Landmark size={25} /></div><div><div className="eyebrow"><span className="eyebrow-line" />OFFICE DIRECTORY</div><h2>Who holds what—and how they get there.</h2><p>Election titles, party positions, legislative leadership, and appointed offices are different routes. This directory maps the core political sphere represented in the prototype.</p></div></div><div className="office-filter-row">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>{item}</button>)}<span><CircleHelp size={13} /> Titles can vary by law, party constitution, and chamber rules.</span></div><div className="office-groups">{groups.map((group) => <section className="office-group" key={group.group}><div className="office-group-head"><span className={`office-group-icon ${group.icon === '◆' ? 'elected' : group.icon === '◇' ? 'internal' : 'appointed'}`}>{group.icon}</span><h3>{group.group}</h3><span>{group.roles.length} TITLES</span></div><div className="office-role-grid">{group.roles.map(([title, description]) => <article className="office-role-card" key={title}><div className="office-role-top"><span>{group.icon}</span><span className="role-category">{group.group.split(' — ')[0]}</span></div><h4>{title}</h4><p>{description}</p><div className="role-divider" /><small><ArrowRight size={12} />{group.group.includes('ELECTED') ? 'PUBLIC BALLOT' : group.group.includes('INTERNAL') ? 'INTERNAL SELECTION' : group.group.includes('PUBLIC INSTITUTIONS') ? 'INDEPENDENT OFFICE' : 'APPOINTMENT / SERVICE'}</small></article>)}</div></section>)}</div><div className="office-footnote"><InfoDot /><span>This is a broad game-facing directory, not an exhaustive legal register of every public-service or party title. Constitutional and state-specific rules take precedence.</span></div></div>;
}

function InfoDot() { return <span className="info-dot">i</span>; }
function ShieldCheckIcon() { return <Shield size={26} />; }

function CivicPage() {
  const [expanded, setExpanded] = useState(0);
  return <div className="civic-page"><div className="civic-banner"><div className="civic-banner-icon"><BookOpen size={23} /></div><div><div className="eyebrow"><span className="eyebrow-line" />THE CIVIC DESK</div><h2>Documented pressure points. Not a stereotype.</h2><p>“Dirty politics” is treated as institutional pressures and reported practices—not as a Nigerian cultural trait. The game rewards accountable choices and makes abuse costly.</p></div><div className="civic-stamp"><ShieldCheckIcon /><span>NON-PARTISAN<br />GAME RESEARCH</span></div></div><div className="civic-note-strip"><span className="note-strip-icon"><Eye size={15} /></span><p><strong>How this world handles culture:</strong> Nigerian communities are diverse. The sim includes traditional institutions, faith communities, unions, market associations, youth networks, and civic groups as voluntary voices—not as uniform vote banks.</p></div><div className="research-grid">{RESEARCH_NOTES.map((note, index) => <article className={`research-card ${expanded === index ? 'expanded' : ''}`} key={note.tag}><button className="research-card-button" onClick={() => setExpanded(expanded === index ? -1 : index)}><div className="research-card-top"><span>{note.tag}</span><span className="research-index">0{index + 1}</span></div><h3>{note.title}</h3><p>{note.body}</p><div className="research-source"><BookOpen size={13} /><span>{note.source}</span><ChevronDown size={14} /></div></button>{expanded === index && <a className="source-link" href={note.url} target="_blank" rel="noreferrer">OPEN SOURCE <ArrowRight size={12} /></a>}</article>)}</div><div className="history-panel"><div className="history-panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" />HISTORICAL STARTING POINT</div><h3>From 2023 lessons to a fictional 2027 run.</h3></div><span className="history-date">REFERENCE · 10 OCT 2026</span></div><div className="history-track"><div className="history-point"><span>2023</span><strong>General election</strong><p>Observer findings inform game mechanics: trust, results transparency, campaign finance, participation, and dispute resolution.</p></div><div className="history-point"><span>2024</span><strong>Off-cycle contests</strong><p>State-by-state contests and controversies show why one national campaign template cannot explain every local race.</p></div><div className="history-point future"><span>2027</span><strong>Player-authored scenario</strong><p>INEC’s calendar lists 16 January and 6 February 2027 polls. The real outcome is unknown; your fictional run is not a prediction.</p></div></div></div><div className="civic-footer"><span><Scale size={15} /> Elections, petitions, and official titles use civic references; game characters, parties, and results are invented.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP <ArrowRight size={12} /></button></div></div>;
}

function AtlasPage({ query, setQuery, zone, setZone, selected, onTravel }) {
  const zones = ['All', 'North Central', 'North East', 'North West', 'South East', 'South South', 'South West'];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredStates = STATES.filter((item) => (zone === 'All' || item.zone === zone) && (!normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.capital.toLowerCase().includes(normalizedQuery)));
  const zoneColor = (zoneName) => ({ 'North Central': '#b8c5ff', 'North East': '#f1c177', 'North West': '#e99e77', 'South East': '#c2e77b', 'South South': '#7fd8c3', 'South West': '#d5a8dd' }[zoneName] || '#d8f36b');
  return <div className="atlas-page"><div className="atlas-hero"><div className="atlas-copy"><div className="eyebrow"><span className="eyebrow-line" />THE FEDERATION</div><h2>37 capitals.<br /><em>Choose your next ground.</em></h2><p>Travel to every state capital and the Federal Capital Territory, then choose from that state’s LGAs and electoral wards to load a distinct stylised 3D neighbourhood.</p><div className="atlas-legend">{['North Central', 'North East', 'North West', 'South East', 'South South', 'South West'].map((item) => <span key={item}><i style={{ background: zoneColor(item) }} />{item}</span>)}</div></div>
    <div className="atlas-map-card"><div className="atlas-map-heading"><span><Map size={14} /> CAPITAL LOCATOR</span><small>SCHEMATIC · NOT STATE BOUNDARIES</small></div><svg viewBox="40 28 380 286" className="nigeria-map-svg" role="img" aria-label="Schematic locator of Nigeria's state capitals"><path className="nigeria-outline" d="M83 54 L123 42 L147 53 L168 44 L195 48 L216 41 L241 53 L265 50 L287 60 L318 56 L338 65 L354 71 L379 84 L388 103 L381 122 L396 138 L390 157 L402 176 L389 195 L383 214 L370 227 L364 248 L346 261 L338 280 L319 291 L300 304 L280 301 L265 290 L245 285 L228 273 L211 268 L198 251 L179 246 L165 228 L145 220 L129 213 L112 214 L102 198 L91 187 L88 170 L77 159 L84 140 L74 128 L81 111 L72 96 L82 81 Z" /><path className="map-river" d="M204 143 C216 157 221 175 213 191 C208 204 214 220 229 235 C240 246 254 257 274 269" /><path className="map-route" d="M104 226 C141 209 159 179 181 152 C205 126 232 121 267 132 C295 142 319 153 341 184 C331 220 304 251 273 278" />
      {STATES.map((item) => { const [x, y] = MAP_POINTS[item.name] || [220, 170]; const active = item.name === selected; return <g key={item.name} className={`capital-marker ${active ? 'active' : ''}`} transform={`translate(${x} ${y})`} onClick={() => onTravel(item.name)} role="button" tabIndex="0" aria-label={`Travel to ${item.capital}, ${item.name}`}><circle className="capital-ping" r={active ? 8 : 5.4} fill={zoneColor(item.zone)} />{active && <circle className="capital-halo" r="14" />}<title>{item.capital} · {item.name}</title></g>; })}
      <text className="map-zone-label" x="116" y="103">NORTH WEST</text><text className="map-zone-label" x="300" y="99">NORTH EAST</text><text className="map-zone-label" x="186" y="172">NORTH CENTRAL</text><text className="map-zone-label" x="101" y="248">SOUTH WEST</text><text className="map-zone-label" x="260" y="244">SOUTH EAST</text><text className="map-zone-label" x="279" y="291">SOUTH SOUTH</text></svg><div className="atlas-map-foot"><span><i className="map-key-dot" /> CAPITAL</span><span>CLICK A MARKER TO TRAVEL</span></div></div></div>
    <div className="atlas-list-heading"><div><div className="eyebrow"><span className="eyebrow-line" />STATE DIRECTORY</div><h2>Choose a capital</h2></div><label className="atlas-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search state or capital" /><kbd>⌕</kbd></label></div>
    <div className="atlas-zone-tabs">{zones.map((item) => <button key={item} onClick={() => setZone(item)} className={zone === item ? 'active' : ''}>{item === 'All' ? 'ALL ZONES' : item.toUpperCase()}</button>)}<span>{filteredStates.length} DESTINATIONS</span></div>
    <div className="state-tile-grid">{filteredStates.map((item) => <button className={`state-tile ${selected === item.name ? 'selected' : ''}`} key={item.name} onClick={() => onTravel(item.name)} style={{ '--zone-color': zoneColor(item.zone) }}><span className="state-index">{String(STATES.indexOf(item) + 1).padStart(2, '0')}</span><span className="state-zone-dot" /><span className="state-name">{item.name}</span><span className="state-capital">{item.capital.toUpperCase()}</span><span className="state-landmark">{item.landmark}</span><ArrowRight className="state-arrow" size={13} /></button>)}</div><div className="atlas-footer-note"><MapPin size={14} /><span>Capital names and zones are factual reference data; the 3D routes and street layouts are fictional, procedural art—not exact state maps.</span></div></div>;
}

function ChatPanel({ messages, draft, setDraft, onSend, onlineCount, status, stateName, people = [], meetings = [], activeMeeting, dmMessages = [], dmDraft, setDmDraft, selectedDmPeer, onSelectDmPeer, onSendDm, onJoinMeeting, onInvite }) {
  const [tab, setTab] = useState('world');
  const peerMessages = selectedDmPeer ? dmMessages.filter((item) => item.peerId === selectedDmPeer.id || (selectedDmPeer.accountId && item.peerAccountId === selectedDmPeer.accountId)) : [];
  return <div className="chat-panel social-panel">
    <div className="chat-head"><div><span className="chat-head-icon"><MessageCircle size={14} /></span><div><strong>Civic connections</strong><small>{status === 'online' ? `${onlineCount || 1} IN THIS INSTANCE` : 'LOCAL PREVIEW'}</small></div></div><span className={`chat-online-dot ${status}`} /></div>
    <div className="social-tabs"><button className={tab === 'world' ? 'active' : ''} onClick={() => setTab('world')}>WORLD</button><button className={tab === 'dms' ? 'active' : ''} onClick={() => setTab('dms')}>DMS <i>{dmMessages.length || ''}</i></button><button className={tab === 'meetings' ? 'active' : ''} onClick={() => setTab('meetings')}>MEETINGS <i>{meetings.length || ''}</i></button></div>
    {tab === 'world' && <><div className="chat-messages">{messages.slice(0, 4).map((item) => <div key={item.id} className={`chat-message ${item.system ? 'system' : ''} ${item.local ? 'mine' : ''}`}><div className="chat-message-meta"><b>{item.system ? 'WORLD DESK' : item.name}</b><span>{item.state || stateName}</span></div><p>{item.message}</p></div>)}</div><form className="chat-compose" onSubmit={onSend}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={180} placeholder="Message this world…" aria-label="World chat message" /><button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={14} /></button></form><div className="chat-safety">Keep it kind; do not post private data or real-world vote requests.</div></>}
    {tab === 'dms' && <div className="social-tab-content"><div className="social-subhead"><span>ONLINE IN YOUR WORLD</span><span>{people.length} PLAYER{people.length === 1 ? '' : 'S'}</span></div>{selectedDmPeer && <div className="dm-selected-peer"><button className="dm-back" onClick={() => onSelectDmPeer(null)}>‹ PLAYERS</button><strong>{selectedDmPeer.name}</strong><small>{selectedDmPeer.ward || selectedDmPeer.state || 'Nigeria'} · {selectedDmPeer.accountBacked ? 'ACCOUNT' : 'GUEST'}</small>{activeMeeting?.status === 'open' && <button className="dm-invite-button" onClick={() => onInvite(selectedDmPeer)}>INVITE TO MEETING <ArrowRight size={11} /></button>}</div>}
      {!selectedDmPeer && <div className="social-player-list">{people.length ? people.slice(0, 8).map((person) => <div className="social-player" key={person.id}><span className="player-presence" /><div><strong>{person.name}</strong><small>{person.ward || person.state || 'In the world'}</small></div><button onClick={() => onSelectDmPeer(person)}>MESSAGE</button></div>) : <div className="social-empty">No other players are in this locality yet. Open a second game session to test DMs and meeting invitations.</div>}</div>}
      {selectedDmPeer && <><div className="dm-thread">{peerMessages.length ? peerMessages.slice(-5).map((item) => <div key={item.id} className={`dm-bubble ${item.incoming ? 'incoming' : 'outgoing'}`}><small>{item.fromName || (item.incoming ? selectedDmPeer.name : 'YOU')}</small><p>{item.body}</p></div>) : <div className="social-empty">Start a direct conversation. Only the two players in this thread can see it.</div>}</div><form className="chat-compose" onSubmit={onSendDm}><input value={dmDraft} onChange={(event) => setDmDraft(event.target.value)} maxLength={300} placeholder="Write a private message…" aria-label="Direct message" /><button type="submit" disabled={!dmDraft.trim()} aria-label="Send direct message"><Send size={14} /></button></form><div className="chat-safety">{selectedDmPeer.accountBacked ? 'Cloud history saves when both people have signed in.' : 'Guest messages last only while this server session is running.'}</div></>}
    </div>}
    {tab === 'meetings' && <div className="social-tab-content"><div className="social-subhead"><span>OPEN PUBLIC MEETINGS</span><span>{meetings.length}</span></div>{activeMeeting?.status === 'open' && <div className="active-meeting-mini"><div><strong>{activeMeeting.title}</strong><small>{activeMeeting.participants || 1} attending · {activeMeeting.location?.state || stateName}</small></div><span>ROOM OPEN</span></div>}{meetings.length ? <div className="social-meeting-list">{meetings.slice(0, 5).map((meeting) => <div className="social-meeting" key={meeting.id}><span className="meeting-live-dot" /><div><strong>{meeting.title}</strong><small>{meeting.location?.venueName || 'Public venue'} · {meeting.location?.state || 'Nigeria'} · {meeting.participants || 0} here</small></div><button onClick={() => onJoinMeeting(meeting)}>JOIN</button></div>)}</div> : !activeMeeting && <div className="social-empty">No open meetings. Start a Town Hall from Campaign actions; its venue and topic will be shared with the world.</div>}<div className="chat-safety">{status === 'online' ? 'Public meeting messages and votes shape the closing record.' : 'Offline meetings are local to this browser session.'}</div></div>}
  </div>;
}

function AccountForm({ authEnabled, persistenceEnabled, authBusy, authSession, alias, onAuth, onSignOut, onSuccess }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setFeedback('');
    const result = await onAuth(mode, email, password, alias);
    if (!result?.ok) { setFeedback(result?.error || 'Account access failed.'); return; }
    setPassword('');
    onSuccess?.(result);
  };
  if (!authEnabled) return <div className="account-setup-note"><LockKeyhole size={16} /><div><strong>ACCOUNT SERVICE NOT CONFIGURED</strong><p>Real sign-up, cloud profile saves and persistent messages need the Supabase settings and database schema documented in ACCOUNT_SETUP.md. Guest play remains available; its save is local to this browser.</p></div></div>;
  if (authSession?.access_token) return <div className="account-connected"><span className="account-connected-icon"><Check size={16} /></span><div><strong>ACCOUNT CONNECTED</strong><span>{authSession.user?.email || 'Signed-in player'}</span><small>{persistenceEnabled ? 'Cloud profile, meetings and messages enabled' : 'Auth enabled · database persistence key still required'}</small></div><button className="secondary-button" onClick={onSignOut}>SIGN OUT</button></div>;
  return <form className="account-access-form" onSubmit={submit}>
    <div className="account-mode-switch"><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setFeedback(''); }}>CREATE ACCOUNT</button><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setFeedback(''); }}>SIGN IN</button></div>
    <label className="form-label">EMAIL ADDRESS<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="you@example.com" /></label>
    <label className="form-label">PASSWORD <span>10+ CHARACTERS</span><input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} maxLength={128} placeholder="Use a unique password" /></label>
    {feedback && <div className="account-feedback" role="status">{feedback}</div>}
    <button className="account-submit" type="submit" disabled={authBusy}>{authBusy ? 'CONTACTING ACCOUNT SERVICE…' : mode === 'signup' ? 'CREATE SECURE ACCOUNT' : 'SIGN IN & LOAD CAREER'} <ArrowRight size={13} /></button>
    <small className="account-security-note">Passwords are handled by Supabase Auth; this game server does not store them.</small>
  </form>;
}

function AccountModal({ authEnabled, persistenceEnabled, authBusy, authSession, onAuth, onSignOut, onClose, onSuccess }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="account-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><LockKeyhole size={19} /></span><span className="modal-eyebrow">PLAYER ACCOUNT · PRIVATE PROFILE</span></div><h2>Keep your public life.</h2><p>Sign in to link this candidate to an account. The party, cash and story are fictional game data.</p><AccountForm authEnabled={authEnabled} persistenceEnabled={persistenceEnabled} authBusy={authBusy} authSession={authSession} onAuth={onAuth} onSignOut={onSignOut} onSuccess={onSuccess} /><div className="account-modal-foot"><button className="secondary-button" onClick={onClose}>CLOSE</button><span>{persistenceEnabled ? 'ACCOUNT-BACKED' : 'LOCAL / SESSION-ONLY'}</span></div></div></div>;
}

function WelcomeModal({ alias, setAlias, party, setParty, state, setState, onStart, onClose, hasSave, authEnabled, persistenceEnabled, authBusy, authSession, onAuth, onAuthSuccess, onSignOut }) {
  return <div className="modal-backdrop welcome-backdrop"><div className="welcome-modal modal-card"><div className="welcome-visual"><div className="welcome-orbit orbit-a" /><div className="welcome-orbit orbit-b" /><div className="welcome-silhouette"><div className="silhouette-stars">✦ &nbsp; ✦ &nbsp; ✦</div><div className="silhouette-sun" /><div className="silhouette-skyline"><i /><i /><i /><i /><i /></div><div className="silhouette-road" /><div className="silhouette-figure"><span /><i /></div></div><div className="welcome-visual-caption"><span>THE JOURNEY STARTS HERE</span><b>ONE POLITICAL LADDER. A WIDER REPUBLIC.</b></div></div><div className="welcome-content"><button className="modal-close" onClick={onClose} aria-label="Close onboarding"><X size={18} /></button><div className="welcome-mark"><span className="brand-mark"><span /><i /></span><small>CAMPAIGN PROTOCOL · 2027</small></div><div className="welcome-kicker"><Sparkles size={13} /> YOUR POLITICAL LIFE BEGINS</div><h2>Make a name<br /><em>worth remembering.</em></h2><p>Follow one political ladder from youth and community organising to the presidency. Courts, election administrators and the Central Bank form the other side of the story—not alternate political ladders.</p>
    <label className="form-label">YOUR CANDIDATE NAME <span>OPTIONAL</span><input autoFocus maxLength={26} value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="e.g. Ayo Ajala" /></label><label className="form-label">STARTING STATE <span>37 CAPITAL STOPS</span><div className="select-wrap"><select value={state} onChange={(event) => setState(event.target.value)}>{STATES.map((item) => <option key={item.name} value={item.name}>{item.name} — {item.capital}</option>)}</select><ChevronDown size={15} /></div></label>
    <div className="party-pick-label">CHOOSE YOUR FICTIONAL PARTY</div><div className="party-picks">{PARTY_OPTIONS.map((item) => <button type="button" key={item.name} className={`party-pick ${party === item.name ? 'selected' : ''}`} onClick={() => setParty(item.name)} style={{ '--party-color': item.color }}><span className="party-radio">{party === item.name && <i />}</span><span><b>{item.tag}</b><small>{item.name}</small></span><span className="party-color-mark" /></button>)}</div>
    <div className="starter-bonus"><span className="bonus-icon"><Banknote size={17} /></span><div><small>NEW CANDIDATE SEED FUND</small><strong>₦1,000,000 <i>IN-GAME</i></strong></div><BadgeCheck size={16} /></div><div className="starter-disclaimer"><LockKeyhole size={12} />Fictional, non-transferable game funds; no real-money payments.</div>
    <AccountForm authEnabled={authEnabled} persistenceEnabled={persistenceEnabled} authBusy={authBusy} authSession={authSession} alias={alias} onAuth={onAuth} onSignOut={onSignOut} onSuccess={onAuthSuccess} />
    <button className="welcome-cta" onClick={onStart}>{authSession ? 'CONTINUE WITH ACCOUNT' : hasSave ? 'START A NEW GUEST CANDIDATE' : 'CONTINUE AS GUEST'} <ArrowRight size={16} /></button><div className="welcome-bottom"><span><Shield size={12} /> ORIGINAL FICTIONAL GAME WORLD</span><span>PRE-ALPHA</span></div></div></div></div>;
}

function StoryActionModal({ actionId, scene, npc, onComplete, onClose }) {
  const [draft, setDraft] = useState('');
  const [choiceId, setChoiceId] = useState(scene?.choices?.[0]?.id || '');
  if (!scene) return null;
  const action = ACTIONS.find((item) => item.id === actionId) || { label: 'Senior consultation', cost: 25_000 };
  const selected = scene.choices.find((item) => item.id === choiceId);
  const submit = (event) => {
    event.preventDefault();
    if (draft.trim().length < 6) return;
    onComplete(actionId, draft.trim(), choiceId);
  };
  return <div className="modal-backdrop story-action-backdrop" onMouseDown={onClose}><form className="story-action-modal modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><MessageCircle size={19} /></span><span className="modal-eyebrow">{scene.format} · STORY INTERACTION</span></div><h2>{scene.title}</h2>{npc && <p className="story-npc-line">{npc.name} <span>· {npc.title}</span></p>}<p>{npc ? `“${npc.ask}”` : scene.prompt}</p><label className="story-write-label">YOUR RESPONSE <span>TYPE BEFORE YOU CHOOSE</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={320} minLength={6} required placeholder={npc ? 'What will you say, and what public follow-up will you make?' : 'Write the opening line or public response…'} /></label><div className="story-choice-list">{scene.choices.map((choice) => <label key={choice.id} className={`story-choice ${choiceId === choice.id ? 'selected' : ''}`}><input type="radio" name="story-choice" value={choice.id} checked={choiceId === choice.id} onChange={() => setChoiceId(choice.id)} /><span><strong>{choice.label}</strong><small>{choice.outcome}</small></span></label>)}</div>{selected && <div className="story-action-cost"><span>{selected.effects.integrity >= 3 ? 'PUBLIC-RECORD CHOICE' : 'STORY CONSEQUENCE'}</span><b>{action.cost ? `₦${money(action.cost)} IN-GAME` : 'NO REAL-MONEY COST'}</b></div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>LEAVE SCENE</button><button className="primary-action" type="submit" disabled={draft.trim().length < 6}>RECORD MY RESPONSE <ArrowRight size={14} /></button></div></form></div>;
}

function InstitutionStoryModal({ arc, completed, onComplete, onClose }) {
  const [draft, setDraft] = useState('');
  const [choiceId, setChoiceId] = useState(arc?.choices?.[0]?.id || '');
  if (!arc) return null;
  const selected = arc.choices.find((item) => item.id === choiceId);
  const submit = (event) => {
    event.preventDefault();
    if (draft.trim().length < 6) return;
    onComplete(arc.id, draft.trim(), choiceId);
  };
  return <div className="modal-backdrop story-action-backdrop" onMouseDown={onClose}><form className="institution-modal modal-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon legal"><Scale size={19} /></span><span className="modal-eyebrow">OTHER SIDE OF THE STORY · {arc.shortLabel}</span></div><h2>{arc.episodeTitle}</h2><div className="institution-lead">{arc.lead}</div><p>{arc.scenario}</p><div className="institution-pathway"><small>REAL-WORLD ROLE ROUTE · DISTINCT FROM YOUR POLITICAL LADDER</small><strong>{arc.rolePath}</strong><span>{arc.pathwayNote}</span></div><a className="institution-source-link" href={arc.sourceUrl} target="_blank" rel="noreferrer"><BookOpen size={12} />{arc.source} <ArrowRight size={11} /></a><small className="institution-source-caveat">Fictional civic education—not legal advice. Check current law and later amendments for real decisions.</small><label className="story-write-label">YOUR RESPONSE <span>TYPE A PUBLIC, CHECKABLE REPLY</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={320} minLength={6} required placeholder={arc.prompt} /></label><div className="story-choice-list">{arc.choices.map((choice) => <label key={choice.id} className={`story-choice ${choiceId === choice.id ? 'selected' : ''}`}><input type="radio" name={`side-${arc.id}`} value={choice.id} checked={choiceId === choice.id} onChange={() => setChoiceId(choice.id)} /><span><strong>{choice.label}</strong><small>{choice.outcome}</small></span></label>)}</div>{selected && <div className="dialog-note"><Shield size={14} /><span>{completed ? 'You have already recorded this side story; revisiting it will not repeat the career-health reward.' : 'This side story informs your political record but does not make you a judge, election official, or CBN office-holder.'}</span></div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>RETURN TO THE LADDER</button><button className="primary-action" type="submit" disabled={draft.trim().length < 6}>RECORD SIDE STORY <ArrowRight size={14} /></button></div></form></div>;
}

function MeetingRoom({ meeting, messages, participants, votes, draft, setDraft, replyTo, setReplyTo, onSend, onVote, onCloseMeeting, onLeave, people, onInvite }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages.length]);
  const support = Number(votes.support) || 0;
  const mixed = Number(votes.mixed) || 0;
  const concern = Number(votes.concern) || 0;
  const location = meeting.location || {};
  return <div className="meeting-backdrop"><section className="meeting-room" aria-label="Public meeting room"><header className="meeting-room-head"><div className="meeting-room-mark"><MessageCircle size={18} /></div><div className="meeting-room-title"><span>{meeting.status === 'open' ? 'LIVE PUBLIC MEETING' : 'MEETING RECORD PUBLISHED'} <i className={meeting.local ? 'local' : ''}>{meeting.local ? 'LOCAL' : 'OPEN'}</i></span><h2>{meeting.title}</h2><small>{location.venueName || 'Civic venue'} · {location.ward ? `${location.ward}, ` : ''}{location.lga ? `${location.lga}, ` : ''}{location.state || 'Nigeria'}</small></div><button className="meeting-room-close" onClick={onLeave} aria-label="Close meeting room"><X size={18} /></button></header>
    <div className="meeting-topic"><span>MEETING QUESTION</span><p>{meeting.topic}</p><small>Type a short speech, reply to another player, then vote. Responses and votes shape the host’s closing record. {meeting.local ? 'Local-only session.' : meeting.cloudBacked ? 'Meeting record is cloud-backed; individual messages persist for signed-in speakers.' : 'Guest-hosted meeting is session-only.'}</small></div>
    <div className="meeting-room-layout"><div className="meeting-discussion"><div className="meeting-messages">{messages.length ? messages.map((item) => { const parent = item.replyTo ? messages.find((message) => message.id === item.replyTo) : null; return <article className={`meeting-message ${item.kind || 'speech'}`} key={item.id}><div className="meeting-message-head"><strong>{item.senderName || item.name || 'Player'}</strong><span>{item.kind === 'reply' ? 'REPLY' : item.kind === 'summary' ? 'HOST SUMMARY' : 'SPEECH'}</span></div>{parent && <div className="meeting-reply-reference">↳ replying to {parent.senderName}</div>}<p>{item.body || item.message}</p>{meeting.status === 'open' && item.kind !== 'summary' && <button className="meeting-reply-button" onClick={() => setReplyTo(item)}>REPLY</button>}</article>; }) : <div className="meeting-empty"><Users size={22} /><strong>THE FLOOR IS OPEN</strong><span>Deliver the first typed opening. Other players can join this meeting, speak, reply, and vote.</span></div>}<div ref={endRef} /></div>
      {replyTo && meeting.status === 'open' && <div className="meeting-replying">Replying to <b>{replyTo.senderName}</b><span>{replyTo.body}</span><button onClick={() => setReplyTo(null)}>CANCEL</button></div>}
      {meeting.status === 'open' && <form className="meeting-compose" onSubmit={onSend}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} minLength={2} placeholder={replyTo ? 'Write a respectful reply…' : 'Deliver your typed speech or opening statement…'} /><div><small>{draft.length}/500 · no private contact details</small><button className="primary-action" type="submit" disabled={draft.trim().length < 2}>{replyTo ? 'SEND REPLY' : 'TAKE THE FLOOR'} <Send size={13} /></button></div></form>}
      </div><aside className="meeting-aside"><div className="meeting-attendees"><div className="meeting-aside-title"><span>IN THE ROOM</span><b>{participants.length || meeting.participants || 1}</b></div>{participants.slice(0, 6).map((participant) => <div className="meeting-attendee" key={participant.id}><span>{initials(participant.name)}</span><div><strong>{participant.name}</strong><small>{participant.id === participant.userId ? 'ACCOUNT PLAYER' : participant.state || 'CONNECTED'}</small></div></div>)}{!participants.length && <div className="meeting-attendee"><span>{initials(meeting.hostName)}</span><div><strong>{meeting.hostName}</strong><small>HOST</small></div></div>}</div>
      <div className="meeting-vote-card"><div className="meeting-aside-title"><span>MEETING PULSE</span><b>{support + mixed + concern} VOTES</b></div><div className="meeting-vote-bars"><div><span>SUPPORT</span><b>{support}</b><i style={{ width: `${Math.min(100, support * 20)}%` }} /></div><div><span>MIXED</span><b>{mixed}</b><i style={{ width: `${Math.min(100, mixed * 20)}%` }} /></div><div><span>CONCERN</span><b>{concern}</b><i style={{ width: `${Math.min(100, concern * 20)}%` }} /></div></div>{meeting.status === 'open' && <div className="meeting-vote-buttons"><button onClick={() => onVote('support')}>SUPPORT</button><button onClick={() => onVote('mixed')}>MIXED</button><button onClick={() => onVote('concern')}>CONCERN</button></div>}</div>
      {meeting.status === 'open' && people.length > 0 && <div className="meeting-invite-card"><div className="meeting-aside-title"><span>INVITE PLAYERS</span><b>{people.length} ONLINE</b></div>{people.slice(0, 3).map((person) => <button className="meeting-invite-row" key={person.id} onClick={() => onInvite(person)}><span>{person.name}</span><b>INVITE</b></button>)}</div>}
      {meeting.status === 'open' && meeting.isHost ? <button className="meeting-publish-button" onClick={onCloseMeeting}><Check size={14} />PUBLISH OUTCOME & CLOSE</button> : meeting.status === 'open' ? <div className="meeting-host-note">Only the host publishes the meeting outcome.</div> : <div className="meeting-outcome-card"><span>RECORDED OUTCOME</span><strong>{meeting.outcome?.outcome === 'supported' ? 'SUPPORTED' : meeting.outcome?.outcome === 'rework' ? 'REWORK REQUESTED' : 'CONTESTED'}</strong><small>{meeting.outcome?.summary || 'The meeting result is now part of the public story.'}</small></div>}
      {meeting.local && <div className="meeting-host-note">Guest/local preview: this room is not shared or saved to an account.</div>}</aside></div>
    <footer className="meeting-room-footer"><span><Shield size={12} />Fictional civic role-play · respectful speech only</span><button onClick={onLeave}>{meeting.status === 'open' ? 'LEAVE MEETING' : 'CLOSE RECORD'}</button></footer></section></div>;
}

function GameModal({ modal, onClose, onAcceptMeetingInvite, onIllegalConfirm, onPrepareEvidence, onFilePetition, onReset, profile }) {
  if (!modal) return null;
  const close = () => onClose();
  if (modal.type === 'meeting-invite') {
    const invite = modal.invite || {};
    const meeting = invite.meeting || {};
    return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal meeting-invite-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><MessageCircle size={19} /></span><span className="modal-eyebrow">MEETING INVITATION · {invite.fromName || 'A player'}</span></div><h2>{meeting.title || 'Join a public meeting?'}</h2><p>{meeting.topic || 'A player invited you into a civic story meeting.'}</p><div className="dialog-note"><MapPin size={14} /><span>{meeting.location?.venueName || 'Public venue'} · {meeting.location?.state || invite.state || 'Nigeria'} · {meeting.participants || 1} attending</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>NOT NOW</button><button className="primary-action" onClick={onAcceptMeetingInvite}>TRAVEL TO MEETING <ArrowRight size={14} /></button></div></div></div>;
  }
  if (modal.type === 'illegal-confirm') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal danger-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon danger"><ShieldAlert size={20} /></span><span className="modal-eyebrow">HIGH-RISK EVENT · FICTIONAL MECHANIC</span></div><h2>Attempt illicit inducement?</h2><p>This abstract choice spends <strong>₦250,000</strong> and may give a short-term influence bump. It sharply damages trust and integrity, adds an investigation flag, and can undermine later legal challenges.</p><div className="danger-list"><span><Check size={12} />No tactics, scripts, or real-world voter targeting are shown.</span><span><Check size={12} />Bribery is addressed in the Electoral Act; this is a critical simulation.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>KEEP IT CLEAN</button><button className="danger-button" onClick={onIllegalConfirm}>TAKE THE RISK <ArrowRight size={14} /></button></div></div></div>;
  if (modal.type === 'legal') {
    const contest = profile.lastContest;
    const eligible = contest && contest.eligibleForPetition && !contest.won && !contest.petitioned;
    return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal legal-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon legal"><Scale size={20} /></span><span className="modal-eyebrow">EVIDENCE & DUE PROCESS</span></div><h2>Election petition desk</h2>{eligible ? <><p>Your last result was in <strong>{contest.chapterTitle}</strong>. You may prepare an evidence file and, if standing and statutory timelines allow in this fictional scenario, file a petition.</p><div className="legal-case-box"><div><small>OPEN CASE</small><strong>{contest.office}</strong></div><span className="case-result">LOSS · SIMULATED</span></div><div className="evidence-meter"><span>CASE FILES</span><b>{profile.evidence} READY</b><div className="evidence-track"><i style={{ width: `${Math.min(100, profile.evidence * 35)}%` }} /></div></div><div className="dialog-note"><InfoDot /><span>A petition can fail. Courts are not a shortcut to office; remedies follow evidence and due process.</span></div><div className="modal-actions"><button className="secondary-button" onClick={onPrepareEvidence} disabled={profile.cash < 65_000}>REVIEW EVIDENCE · ₦65K</button><button className="primary-action" onClick={onFilePetition} disabled={profile.evidence < 1 || profile.cash < 180_000 || contest.petitioned}>FILE PETITION · ₦180K <ArrowRight size={14} /></button></div></> : <><p>No unresolved lost contest is currently available. You can still learn how the process works, but real petitions require a lawful basis, standing, evidence, and strict time limits.</p><div className="legal-empty-state"><Scale size={22} /><strong>NO ACTIVE CASE</strong><span>{profile.evidence} evidence review{profile.evidence === 1 ? '' : 's'} in your local file</span></div><div className="dialog-note"><InfoDot /><span>Fictional case mechanics are simplified. Consult a qualified Nigerian lawyer for real legal matters.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>CLOSE DESK</button><button className="primary-action" onClick={onPrepareEvidence} disabled={profile.cash < 65_000}>PREPARE A PRACTICE FILE · ₦65K <ArrowRight size={14} /></button></div></>}</div></div>;
  }
  if (modal.type === 'result') {
    const result = modal.contest;
    return <div className="modal-backdrop" onMouseDown={close}><div className={`result-modal modal-card ${result.won ? 'won' : 'lost'}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="result-emblem">{result.won ? <Crown size={27} /> : <Activity size={27} />}</div><div className="modal-eyebrow">{result.typeLabel || (result.won ? 'SIMULATED MILESTONE' : 'THE RESULT IS IN')}</div><h2>{result.appointment ? (result.won ? 'The review advances the story.' : 'The review does not advance.') : result.won ? 'The next door opens.' : 'A hard result. A new choice.'}</h2><p>{result.appointment ? (result.won ? `The fictional appointment review score was ${result.support}, above the scenario threshold of ${result.opponent}. This is not an actual nomination or appointment.` : `The fictional review score was ${result.support}, below the scenario threshold of ${result.opponent}. The public career remains a political story; real appointments follow separate lawful processes.`) : result.won ? `Your ${result.office.toLowerCase()} stage advanced in the simulation, ${result.support} to ${result.opponent}. This is a fictional result—not a real poll or prediction.` : `Your campaign scored ${result.support}; the rival score was ${result.opponent}. Rebuild support or accept the result. A petition is only relevant to a genuine public-election dispute.`}</p><div className="result-scoreboard"><div><small>{result.supportLabel || 'YOUR SIMULATED SUPPORT'}</small><strong>{result.support}<i>{result.appointment ? 'pts' : 'pts'}</i></strong></div><span>VS</span><div><small>{result.opponentLabel || 'RIVAL CAMPAIGN'}</small><strong>{result.opponent}<i>{result.appointment ? 'pts' : 'pts'}</i></strong></div></div>{result.won && modal.nextChapter && <div className="unlock-box"><span><Check size={13} /></span><div><small>NEXT POLITICAL STAGE</small><strong>{modal.nextChapter.title} · {modal.nextChapter.office}</strong></div></div>}{!result.won && result.eligibleForPetition && <div className="dialog-note"><Scale size={14} /><span>Only consider litigation where there is a genuine dispute, evidence, standing and a lawful basis. A petition is not guaranteed.</span></div>}<button className="primary-action result-continue" onClick={close}>{result.won ? 'CONTINUE THE POLITICAL STORY' : 'RETURN TO CAMPAIGN'} <ArrowRight size={14} /></button></div></div>;
  }
  if (modal.type === 'petition-result') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon legal"><Scale size={20} /></span><span className="modal-eyebrow">FICTIONAL COURT OUTCOME</span></div><h2>{modal.succeeds ? 'A limited remedy is granted.' : 'The petition is dismissed.'}</h2><p>{modal.succeeds ? 'The court orders a lawful remedial process in the simulation. This does not automatically make you the office-holder; you must still follow the remedy.' : 'The evidence did not meet the simulated standard. The original result stands in this scenario.'}</p><div className="dialog-note"><Scale size={14} /><span>The game abstracts complex legal processes and is not legal advice.</span></div><div className="modal-actions"><button className="primary-action" onClick={close}>BACK TO THE CAMPAIGN <ArrowRight size={14} /></button></div></div></div>;
  if (modal.type === 'ending') return <div className="modal-backdrop ending-backdrop"><div className="ending-modal modal-card"><button className="modal-close" onClick={close}><X size={18} /></button><div className="ending-glow" /><div className="ending-kicker"><Crown size={14} /> THE REPUBLIC IS YOURS TO SERVE</div><h2>A mandate is<br /><em>only the beginning.</em></h2><p>You completed a fictional political-career arc and won the simulated national contest, {modal.contest.support} to {modal.contest.opponent}. The game ends with a choice: publish a transition plan, keep a promise to dissenters, and make your first 100 days accountable.</p><div className="ending-pill-row"><span><Check size={12} />12 CHAPTERS</span><span><Check size={12} />{profile.wins} SIMULATED WINS</span><span><Shield size={12} />{profile.integrity}% INTEGRITY</span></div><button className="primary-action" onClick={close}>OPEN THE TRANSITION JOURNAL <ArrowRight size={14} /></button><button className="secondary-button ending-restart" onClick={onReset}>START A NEW CANDIDATE</button></div></div>;
  if (modal.type === 'reset') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><Sparkles size={20} /></span><span className="modal-eyebrow">LOCAL SAVE</span></div><h2>Start a new candidate?</h2><p>Your current political story and in-game purse will be replaced. If you are signed in with cloud persistence enabled, the new run will become the saved profile. You can begin again with a fresh fictional candidate and the ₦1,000,000 game seed fund.</p><div className="modal-actions"><button className="secondary-button" onClick={close}>KEEP THIS RUN</button><button className="primary-action" onClick={onReset}>CREATE NEW RUN <ArrowRight size={14} /></button></div></div></div>;
  return null;
}

export default App;
