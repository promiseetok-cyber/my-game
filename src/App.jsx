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
  CHAPTERS, MAP_POINTS, NPCS, OFFICE_CATALOG, PARTY_OPTIONS, RESEARCH_NOTES,
  STATES, WORLD_VENUES,
} from './data.js';

const SAVE_KEY = 'nigeria-2027-life-sim-v1';
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
  lastContest: null, legalBoost: false, completed: false,
};

function loadSave() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch { return null; }
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
  const [stageIndex, setStageIndex] = useState(Number.isInteger(boot?.stageIndex) ? clamp(boot.stageIndex, 0, CHAPTERS.length - 1) : 0);
  const [missionProgress, setMissionProgress] = useState(Number.isFinite(boot?.missionProgress) ? clamp(boot.missionProgress, 0, 3) : 0);
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
  const [consultIndex, setConsultIndex] = useState(0);
  const [atlasQuery, setAtlasQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');
  const socketRef = useRef(null);
  const worldConfigRef = useRef(null);

  const currentChapter = CHAPTERS[Math.min(stageIndex, CHAPTERS.length - 1)];
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
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify({ profile, stageIndex, missionProgress, storyDay, state: selectedStateName })); }
    catch { /* Local save is optional in private browsing. */ }
  }, [profile, stageIndex, missionProgress, storyDay, selectedStateName]);

  useEffect(() => {
    const socket = socketClient({ path: '/socket.io', transports: ['websocket', 'polling'], timeout: 7000, reconnectionAttempts: 6, reconnectionDelay: 1400 });
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
    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
  }, []);

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

  const startCandidate = () => {
    const party = PARTY_OPTIONS.find((item) => item.name === draftParty) || PARTY_OPTIONS[0];
    const alias = draftAlias.trim().slice(0, 26) || 'New Candidate';
    setProfile({ ...defaultProfile, started: true, alias, party: party.name, partyTag: party.tag, color: party.color, cash: 1_000_000 });
    setStageIndex(0); setMissionProgress(0); setStoryDay(1); setSelectedStateName(draftState); setActiveVenueId('square'); setOnboardingOpen(false);
    setFeed([{ id: `${Date.now()}-welcome`, title: 'Candidate account created', text: `₦1,000,000 in-game seed fund added to ${alias}’s local demo profile.`, type: 'start', time: 'DAY 01' }]);
    setToast('Campaign launched · ₦1,000,000 added to your demo purse');
  };

  const createNewCandidate = () => { setDraftAlias(''); setDraftParty(PARTY_OPTIONS[0].name); setDraftState(selectedStateName); setOnboardingOpen(true); };

  const performAction = (actionId) => {
    const action = ACTIONS.find((item) => item.id === actionId);
    if (!action) return;
    if (profile.cash < action.cost) { showToast(`Not enough campaign funds for ${action.label.toLowerCase()}.`); return; }
    if (profile.energy < action.energy) { showToast('Your candidate is exhausted. Take a breather first.'); return; }
    const effects = {
      listen: { trust: 6, influence: 1, integrity: 1, coalition: 1, text: 'Residents shared competing priorities. You recorded them before making promises.' },
      service: { trust: 8, influence: 1, integrity: 2, coalition: 1, text: 'A small, public-interest service project strengthened local confidence.' },
      coalition: { trust: 2, influence: 7, integrity: 1, coalition: 1, text: 'A transparent coalition meeting widened support without promising private favours.' },
      policy: { trust: 6, influence: 2, integrity: 2, coalition: 0, text: 'A practical policy brief turned a campaign line into something residents can scrutinise.' },
      rally: { trust: 2, influence: 8, integrity: 0, coalition: 1, text: 'A public rally reached more residents. Your platform—not a threat or inducement—was on the stage.' },
    }[actionId];
    setProfile((current) => ({
      ...current, cash: current.cash - action.cost,
      trust: clamp(current.trust + effects.trust), influence: clamp(current.influence + effects.influence),
      integrity: clamp(current.integrity + effects.integrity), coalition: clamp(current.coalition + effects.coalition, 0, 12),
      energy: clamp(current.energy - action.energy),
    }));
    increaseProgress(); setStoryDay((day) => day + 1); addFeed(action.label, effects.text, actionId); showToast(`${action.label} complete · mandate progress +1`);
  };

  const openConsultation = () => setModal({ type: 'consult', npc: NPCS[consultIndex % NPCS.length] });
  const acceptConsultation = () => {
    if (profile.cash < 25_000) { showToast('You need ₦25,000 for transport and a public roundtable note.'); setModal(null); return; }
    const npc = modal?.npc || NPCS[0];
    setProfile((current) => ({ ...current, cash: current.cash - 25_000, trust: clamp(current.trust + 4), influence: clamp(current.influence + 4), integrity: clamp(current.integrity + 2), coalition: clamp(current.coalition + 1, 0, 12), energy: clamp(current.energy - 5) }));
    increaseProgress(); setStoryDay((day) => day + 1); setConsultIndex((value) => value + 1);
    addFeed('Public consultation', `${npc.name} asked for a written, checkable commitment. You agreed to publish the follow-up.`, 'consult');
    setModal(null); showToast('Commitment logged · coalition and trust strengthened');
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
    if (missionProgress < 3) { showToast('Complete three chapter moves to unlock the next political stage.'); return; }
    const nextIndex = Math.min(stageIndex + 1, CHAPTERS.length - 1);
    setStageIndex(nextIndex); setMissionProgress(0); setStoryDay((day) => day + 1); setPage('world');
    addFeed('Chapter unlocked', `${CHAPTERS[nextIndex].title} is now open.`, 'promotion'); showToast(`Chapter ${String(nextIndex + 1).padStart(2, '0')} unlocked`);
  };

  const runContest = () => {
    if (missionProgress < 3) { showToast('Complete three preparation moves before the ballot or caucus vote.'); return; }
    const chapter = currentChapter;
    const support = clamp(Math.round(20 + profile.trust * .18 + profile.influence * .2 + profile.coalition * 1.65 + profile.integrity * .05 + missionProgress * 1.55 - profile.scandals * 8 + (profile.legalBoost ? 6 : 0) + (Math.random() * 8 - 4)), 16, 89);
    const opponent = clamp(Math.round(47 + stageIndex * .78 + Math.random() * 7), 34, 78);
    const won = support >= opponent;
    const typeLabel = chapter.kind === 'primary' ? 'internal caucus / primary' : chapter.kind === 'appointment' ? 'public appointment review' : 'fictional election';
    const contest = { chapterId: chapter.id, chapterTitle: chapter.title, office: chapter.office, won, support, opponent, typeLabel, petitioned: false };
    setStoryDay((day) => day + 2);
    if (won) {
      const nextIndex = Math.min(stageIndex + 1, CHAPTERS.length - 1);
      setProfile((current) => ({ ...current, wins: current.wins + 1, trust: clamp(current.trust + 4), influence: clamp(current.influence + 5), integrity: clamp(current.integrity + 1), coalition: clamp(current.coalition + 1, 0, 12), energy: clamp(current.energy + 10), lastContest: contest, legalBoost: false, completed: stageIndex === CHAPTERS.length - 1 }));
      addFeed(`Mandate won · ${chapter.office}`, `The fictional result simulation favoured your campaign, ${support} to ${opponent}. This is not a real-world forecast.`, 'win'); setMissionProgress(0);
      if (stageIndex === CHAPTERS.length - 1) setModal({ type: 'ending', contest });
      else { setStageIndex(nextIndex); setModal({ type: 'result', contest, nextChapter: CHAPTERS[nextIndex] }); }
    } else {
      setProfile((current) => ({ ...current, trust: clamp(current.trust - 2), influence: clamp(current.influence - 2), energy: clamp(current.energy - 8), lastContest: contest, legalBoost: false }));
      addFeed(`Result challenged · ${chapter.office}`, `Your simulated score was ${support}; the rival score was ${opponent}. Rebuild support, accept the outcome, or consult the court desk if a lawful basis exists.`, 'loss');
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
    if (!contest || contest.won) { showToast('There is no unresolved lost contest in your career log.'); return; }
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
    setProfile({ ...defaultProfile }); setStageIndex(0); setMissionProgress(0); setStoryDay(1); setSelectedStateName('Lagos');
    setDraftAlias(''); setDraftParty(PARTY_OPTIONS[0].name); setDraftState('Lagos'); setOnboardingOpen(true); setModal(null);
  };

  const renderMainPage = () => {
    if (page === 'career') return <CareerPage stageIndex={stageIndex} progress={missionProgress} profile={profile} onJump={setPage} onContinue={continueCareer} />;
    if (page === 'offices') return <OfficesPage />;
    if (page === 'civic') return <CivicPage />;
    if (page === 'atlas') return <AtlasPage query={atlasQuery} setQuery={setAtlasQuery} zone={selectedZone} setZone={setSelectedZone} selected={selectedStateName} onTravel={travelToState} />;
    return <WorldPage stateInfo={stateInfo} stateWorldProfile={stateWorldProfile} venue={activeVenue} venueName={activeVenueName} focusRequest={venueFocusRequest} locationKey={sceneLocationKey} locality={sceneLocality} localityData={stateLocalities?.state === stateInfo.name ? stateLocalities : null} localityLoading={localityLoading || (!localityError && stateLocalities?.state !== stateInfo.name)} localityError={localityError} selectedLgaName={selectedLgaName} selectedWardKey={selectedWardKey} onSelectLga={selectLga} onSelectWard={selectWardByKey} onSelectVenue={goToVenue} remotePlayers={remotePlayers} onMove={sendMove} playerColor={profile.color || currentParty.color} onlineCount={onlineCount} networkStatus={networkStatus} onTravel={travelToState} daysToFederal={daysToFederal} daysToState={daysToState} storyDay={storyDay} />;
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><span /><i /></div><div className="brand-type"><strong>NIGERIA <b>2027</b></strong><small>A LIFE IN PUBLIC OFFICE</small></div></div>
      <div className="topbar-middle"><div className="season-pill"><span className="season-dot" /> STORY MODE <span className="season-divider" /> ACCELERATED CAREER</div><div className="election-clock"><CalendarDays size={14} /><span>FEDERAL <b>16 JAN 2027</b></span><i /> <span>STATE <b>06 FEB 2027</b></span></div></div>
      <div className="topbar-actions"><div className={`network-chip ${networkStatus}`}><span className="pulse-dot" />{networkStatus === 'online' ? `${onlineCount || 1} IN WORLD` : networkStatus === 'connecting' ? 'CONNECTING' : 'LOCAL MODE'}</div><button className="wallet-chip" onClick={() => showToast('In-game funds only · no real money or withdrawals')} title="In-game funds only"><Wallet size={15} /><span>₦{money(profile.cash)}</span></button><button className="top-avatar" onClick={createNewCandidate} title="Create a new local demo candidate">{initials(profile.alias)}</button></div>
    </header>
    <div className="app-layout">
      <aside className="left-sidebar">
        <div className="candidate-summary"><div className="candidate-kicker">YOUR CAMPAIGN <span>DEMO</span></div><div className="candidate-id-row"><div className="candidate-avatar" style={{ '--party-color': profile.color || currentParty.color }}>{initials(profile.alias)}</div><div className="candidate-name-wrap"><strong>{profile.alias || 'New Candidate'}</strong><span>{currentParty.tag} · {currentParty.name}</span></div></div><div className="candidate-meta"><span><MapPin size={12} />{stateInfo.capital}, {stateInfo.name}</span><span><Flag size={12} />{String(stageIndex + 1).padStart(2, '0')} / 12</span></div><div className="career-mini-progress"><span style={{ width: `${((stageIndex + 1) / CHAPTERS.length) * 100}%` }} /></div><div className="mini-progress-caption"><span>POLITICAL LADDER</span><b>{Math.round(((stageIndex + 1) / CHAPTERS.length) * 100)}%</b></div></div>
        <div className="sidebar-section-title">COMMAND DECK</div><nav className="side-nav" aria-label="Game navigation">{NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'world' && <span className="nav-online" />}</button>; })}</nav>
        <div className="sidebar-nation-card"><div className="nation-card-top"><span><Globe2 size={13} /> NIGERIA MAP</span><span>36 + FCT</span></div><strong>37 capital visits</strong><p>Travel the atlas. Hear a different set of local priorities in every stop.</p><button onClick={() => setPage('atlas')}>OPEN STATE ATLAS <ArrowRight size={13} /></button></div>
        <div className="sidebar-bottom"><div className="live-server-card"><div className="server-card-head"><span>REALTIME PROTOTYPE</span><span className={`server-led ${networkStatus}`} /></div><div className="server-card-status"><Radio size={14} /><b>{networkStatus === 'online' ? 'World link active' : networkStatus === 'connecting' ? 'Connecting to world' : 'Offline · local play'}</b></div><small>One-room Socket.IO demo · in-memory</small></div><button className="sidebar-reset" onClick={() => setModal({ type: 'reset' })}><Sparkles size={15} />Start a new candidate</button></div>
      </aside>
      <main className="main-content">
        <div className="main-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" />{page === 'world' ? 'LIVE SIMULATION' : page === 'career' ? 'CAMPAIGN JOURNAL' : page === 'offices' ? 'CIVIC STRUCTURE' : page === 'civic' ? 'RESEARCH & CONTEXT' : 'NATIONAL ATLAS'} <span className="heading-season">/ STORY 2027</span></div><h1>{page === 'world' ? 'The Republic is in motion.' : page === 'career' ? 'Every office has a route.' : page === 'offices' ? 'Know the titles. Know the route.' : page === 'civic' ? 'Politics, with the context intact.' : 'One federation. 37 capital stops.'}</h1><p>{page === 'world' ? 'Build a public life one conversation, one decision, one mandate at a time.' : page === 'career' ? 'From ward work to the national ticket, your next move is earned in public.' : page === 'offices' ? 'Elected, internal party, appointed, and legislative leadership roles—kept distinct.' : page === 'civic' ? 'A researched, non-partisan desk for the realities behind this fictional campaign.' : 'Select a state to travel into its capital district and continue your campaign.'}</p></div><div className="heading-location"><span className="heading-location-icon"><MapPin size={17} /></span><div><small>CURRENT STOP</small><strong>{stateInfo.capital}, {stateInfo.name}</strong><span>{stateInfo.zone.toUpperCase()}</span></div><button onClick={() => setPage('atlas')} aria-label="Choose a state"><ChevronDown size={15} /></button></div></div>
        {renderMainPage()}
      </main>
      <aside className="right-rail">
        <div className="rail-title-row"><div><div className="rail-eyebrow"><span className="pulse-dot" />CURRENT OBJECTIVE</div><h2>CHAPTER {currentChapter.number}</h2></div><button className="rail-more" onClick={() => setPage('career')} aria-label="Open career path"><ChevronRight size={17} /></button></div>
        <div className="mission-card"><div className="mission-card-top"><span>{currentChapter.phase}</span><span>{currentChapter.number} / 12</span></div><h3>{currentChapter.title}</h3><p>{currentChapter.goal}</p><div className="mission-description">{currentChapter.description}</div><div className="mission-objectives">{currentChapter.objectives.map((item, index) => <div className={missionProgress > index ? 'done' : ''} key={item}><span>{missionProgress > index ? <Check size={10} /> : String(index + 1).padStart(2, '0')}</span>{item}</div>)}</div><div className="mission-fact"><span>FIELD NOTE</span>{currentChapter.fact}</div><div className="objective-office"><div className="office-glyph"><Landmark size={18} /></div><div><small>ROUTE TO OFFICE</small><strong>{currentChapter.office}</strong></div></div><div className="objective-meter"><div><span>MANDATE PREP</span><b>{missionProgress} / 3</b></div><div className="objective-meter-track"><span style={{ width: `${progressPercent}%` }} /></div></div><div className="mission-actions-row">{currentChapter.kind === 'story' ? <button className="primary-action" onClick={continueCareer} disabled={missionProgress < 3}>ADVANCE CHAPTER <ArrowRight size={14} /></button> : <button className="primary-action" onClick={runContest} disabled={missionProgress < 3}>{currentChapter.kind === 'appointment' ? 'ATTEND REVIEW' : currentChapter.kind === 'primary' ? 'CALL THE CAUCUS VOTE' : 'SIMULATE ELECTION DAY'} <ArrowRight size={14} /></button>}<button className="icon-action" onClick={() => setPage('career')} title="View the full career path"><BookOpen size={16} /></button></div></div>
        <div className="stats-panel"><div className="stats-panel-title"><span>CAMPAIGN HEALTH</span><span className="stats-live"><Activity size={12} /> LIVE</span></div><StatBar label="PUBLIC TRUST" value={profile.trust} color="mint" icon={Users} /><StatBar label="INFLUENCE" value={profile.influence} color="blue" icon={TrendingUp} /><StatBar label="INTEGRITY" value={profile.integrity} color="lime" icon={Shield} /><div className="resource-row"><div className="resource-box"><div><Zap size={13} /><span>ENERGY</span></div><strong>{profile.energy}<small>/100</small></strong><div className="micro-track"><span style={{ width: `${profile.energy}%` }} /></div></div><div className="resource-box"><div><Users size={13} /><span>COALITION</span></div><strong>{profile.coalition}<small>/12</small></strong><div className="micro-track coalition"><span style={{ width: `${(profile.coalition / 12) * 100}%` }} /></div></div></div><div className="cash-line"><span><Banknote size={13} /> CAMPAIGN PURSE</span><strong>₦{money(profile.cash)}</strong></div>{profile.scandals > 0 && <div className="risk-line"><ShieldAlert size={13} /> INTEGRITY RISK · {profile.scandals} OPEN FLAG{profile.scandals === 1 ? '' : 'S'}</div>}</div>
        <div className="quick-actions-panel"><div className="quick-actions-heading"><div><span className="rail-eyebrow">YOUR NEXT MOVE</span><h3>Campaign actions</h3></div><button className="rest-button" onClick={rest} title="Rest to restore energy"><Clock3 size={13} />REST</button></div><div className="action-list">{ACTIONS.map((action) => { const Icon = action.icon; return <button key={action.id} className={`action-row ${action.color}`} onClick={() => performAction(action.id)} disabled={profile.cash < action.cost || profile.energy < action.energy}><span className="action-icon"><Icon size={16} /></span><span className="action-copy"><strong>{action.label}</strong><small>{action.detail}</small></span><ChevronRight size={15} className="action-chevron" /></button>; })}<button className="action-row consult-action" onClick={openConsultation}><span className="action-icon"><Briefcase size={16} /></span><span className="action-copy"><strong>Consult a senior</strong><small>Listen to what they ask of you</small></span><ChevronRight size={15} className="action-chevron" /></button></div><div className="risk-actions"><button onClick={() => setModal({ type: 'illegal-confirm' })}><Banknote size={13} />Try illicit inducement <span>HIGH RISK</span></button><button onClick={() => setModal({ type: 'legal' })}><Scale size={13} />Open court desk <span>{profile.evidence} FILES</span></button></div></div>
        <ChatPanel messages={chatMessages} draft={chatDraft} setDraft={setChatDraft} onSend={sendChat} onlineCount={onlineCount} status={networkStatus} stateName={selectedStateName} />
        <div className="rail-disclaimer"><LockKeyhole size={12} /><span>Demo profile · no real money, registration, or political party affiliation.</span></div>
      </aside>
    </div>
    {toast && <div className="toast-pop"><span className="toast-symbol"><Check size={14} /></span>{toast}</div>}
    {onboardingOpen && <WelcomeModal alias={draftAlias} setAlias={setDraftAlias} party={draftParty} setParty={setDraftParty} state={draftState} setState={setDraftState} onStart={startCandidate} onClose={() => setOnboardingOpen(false)} hasSave={Boolean(boot?.profile?.started)} />}
    {modal && <GameModal modal={modal} onClose={() => setModal(null)} onAcceptConsult={acceptConsultation} onDeclineConsult={() => { setModal(null); setProfile((current) => ({ ...current, integrity: clamp(current.integrity + 1) })); setToast('You declined a private ask; public accountability stays intact.'); }} onIllegalConfirm={attemptVoteBuying} onPrepareEvidence={prepareEvidence} onFilePetition={filePetition} onReset={resetGame} profile={profile} />}
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

function CareerPage({ stageIndex, progress, profile, onJump, onContinue }) {
  return <div className="career-page"><div className="career-hero-card"><div className="career-hero-copy"><div className="career-label"><Sparkles size={14} /> YOUR STORY ARC <span>12 CHAPTERS</span></div><h2>From one ward<br /><em>to the whole country.</em></h2><p>Every chapter is a new arena: community trust, party congresses, public ballots, legislative leadership, appointments, and lawful election challenges.</p><button className="primary-action" onClick={() => onJump('world')}>RETURN TO THE WORLD <ArrowRight size={14} /></button></div><div className="career-ring"><div className="career-ring-inner"><strong>{String(stageIndex + 1).padStart(2, '0')}</strong><span>OF 12</span></div><span className="ring-orbit" /><span className="ring-dot" /></div><div className="career-hero-stats"><div><small>MANDATES WON</small><strong>{profile.wins}</strong></div><div><small>PUBLIC TRUST</small><strong>{profile.trust}<i>%</i></strong></div><div><small>CAREER PROGRESS</small><strong>{Math.round(((stageIndex + 1) / 12) * 100)}<i>%</i></strong></div></div></div>
    <div className="timeline-heading"><div><div className="eyebrow"><span className="eyebrow-line" />CAREER LADDER</div><h2>12 stages · one public record</h2></div><div className="timeline-legend"><span><i className="legend-done" />COMPLETED</span><span><i className="legend-current" />CURRENT</span><span><i className="legend-locked" />LOCKED</span></div></div>
    <div className="career-timeline">{CHAPTERS.map((chapter, index) => { const completed = index < stageIndex; const current = index === stageIndex; return <div key={chapter.id} className={`timeline-item ${completed ? 'done' : ''} ${current ? 'current' : ''}`}><div className="timeline-track"><div className="timeline-node">{completed ? <Check size={13} /> : chapter.number}</div>{index < CHAPTERS.length - 1 && <span className="timeline-line" />}</div><div className="timeline-content"><div className="timeline-meta"><span>{chapter.phase}</span><span>STAGE {chapter.number}</span></div><h3>{chapter.title}</h3><p>{chapter.office} · {chapter.goal}</p>{current && <div className="timeline-current-state"><span>IN PROGRESS</span><span>{progress} / 3 preparations complete</span><button onClick={chapter.kind === 'story' ? onContinue : () => onJump('world')} disabled={chapter.kind === 'story' && progress < 3}>{chapter.kind === 'story' ? 'ADVANCE' : 'PREPARE IN WORLD'}<ArrowRight size={12} /></button></div>}{completed && <div className="timeline-complete"><BadgeCheck size={13} />CHAPTER COMPLETE · {profile.alias}</div>}</div></div>; })}</div>
    <div className="career-footer-note"><Shield size={17} /><div><strong>One route, many outcomes.</strong><span>Winning a simulated contest moves your story forward. Losing is not a dead end: rebuild, accept the result, or explore due process when a real in-game dispute exists.</span></div></div></div>;
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

function ChatPanel({ messages, draft, setDraft, onSend, onlineCount, status, stateName }) {
  return <div className="chat-panel"><div className="chat-head"><div><span className="chat-head-icon"><MessageCircle size={14} /></span><div><strong>World chat</strong><small>{status === 'online' ? `${onlineCount || 1} IN THIS INSTANCE` : 'LOCAL PREVIEW'}</small></div></div><span className={`chat-online-dot ${status}`} /></div><div className="chat-messages">{messages.slice(0, 4).map((item) => <div key={item.id} className={`chat-message ${item.system ? 'system' : ''} ${item.local ? 'mine' : ''}`}><div className="chat-message-meta"><b>{item.system ? 'WORLD DESK' : item.name}</b><span>{item.state || stateName}</span></div><p>{item.message}</p></div>)}</div><form className="chat-compose" onSubmit={onSend}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={180} placeholder="Message this world…" aria-label="World chat message" /><button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={14} /></button></form><div className="chat-safety">Please keep it kind; no private data or real-world vote requests.</div></div>;
}

function WelcomeModal({ alias, setAlias, party, setParty, state, setState, onStart, onClose, hasSave }) {
  return <div className="modal-backdrop welcome-backdrop"><div className="welcome-modal modal-card"><div className="welcome-visual"><div className="welcome-orbit orbit-a" /><div className="welcome-orbit orbit-b" /><div className="welcome-silhouette"><div className="silhouette-stars">✦ &nbsp; ✦ &nbsp; ✦</div><div className="silhouette-sun" /><div className="silhouette-skyline"><i /><i /><i /><i /><i /></div><div className="silhouette-road" /><div className="silhouette-figure"><span /><i /></div></div><div className="welcome-visual-caption"><span>THE JOURNEY STARTS HERE</span><b>ONE WARD. ONE COUNTRY.</b></div></div><div className="welcome-content"><button className="modal-close" onClick={onClose} aria-label="Close onboarding"><X size={18} /></button><div className="welcome-mark"><span className="brand-mark"><span /><i /></span><small>CAMPAIGN PROTOCOL · 2027</small></div><div className="welcome-kicker"><Sparkles size={13} /> YOUR POLITICAL LIFE BEGINS</div><h2>Make a name<br /><em>worth remembering.</em></h2><p>Step into an original, cinematic political life sim. Build coalitions, win offices, face court challenges, and live with every decision.</p>
    <label className="form-label">YOUR CANDIDATE NAME <span>OPTIONAL</span><input autoFocus maxLength={26} value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="e.g. Ayo Ajala" /></label><label className="form-label">STARTING STATE <span>37 CAPITAL STOPS</span><div className="select-wrap"><select value={state} onChange={(event) => setState(event.target.value)}>{STATES.map((item) => <option key={item.name} value={item.name}>{item.name} — {item.capital}</option>)}</select><ChevronDown size={15} /></div></label>
    <div className="party-pick-label">CHOOSE YOUR FICTIONAL PARTY</div><div className="party-picks">{PARTY_OPTIONS.map((item) => <button type="button" key={item.name} className={`party-pick ${party === item.name ? 'selected' : ''}`} onClick={() => setParty(item.name)} style={{ '--party-color': item.color }}><span className="party-radio">{party === item.name && <i />}</span><span><b>{item.tag}</b><small>{item.name}</small></span><span className="party-color-mark" /></button>)}</div>
    <div className="starter-bonus"><span className="bonus-icon"><Banknote size={17} /></span><div><small>NEW CANDIDATE SEED FUND</small><strong>₦1,000,000 <i>IN-GAME</i></strong></div><BadgeCheck size={16} /></div><div className="starter-disclaimer"><LockKeyhole size={12} />Local demo profile only. Funds are fictional, non-transferable, and not redeemable.</div><button className="welcome-cta" onClick={onStart}>{hasSave ? 'START A NEW CANDIDATE' : 'ENTER THE REPUBLIC'} <ArrowRight size={16} /></button><div className="welcome-bottom"><span><Shield size={12} /> ORIGINAL FICTIONAL GAME WORLD</span><span>PRE-ALPHA</span></div></div></div></div>;
}

function GameModal({ modal, onClose, onAcceptConsult, onDeclineConsult, onIllegalConfirm, onPrepareEvidence, onFilePetition, onReset, profile }) {
  if (!modal) return null;
  const close = () => onClose();
  if (modal.type === 'consult') {
    const npc = modal.npc || NPCS[0];
    return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><Briefcase size={20} /></span><span className="modal-eyebrow">PRIVATE CONSULTATION · {npc.title.toUpperCase()}</span></div><h2>{npc.name}</h2><p className="dialog-quote">“{npc.ask}”</p><div className="dialog-note"><Eye size={14} /><span>This fictional NPC asks for a public, checkable commitment. There is no guaranteed endorsement.</span></div><div className="modal-actions"><button className="secondary-button" onClick={onDeclineConsult}>DECLINE POLITELY</button><button className="primary-action" onClick={onAcceptConsult}>PUBLISH THE COMMITMENT <ArrowRight size={14} /></button></div></div></div>;
  }
  if (modal.type === 'illegal-confirm') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal danger-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon danger"><ShieldAlert size={20} /></span><span className="modal-eyebrow">HIGH-RISK EVENT · FICTIONAL MECHANIC</span></div><h2>Attempt illicit inducement?</h2><p>This abstract choice spends <strong>₦250,000</strong> and may give a short-term influence bump. It sharply damages trust and integrity, adds an investigation flag, and can undermine later legal challenges.</p><div className="danger-list"><span><Check size={12} />No tactics, scripts, or real-world voter targeting are shown.</span><span><Check size={12} />Bribery is addressed in the Electoral Act; this is a critical simulation.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>KEEP IT CLEAN</button><button className="danger-button" onClick={onIllegalConfirm}>TAKE THE RISK <ArrowRight size={14} /></button></div></div></div>;
  if (modal.type === 'legal') {
    const contest = profile.lastContest;
    const eligible = contest && !contest.won && !contest.petitioned;
    return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal legal-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon legal"><Scale size={20} /></span><span className="modal-eyebrow">EVIDENCE & DUE PROCESS</span></div><h2>Election petition desk</h2>{eligible ? <><p>Your last result was in <strong>{contest.chapterTitle}</strong>. You may prepare an evidence file and, if standing and statutory timelines allow in this fictional scenario, file a petition.</p><div className="legal-case-box"><div><small>OPEN CASE</small><strong>{contest.office}</strong></div><span className="case-result">LOSS · SIMULATED</span></div><div className="evidence-meter"><span>CASE FILES</span><b>{profile.evidence} READY</b><div className="evidence-track"><i style={{ width: `${Math.min(100, profile.evidence * 35)}%` }} /></div></div><div className="dialog-note"><InfoDot /><span>A petition can fail. Courts are not a shortcut to office; remedies follow evidence and due process.</span></div><div className="modal-actions"><button className="secondary-button" onClick={onPrepareEvidence} disabled={profile.cash < 65_000}>REVIEW EVIDENCE · ₦65K</button><button className="primary-action" onClick={onFilePetition} disabled={profile.evidence < 1 || profile.cash < 180_000 || contest.petitioned}>FILE PETITION · ₦180K <ArrowRight size={14} /></button></div></> : <><p>No unresolved lost contest is currently available. You can still learn how the process works, but real petitions require a lawful basis, standing, evidence, and strict time limits.</p><div className="legal-empty-state"><Scale size={22} /><strong>NO ACTIVE CASE</strong><span>{profile.evidence} evidence review{profile.evidence === 1 ? '' : 's'} in your local file</span></div><div className="dialog-note"><InfoDot /><span>Fictional case mechanics are simplified. Consult a qualified Nigerian lawyer for real legal matters.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>CLOSE DESK</button><button className="primary-action" onClick={onPrepareEvidence} disabled={profile.cash < 65_000}>PREPARE A PRACTICE FILE · ₦65K <ArrowRight size={14} /></button></div></>}</div></div>;
  }
  if (modal.type === 'result') {
    const result = modal.contest;
    return <div className="modal-backdrop" onMouseDown={close}><div className={`result-modal modal-card ${result.won ? 'won' : 'lost'}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="result-emblem">{result.won ? <Crown size={27} /> : <Activity size={27} />}</div><div className="modal-eyebrow">{result.won ? 'MANDATE SECURED' : 'THE RESULT IS IN'}</div><h2>{result.won ? 'The next door opens.' : 'A hard result. A new choice.'}</h2><p>{result.won ? `Your ${result.office.toLowerCase()} campaign carried the simulation, ${result.support} to ${result.opponent}. This is a fictional result—not a real poll or prediction.` : `Your campaign scored ${result.support}; the leading rival scored ${result.opponent}. You can regroup or consult the court desk if you have a lawful case.`}</p><div className="result-scoreboard"><div><small>YOUR SIMULATED SUPPORT</small><strong>{result.support}<i>pts</i></strong></div><span>VS</span><div><small>RIVAL CAMPAIGN</small><strong>{result.opponent}<i>pts</i></strong></div></div>{result.won && modal.nextChapter && <div className="unlock-box"><span><Check size={13} /></span><div><small>NEXT CHAPTER UNLOCKED</small><strong>{modal.nextChapter.title} · {modal.nextChapter.office}</strong></div></div>}{!result.won && <div className="dialog-note"><Scale size={14} /><span>Only consider litigation where there is a genuine dispute and a lawful basis. A petition is not guaranteed.</span></div>}<button className="primary-action result-continue" onClick={close}>{result.won ? 'CONTINUE THE STORY' : 'RETURN TO CAMPAIGN'} <ArrowRight size={14} /></button></div></div>;
  }
  if (modal.type === 'petition-result') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon legal"><Scale size={20} /></span><span className="modal-eyebrow">FICTIONAL COURT OUTCOME</span></div><h2>{modal.succeeds ? 'A limited remedy is granted.' : 'The petition is dismissed.'}</h2><p>{modal.succeeds ? 'The court orders a lawful remedial process in the simulation. This does not automatically make you the office-holder; you must still follow the remedy.' : 'The evidence did not meet the simulated standard. The original result stands in this scenario.'}</p><div className="dialog-note"><Scale size={14} /><span>The game abstracts complex legal processes and is not legal advice.</span></div><div className="modal-actions"><button className="primary-action" onClick={close}>BACK TO THE CAMPAIGN <ArrowRight size={14} /></button></div></div></div>;
  if (modal.type === 'ending') return <div className="modal-backdrop ending-backdrop"><div className="ending-modal modal-card"><button className="modal-close" onClick={close}><X size={18} /></button><div className="ending-glow" /><div className="ending-kicker"><Crown size={14} /> THE REPUBLIC IS YOURS TO SERVE</div><h2>A mandate is<br /><em>only the beginning.</em></h2><p>You completed a fictional political-career arc and won the simulated national contest, {modal.contest.support} to {modal.contest.opponent}. The game ends with a choice: publish a transition plan, keep a promise to dissenters, and make your first 100 days accountable.</p><div className="ending-pill-row"><span><Check size={12} />12 CHAPTERS</span><span><Check size={12} />{profile.wins} SIMULATED WINS</span><span><Shield size={12} />{profile.integrity}% INTEGRITY</span></div><button className="primary-action" onClick={close}>OPEN THE TRANSITION JOURNAL <ArrowRight size={14} /></button><button className="secondary-button ending-restart" onClick={onReset}>START A NEW CANDIDATE</button></div></div>;
  if (modal.type === 'reset') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><Sparkles size={20} /></span><span className="modal-eyebrow">LOCAL SAVE</span></div><h2>Start a new candidate?</h2><p>Your current local demo campaign will be replaced. No account or cloud save exists yet; you can create a fresh fictional candidate and begin with the demo seed fund.</p><div className="modal-actions"><button className="secondary-button" onClick={close}>KEEP THIS RUN</button><button className="primary-action" onClick={onReset}>CREATE NEW RUN <ArrowRight size={14} /></button></div></div></div>;
  return null;
}

export default App;
