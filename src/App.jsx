import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { io as socketClient } from 'socket.io-client';
import {
  Activity, ArrowRight, Banknote, BookOpen, CalendarDays, Check, ChevronDown,
  ChevronRight, Clock3, Flag, Globe2, Handshake, HeartHandshake, Landmark,
  Map, MapPin, Megaphone, MessageCircle, Move, Plane, Radio, Scale, Search,
  Send, Shield, ShieldAlert, Sparkles, TrendingUp, UserRound, Users, Wallet,
  X, Zap, Briefcase, Crown, BadgeCheck, CircleHelp, Eye, ScrollText, LockKeyhole,
  Compass, Menu, Smartphone, Maximize2, Minimize2, Shirt, Home, Building2, CarFront, PackagePlus,
} from 'lucide-react';
import World from './World.jsx';
import { createLocalPartyBranches } from './partyBranches.js';
import { PARTY_REGISTER_CHECKED_AT, PARTY_REGISTER_SOURCE } from './partyRegistry.js';
import { STATE_WORLD_PROFILES } from './stateWorldProfiles.js';
import { createLocalityVisualProfile } from './localityStyles.js';
import { meetingArrivalPoint } from './meetingWorld.js';

const MapLibreWorld = lazy(() => import('./MapLibreWorld.jsx'));
import {
  CAMPAIGN_SCENES, CHAPTERS, MAP_POINTS, NPCS, OFFICE_CATALOG, OTHER_SIDE_STORIES, PARTY_OPTIONS, RESEARCH_NOTES,
  STATES, WORLD_VENUES,
} from './data.js';

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
const partyRegisterDateLabel = new Date(`${PARTY_REGISTER_CHECKED_AT}T12:00:00+01:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
const AVATAR_SKIN_OPTIONS = [
  { label: 'Deep umber', value: '#54372d' }, { label: 'Warm umber', value: '#764c37' },
  { label: 'Copper brown', value: '#966448' }, { label: 'Golden brown', value: '#b4805c' },
  { label: 'Light brown', value: '#c39270' },
];
const AVATAR_HEAD_OPTIONS = [
  { id: 'close', label: 'Close cut' }, { id: 'natural', label: 'Natural' },
  { id: 'wrap', label: 'Head wrap' }, { id: 'cap', label: 'Cap' },
];
const AVATAR_OUTFIT_OPTIONS = [
  { id: 'accent', label: 'Party / role accent', value: null },
  { id: 'teal', label: 'Lagoon teal', value: '#267a72' }, { id: 'amber', label: 'Market amber', value: '#b87937' },
  { id: 'indigo', label: 'Indigo', value: '#465879' }, { id: 'cream', label: 'Cotton cream', value: '#ddd0ab' },
  { id: 'burgundy', label: 'Burgundy', value: '#713f4d' },
];
const DEFAULT_AVATAR_APPEARANCE = { skinTone: '#764c37', headStyle: 'close', outfitColor: null };
const normalizeAvatarAppearance = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  return {
    skinTone: AVATAR_SKIN_OPTIONS.some((option) => option.value === source.skinTone) ? source.skinTone : DEFAULT_AVATAR_APPEARANCE.skinTone,
    headStyle: AVATAR_HEAD_OPTIONS.some((option) => option.id === source.headStyle) ? source.headStyle : DEFAULT_AVATAR_APPEARANCE.headStyle,
    outfitColor: AVATAR_OUTFIT_OPTIONS.some((option) => option.value === source.outfitColor) ? source.outfitColor : null,
  };
};
const scoreMeetingResponses = (messages = []) => {
  const constructive = /\b(plan|timeline|budget|evidence|listen|include|publish|follow[- ]?up|accountab|data|service|proposal|cost|measure|respect|agree)\b/i;
  const dismissive = /\b(ignore|silence|shut up|punish|liar|enemy|useless|they all|never listen)\b/i;
  let score = 0;
  for (const message of messages) {
    if (!['speech', 'reply'].includes(message?.kind)) continue;
    const body = String(message.body || message.message || '');
    if (constructive.test(body) && !dismissive.test(body)) score += 1;
    else if (dismissive.test(body) && !constructive.test(body)) score -= 1;
  }
  return clamp(score, -3, 3);
};
const focusWorldOnMobile = (block = 'center') => {
  if (block === 'start' || window.matchMedia?.('(max-width: 1030px)').matches) {
    window.setTimeout(() => document.querySelector('.world-view-frame')?.scrollIntoView({ behavior: 'smooth', block }), 80);
  }
};
const FLIGHT_CLASSES = [
  { id: 'economy', label: 'Economy', fare: 18_000, detail: 'Clean, comfortable short-haul seat' },
  { id: 'executive', label: 'Executive', fare: 42_000, detail: 'Extra legroom and priority boarding' },
  { id: 'business', label: 'Business class', fare: 78_000, detail: 'Wide recliner, quiet cabin and lounge service' },
  { id: 'first', label: 'First class', fare: 145_000, detail: 'Private suite, lie-flat seat and premium service' },
  { id: 'private-jet', label: 'Private jet', fare: 360_000, detail: 'Charter flight with a small private cabin' },
];
const PROPERTY_UPGRADES = {
  house: [
    { level: 2, cost: 120_000, label: 'Add a bedroom', detail: 'A bigger family home and second bedroom' },
    { level: 3, cost: 210_000, label: 'Build the upper floor', detail: 'A two-storey residence with a balcony' },
    { level: 4, cost: 340_000, label: 'Finish the home', detail: 'Improved rooms, kitchen and living space' },
    { level: 5, cost: 480_000, label: 'Estate residence', detail: 'The largest house tier in this demo' },
  ],
  garage: [
    { level: 1, cost: 80_000, label: 'Single-bay garage', detail: 'Covered parking for one vehicle' },
    { level: 2, cost: 150_000, label: 'Workshop garage', detail: 'Garage bay plus a small workshop' },
    { level: 3, cost: 260_000, label: 'Double garage', detail: 'Two covered vehicle spaces' },
    { level: 4, cost: 390_000, label: 'Motor court', detail: 'Expanded parking and a secured entry' },
  ],
  plots: [
    { level: 1, cost: 220_000, label: 'Garden plot', detail: 'A planted yard beside your home' },
    { level: 2, cost: 360_000, label: 'Second property plot', detail: 'An additional small residential lot' },
    { level: 3, cost: 520_000, label: 'Rental compound', detail: 'A second fictional property parcel' },
  ],
};
const defaultProfile = {
  started: false, roleMode: 'political', institution: null,
  alias: 'New Candidate', party: PARTY_OPTIONS[0].name, partyId: PARTY_OPTIONS[0].id,
  partyTag: PARTY_OPTIONS[0].tag, color: PARTY_OPTIONS[0].color,
  cash: 1_000_000, trust: 32, influence: 12, integrity: 78,
  coalition: 1, energy: 88, scandals: 0, evidence: 0, wins: 0,
  currentOffice: null, lastContest: null, legalBoost: false, completed: false,
  property: { homeState: null, houseLevel: 1, garageLevel: 0, extraPlots: 0 },
  appearance: DEFAULT_AVATAR_APPEARANCE,
};

function normalizePropertyProfile(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const boundedLevel = (number, min, max, fallback) => Number.isFinite(Number(number)) ? clamp(Math.floor(Number(number)), min, max) : fallback;
  return {
    homeState: STATES.some((item) => item.name === source.homeState) ? source.homeState : null,
    houseLevel: boundedLevel(source.houseLevel, 1, PROPERTY_UPGRADES.house.length + 1, 1),
    garageLevel: boundedLevel(source.garageLevel, 0, PROPERTY_UPGRADES.garage.length, 0),
    extraPlots: boundedLevel(source.extraPlots, 0, PROPERTY_UPGRADES.plots.length, 0),
  };
}

function migrateProfile(stored = {}) {
  const party = PARTY_OPTIONS.find((item) => item.id === stored.partyId || item.name === stored.party) || PARTY_OPTIONS[0];
  const cash = Number.isFinite(stored.cash) ? Math.max(0, Math.floor(stored.cash)) : defaultProfile.cash;
  const role = INSTITUTION_ROLES.find((item) => item.id === stored.institution);
  const institutional = stored.roleMode === 'institutional' && Boolean(role);
  const base = { ...defaultProfile, ...stored, cash, property: normalizePropertyProfile(stored.property) };
  if (institutional) return {
    ...base, roleMode: 'institutional', institution: role.id, party: null, partyId: null, partyTag: null,
    color: role.color, currentOffice: null, appearance: normalizeAvatarAppearance(stored.appearance),
  };
  return {
    ...base, roleMode: 'political', institution: null,
    party: party.name, partyId: party.id, partyTag: party.tag, color: party.color,
    currentOffice: stored.currentOffice && typeof stored.currentOffice === 'object' ? stored.currentOffice : null,
    appearance: normalizeAvatarAppearance(stored.appearance),
  };
}

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

function dateLabel(day) {
  const start = new Date('2026-10-10T12:00:00+01:00');
  start.setDate(start.getDate() + Math.max(0, day - 1));
  return start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

const NAV_ITEMS = [
  { id: 'world', label: 'Live world', icon: Globe2 },
  { id: 'property', label: 'Home & property', icon: Home },
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

const INSTITUTION_ROLES = [
  {
    id: 'election-admin',
    title: 'Election administration',
    personnelLabel: 'INEC / SIEC personnel',
    agency: 'INEC · SIEC',
    color: '#8fe2dc',
    venueId: 'inec-office',
    description: 'A fictional, non-partisan election-administration story role. INEC administers federal and state elections and FCT Area Council elections; state SIECs administer local-government elections in their states.',
  },
  {
    id: 'judiciary',
    title: 'Judiciary',
    personnelLabel: 'Judicial personnel',
    agency: 'JUDICIARY',
    color: '#9db8ff',
    venueId: 'court',
    description: 'A fictional judiciary-side story role focused on independence, procedure and evidence. It is not a judicial appointment, judge role, legal authority or route to elected office.',
  },
  {
    id: 'cbn',
    title: 'Central banking',
    personnelLabel: 'CBN personnel',
    agency: 'CENTRAL BANK OF NIGERIA',
    color: '#8cb9ff',
    venueId: 'cbn-office',
    description: 'A fictional central-banking story role about policy evidence and trade-offs. It does not represent employment, an appointment or authority over real monetary policy.',
  },
];

const INSTITUTIONAL_STORY_VARIANTS = {
  judiciary: {
    title: 'Court process and independence',
    classification: 'JUDICIARY PERSONNEL · FICTIONAL ROLEPLAY',
    speaker: 'Fictional court administration colleague',
    prompt: 'A pending election petition is attracting public pressure. Write a neutral process update that protects judicial independence, avoids commenting on the merits and points to evidence and lawful timelines.',
    choices: {
      'respect-process': { label: 'Use a neutral notice and avoid commenting on the case', outcome: 'The fictional court desk communicates procedure without prejudging the petition or disclosing non-public details.' },
      'support-evidence': { label: 'Refer process questions to published rules and timelines', outcome: 'The fictional team explains evidence and procedure while leaving the decision to the court.' },
    },
  },
  inec: {
    title: 'Election procedures and public information',
    classification: 'INEC PERSONNEL · FICTIONAL ROLEPLAY',
    speaker: 'Fictional election-administration colleague',
    prompt: 'An observer asks about an election procedure and public communication. As a fictional, non-partisan participant, write a clear reply that points to published rules without disclosing non-public information or taking a party side.',
    choices: {
      'public-process': { label: 'Point to the published procedure and official public record', outcome: 'The fictional desk explains the established public process and does not share non-public information.' },
      'observer-access': { label: 'Support lawful observer access and consistent communication', outcome: 'The fictional team reinforces even-handed information and lawful observer access.' },
    },
  },
  siec: {
    title: 'Local elections, local rules',
    classification: 'SIEC PERSONNEL · FICTIONAL ROLEPLAY',
    speaker: 'Fictional state election-administration colleague',
    prompt: 'Residents ask which body administers local-government elections. Write a careful, non-partisan reply that distinguishes the state commission from INEC and points people to the relevant state rules.',
    choices: {
      'name-the-body': { label: 'Explain the SIEC remit and the correct public process', outcome: 'The fictional desk distinguishes the state commission’s local-election remit from INEC’s responsibilities.' },
      'check-state-law': { label: 'Check the state law before making a procedural claim', outcome: 'The fictional team avoids overclaiming and directs residents to the applicable state rules.' },
    },
  },
  cbn: {
    title: 'Monetary policy briefing',
    classification: 'CBN PERSONNEL · FICTIONAL ROLEPLAY',
    speaker: 'Fictional central-bank economist',
    prompt: 'A policy choice has competing effects on prices, growth and financial stability. Write a plain-language explanation of evidence and trade-offs while respecting the institution’s statutory independence.',
    choices: {
      'ask-tradeoffs': { label: 'Explain evidence, risks and trade-offs', outcome: 'The fictional briefing focuses on evidence and policy trade-offs within statutory responsibilities.' },
      'public-explain': { label: 'Use clear language and an authorised public channel', outcome: 'The fictional team makes the policy discussion easier to understand without implying political control.' },
    },
  },
};

const getInstitutionRole = (id) => INSTITUTION_ROLES.find((role) => role.id === id) || INSTITUTION_ROLES[0];
const getInstitutionStoryIds = (roleId, stateName) => roleId === 'election-admin'
  ? stateName === 'Federal Capital Territory' ? ['inec'] : ['siec', 'inec']
  : roleId === 'judiciary' ? ['judiciary'] : ['cbn'];
const getInstitutionStartVenue = (roleId, stateName) => roleId === 'election-admin'
  ? stateName === 'Federal Capital Territory' ? 'inec-office' : 'siec-office'
  : getInstitutionRole(roleId).venueId;
const getStorySceneForRole = (storyId, role) => {
  const story = OTHER_SIDE_STORIES.find((item) => item.id === storyId);
  if (!story || !role) return story;
  const variant = INSTITUTIONAL_STORY_VARIANTS[storyId];
  if (!variant) return story;
  return {
    ...story,
    title: variant.title,
    classification: variant.classification,
    speaker: variant.speaker,
    prompt: `${variant.prompt} Your character remains fictional ${role.personnelLabel.toLowerCase()}; this scene grants no real authority or appointment.`,
    choices: story.choices.map((choice) => ({ ...choice, ...(variant.choices?.[choice.id] || {}) })),
  };
};

function App() {
  const bootRef = useRef(undefined);
  if (bootRef.current === undefined) bootRef.current = loadSave();
  const boot = bootRef.current;
  const bootStateName = STATES.some((item) => item.name === boot?.state) ? boot.state : 'Lagos';
  const initialParty = PARTY_OPTIONS.find((item) => item.id === boot?.profile?.partyId || item.name === boot?.profile?.party) || PARTY_OPTIONS[0];
  const [profile, setProfile] = useState(() => {
    const restored = migrateProfile(boot?.profile || {});
    return restored.started && !restored.property.homeState
      ? { ...restored, property: { ...restored.property, homeState: bootStateName } }
      : restored;
  });
  const [stageIndex, setStageIndex] = useState(Number.isInteger(boot?.stageIndex) ? clamp(boot.stageIndex, 0, CHAPTERS.length - 1) : 0);
  const [missionProgress, setMissionProgress] = useState(Number.isFinite(boot?.missionProgress) ? clamp(boot.missionProgress, 0, 3) : 0);
  const [storyDay, setStoryDay] = useState(Number.isFinite(boot?.storyDay) ? Math.max(1, boot.storyDay) : 1);
  const [worldMinute, setWorldMinute] = useState(15 * 60 + 42);
  const [flightCommand, setFlightCommand] = useState(null);
  const [selectedStateName, setSelectedStateName] = useState(bootStateName);
  const [stateLocalities, setStateLocalities] = useState(null);
  const [localityLoading, setLocalityLoading] = useState(true);
  const [localityError, setLocalityError] = useState('');
  const [selectedLgaName, setSelectedLgaName] = useState('');
  const [selectedWardKey, setSelectedWardKey] = useState('');
  const [communityFocusRequest, setCommunityFocusRequest] = useState(0);
  const [page, setPage] = useState('world');
  const [immersiveMode, setImmersiveMode] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [activeVenueId, setActiveVenueId] = useState(() => boot?.profile?.roleMode === 'institutional' && INSTITUTION_ROLES.some((role) => role.id === boot?.profile?.institution) ? getInstitutionStartVenue(boot.profile.institution, bootStateName) : 'square');
  const [venueFocusRequest, setVenueFocusRequest] = useState(0);
  const [feed, setFeed] = useState([
    { id: 'start-1', title: 'The campaign begins', text: 'A new candidate enters the ward with an in-game ₦1,000,000 seed fund.', type: 'start', time: 'DAY 01' },
    { id: 'start-2', title: 'A note on the world', text: 'Party names and logos follow the dated INEC register; local branches, candidates and outcomes are fictional. The game does not predict real 2027 results.', type: 'note', time: 'BRIEFING' },
  ]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [authConfig, setAuthConfig] = useState({ authEnabled: false, persistenceConfigured: false, persistenceEnabled: false, accountProvider: null });
  const [authSession, setAuthSession] = useState(() => loadAuthSession());
  const [authReady, setAuthReady] = useState(false);
  const [accountProfileReady, setAccountProfileReady] = useState(() => !loadAuthSession());
  const [authBusy, setAuthBusy] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(!boot?.profile?.started);
  const [draftAlias, setDraftAlias] = useState(boot?.profile?.alias && boot.profile.alias !== 'New Candidate' ? boot.profile.alias : '');
  const [draftParty, setDraftParty] = useState(initialParty.name);
  const [draftMode, setDraftMode] = useState(boot?.profile?.roleMode === 'institutional' ? 'institutional' : 'political');
  const [draftInstitution, setDraftInstitution] = useState(INSTITUTION_ROLES.some((role) => role.id === boot?.profile?.institution) ? boot.profile.institution : 'election-admin');
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
  const [meetingPhase, setMeetingPhase] = useState('idle');
  const [meetingVotes, setMeetingVotes] = useState({ support: 0, mixed: 0, concern: 0 });
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingReplyTo, setMeetingReplyTo] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmDraft, setDmDraft] = useState('');
  const [selectedDmPeer, setSelectedDmPeer] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [sideStoriesSeen, setSideStoriesSeen] = useState(Array.isArray(boot?.sideStoriesSeen) ? boot.sideStoriesSeen.filter((id) => typeof id === 'string').slice(0, 32) : []);
  const [consultIndex, setConsultIndex] = useState(0);
  const [atlasQuery, setAtlasQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');
  const socketRef = useRef(null);
  const worldConfigRef = useRef(null);
  const activeMeetingRef = useRef(null);
  const meetingArrivalIdRef = useRef(null);
  const meetingDestinationRef = useRef(null);
  const resolveCampaignMeetingRef = useRef(null);
  const resolvedMeetingsRef = useRef(new Set());
  const executiveAudienceRequestsRef = useRef(new Set());
  const officeActivityUsesRef = useRef(new Set());
  const cloudRestoreAttemptedRef = useRef(false);
  const guestBackupSavedRef = useRef(false);
  activeMeetingRef.current = activeMeeting;

  useEffect(() => {
    const interval = window.setInterval(() => setWorldMinute((minute) => (minute + 2) % 1440), 10_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (boot?.profile?.started && boot.profile.roleMode === 'institutional' && INSTITUTION_ROLES.some((role) => role.id === boot.profile.institution)) {
      setVenueFocusRequest((request) => request + 1);
    }
  }, []);

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
  const activeVenue = WORLD_VENUES.find((item) => item.id === activeVenueId) || WORLD_VENUES.find((item) => item.id === 'square') || WORLD_VENUES[0];
  const isInstitutional = profile.roleMode === 'institutional';
  const institutionRole = isInstitutional ? getInstitutionRole(profile.institution) : null;
  const currentParty = isInstitutional ? null : PARTY_OPTIONS.find((item) => item.name === profile.party) || PARTY_OPTIONS[0];
  const playerColor = profile.color || currentParty?.color || institutionRole?.color || PARTY_OPTIONS[0].color;
  const playerAppearance = profile.appearance || DEFAULT_AVATAR_APPEARANCE;
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
        const destination = meetingDestinationRef.current;
        const destinationLga = destination?.state === stateInfo.name ? lgas.find((item) => item.name === destination.lga) : null;
        const destinationWard = destinationLga?.wards?.find((item) => item.name === destination.ward) || null;
        setStateLocalities({ ...payload, lgas });
        setSelectedLgaName(destinationWard ? destinationLga.name : firstLga?.name || '');
        setSelectedWardKey(wardKey(destinationWard || firstLga?.wards?.[0]));
        if (destinationWard) meetingDestinationRef.current = null;
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') setLocalityError('The local directory could not be loaded. The 3D capital remains available; try reloading the page.');
      })
      .finally(() => { if (active) setLocalityLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [selectedStateName, stateInfo.capital]);

  useEffect(() => {
    if (!profile.started) return;
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify({ profile, stageIndex, missionProgress, storyDay, state: selectedStateName, sideStoriesSeen })); }
    catch { /* Local save is optional in private browsing. */ }
  }, [profile, stageIndex, missionProgress, storyDay, selectedStateName, sideStoriesSeen]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      let config = { authEnabled: false, persistenceConfigured: false, persistenceEnabled: false, accountProvider: null };
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
      setAccountProfileReady(!(session?.access_token && config.persistenceEnabled));
    };
    start();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authReady) return undefined;
    if (!authSession?.access_token || !authConfig.persistenceEnabled) { setAccountProfileReady(true); return undefined; }
    if (accountProfileReady) return undefined;
    let active = true;
    let retryTimer;
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile', { headers: { Authorization: `Bearer ${authSession.access_token}` } });
        if (!response.ok) throw new Error('Profile load unavailable');
        const result = await response.json();
        if (!active) return;
        if (result?.save?.profile?.started && !cloudRestoreAttemptedRef.current) restoreCloudSave(result.save, true);
        setAccountProfileReady(true);
      } catch {
        if (active) retryTimer = window.setTimeout(loadProfile, 12_000);
      }
    };
    loadProfile();
    return () => { active = false; window.clearTimeout(retryTimer); };
  }, [authReady, authSession?.access_token, authConfig.persistenceEnabled, accountProfileReady]);

  useEffect(() => {
    if (!authReady) return;
    try {
      if (authSession?.access_token) window.localStorage.setItem(AUTH_SAVE_KEY, JSON.stringify(authSession));
      else window.localStorage.removeItem(AUTH_SAVE_KEY);
    } catch { /* Token persistence is optional in private browsing. */ }
  }, [authSession, authReady]);

  useEffect(() => {
    if (!authReady || !authSession?.refresh_token) return undefined;
    const expirySeconds = Number(authSession.expires_at) || Math.floor(Date.now() / 1000) + Number(authSession.expires_in || 3600);
    const delay = Math.max(1_000, expirySeconds * 1000 - Date.now() - 60_000);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: authSession.refresh_token }) });
        const result = response.ok ? await response.json() : null;
        if (result?.session?.access_token) setAuthSession({ ...result.session, expires_at: Number(result.session.expires_at) || Math.floor(Date.now() / 1000) + Number(result.session.expires_in || 3600), user: result.session.user || authSession.user || null });
        else if (response.status === 400 || response.status === 401) { setAuthSession(null); setToast('Account session expired · sign in again to resume cloud saves'); }
      } catch { /* Keep the current session available; a later request can retry. */ }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [authReady, authSession?.refresh_token, authSession?.expires_at]);

  useEffect(() => {
    if (!accountProfileReady || !authSession?.access_token || !authConfig.persistenceEnabled || !profile.started) return undefined;
    const timer = window.setTimeout(() => {
      const save = { profile, stageIndex, missionProgress, storyDay, state: selectedStateName, sideStoriesSeen };
      fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` }, body: JSON.stringify({ save }) })
        .then((response) => { if (!response.ok) throw new Error('Account save failed'); })
        .catch(() => { /* Autosave failure does not disable the local journal. */ });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [accountProfileReady, authSession?.access_token, authConfig.persistenceEnabled, profile, stageIndex, missionProgress, storyDay, selectedStateName, sideStoriesSeen]);

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
    socket.on('player:contact', ({ id, accountId } = {}) => { if (id) setRemotePlayers((current) => current.map((item) => item.id === id ? { ...item, accountId: accountId || null } : item)); });
    socket.on('player:left', ({ id } = {}) => setRemotePlayers((current) => current.filter((item) => item.id !== id)));
    socket.on('player:moved', ({ id, x, z } = {}) => setRemotePlayers((current) => current.map((item) => item.id === id ? { ...item, x, z } : item)));
    socket.on('player:meeting-status', (player = {}) => {
      if (!player.id) return;
      setRemotePlayers((current) => current.map((item) => item.id === player.id ? { ...item, meetingId: player.meetingId || null, meetingStatus: player.meetingStatus || null, meetingSlot: player.meetingSlot ?? null } : item));
    });
    socket.on('world:chat', (message) => setChatMessages((current) => [message, ...current].slice(0, 50)));
    socket.on('meeting:list', (list) => setAvailableMeetings(Array.isArray(list) ? list : []));
    socket.on('meeting:snapshot', (payload = {}) => {
      if (!payload.meeting) return;
      const roster = Array.isArray(payload.participants) ? payload.participants : [];
      const self = roster.find((person) => person.id === socketRef.current?.id);
      const alreadyAtVenue = ['at-venue', 'in-session'].includes(self?.meetingStatus);
      meetingArrivalIdRef.current = payload.meeting.status === 'open' && !alreadyAtVenue ? payload.meeting.id : null;
      setMeetingPhase(payload.meeting.status === 'open' ? alreadyAtVenue ? 'at-venue' : 'en-route' : 'discussion');
      setActiveMeeting({ ...payload.meeting, local: false });
      setMeetingMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setMeetingParticipants(roster);
      setMeetingVotes(payload.meeting.votes || { support: 0, mixed: 0, concern: 0 });
      setMeetingDraft(''); setMeetingReplyTo(null);
    });
    socket.on('meeting:message', (message) => setMeetingMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-100)));
    socket.on('meeting:participants', (participants) => {
      const roster = Array.isArray(participants) ? participants : [];
      setMeetingParticipants(roster);
      setActiveMeeting((current) => current ? { ...current, participants: roster.length, interested: roster.length, enRoute: roster.filter((item) => item.meetingStatus === 'en-route').length, atVenue: roster.filter((item) => ['at-venue', 'in-session'].includes(item.meetingStatus)).length, inSession: roster.filter((item) => item.meetingStatus === 'in-session').length } : current);
    });
    socket.on('meeting:update', (payload = {}) => {
      if (payload.meeting) setActiveMeeting((current) => current?.id === payload.meeting.id ? { ...current, ...payload.meeting, isHost: current.isHost } : current);
      if (payload.votes) setMeetingVotes(payload.votes);
      if (Array.isArray(payload.participants)) setMeetingParticipants(payload.participants);
    });
    socket.on('meeting:closed', (payload = {}) => {
      const current = activeMeetingRef.current;
      if (payload.meeting) setActiveMeeting((existing) => existing?.id === payload.meeting.id ? { ...existing, ...payload.meeting, status: 'closed', outcome: payload.outcome || payload.meeting.outcome } : existing);
      if (payload.meeting?.id === current?.id) { meetingArrivalIdRef.current = null; setMeetingPhase('discussion'); }
      if (payload.outcome?.votes) setMeetingVotes(payload.outcome.votes);
      if (current?.id === payload.meeting?.id && current.isHost && current.actionId) resolveCampaignMeetingRef.current?.(current, payload.outcome);
    });
    socket.on('meeting:invite', (invite) => { setIncomingInvite(invite); setModal({ type: 'meeting-invite', invite }); });
    socket.on('meeting:error', (payload = {}) => showToast(payload.message || 'Meeting action could not be completed.'));
    socket.on('dm:message', (message) => setDmMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-150)));
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
  const recordExecutiveAudienceRequest = ({ executive, officeTitle, subject }) => {
    if (!executive?.id || !String(subject || '').trim()) return;
    const cleanSubject = String(subject).trim().slice(0, 260);
    const requestKey = `${selectedStateName}/${currentLga?.name || ''}/${currentWard?.name || ''}/${executive.id}`;
    const alreadyRecorded = executiveAudienceRequestsRef.current.has(requestKey);
    if (alreadyRecorded) {
      addFeed(`Follow-up with ${executive.name}`, `${executive.position} · ${officeTitle}. You continued the fictional, typed audience on: “${cleanSubject}”. No additional trust or influence was awarded for a repeat visit.`, 'executive-meeting');
      showToast(`Follow-up audience recorded for ${executive.name}`);
      return;
    }
    executiveAudienceRequestsRef.current.add(requestKey);
    setProfile((current) => ({
      ...current,
      trust: clamp(current.trust + 2),
      influence: clamp(current.influence + 1),
      energy: Math.max(0, current.energy - 2),
    }));
    setStoryDay((day) => day + 1);
    addFeed(`Audience with ${executive.name}`, `${executive.position} · ${officeTitle}. You requested to discuss: “${cleanSubject}”. This was a fictional branch-office roleplay; no real-world appointment was made.`, 'executive-meeting');
    showToast(`Fictional audience request logged for ${executive.name} · +2 trust`);
  };
  const recordOfficeActivity = ({ activity, officeTitle, note = '', recordType = '' }) => {
    if (!activity?.id) return;
    const activityKey = `${storyDay}/${selectedStateName}/${currentLga?.name || ''}/${currentWard?.name || ''}/${activity.id}/${recordType}`;
    const alreadyUsed = officeActivityUsesRef.current.has(activityKey);
    if (!alreadyUsed) officeActivityUsesRef.current.add(activityKey);
    if (!alreadyUsed) {
      if (activity.id === 'water-break') {
        setProfile((current) => ({ ...current, energy: clamp(current.energy + 8, 0, 100) }));
      } else if (activity.id === 'noticeboard') {
        setProfile((current) => ({ ...current, trust: clamp(current.trust + 1), influence: clamp(current.influence + 1) }));
      } else if (activity.id === 'records-cabinet') {
        setProfile((current) => ({ ...current, integrity: clamp(current.integrity + 1) }));
      }
    }
    const detail = activity.id === 'water-break'
      ? 'You took a short pause at the office water station.'
      : activity.id === 'noticeboard'
        ? `You reviewed the fictional branch noticeboard${note ? ` and added this agenda note: “${String(note).trim().slice(0, 220)}”` : '.'}`
        : `You reviewed the fictional ${recordType === 'minutes' ? 'branch meeting minutes' : 'ward issue log'} in the office records cabinet.`;
    addFeed(activity.title || 'Office activity', `${officeTitle || 'Simulated ward office'} · ${detail}${alreadyUsed ? ' No repeat reward was awarded.' : ''}`, 'office-activity');
    showToast(alreadyUsed ? 'Office activity recorded · repeat reward already claimed for this story day' : activity.id === 'water-break' ? 'Short break · +8 energy' : activity.id === 'noticeboard' ? 'Noticeboard reviewed · +1 trust · +1 influence' : 'Fictional office record reviewed · +1 integrity');
  };
  const saveAvatarAppearance = (appearance) => {
    setProfile((current) => ({ ...current, appearance: normalizeAvatarAppearance(appearance) }));
    setModal(null);
    showToast('Avatar look saved to this story');
  };
  const immersiveActive = page === 'world' && immersiveMode;
  const closeWorldPanels = () => { setNavigationOpen(false); setPhoneOpen(false); };
  const openPhonePanel = () => { setPage('world'); setImmersiveMode(true); setNavigationOpen(false); setPhoneOpen(true); };
  const openMobileWorld = () => { setPage('world'); setImmersiveMode(true); closeWorldPanels(); };
  const navigateMobile = (nextPage) => { setPage(nextPage); closeWorldPanels(); };
  useEffect(() => {
    if (!navigationOpen && !phoneOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') closeWorldPanels(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigationOpen, phoneOpen]);
  const increaseProgress = () => setMissionProgress((current) => Math.min(3, current + 1));

  const restoreCloudSave = (save, silent = false) => {
    if (!save || typeof save !== 'object') return false;
    cloudRestoreAttemptedRef.current = true;
    if (profile.started && !guestBackupSavedRef.current) {
      try { window.localStorage.setItem(`${SAVE_KEY}-before-account-link`, JSON.stringify({ profile, stageIndex, missionProgress, storyDay, state: selectedStateName, sideStoriesSeen })); guestBackupSavedRef.current = true; }
      catch { /* A local backup is best-effort. */ }
    }
    const restoredState = STATES.some((item) => item.name === save.state) ? save.state : 'Lagos';
    const migratedProfile = migrateProfile({ ...(save.profile || {}), started: true });
    const restoredProfile = migratedProfile.property.homeState
      ? migratedProfile
      : { ...migratedProfile, property: { ...migratedProfile.property, homeState: restoredState } };
    setProfile(restoredProfile);
    setDraftParty(restoredProfile.party || PARTY_OPTIONS[0].name);
    setDraftMode(restoredProfile.roleMode === 'institutional' ? 'institutional' : 'political');
    setDraftInstitution(restoredProfile.institution || 'election-admin');
    setStageIndex(clamp(Number.isInteger(save.stageIndex) ? save.stageIndex : 0, 0, CHAPTERS.length - 1));
    setMissionProgress(clamp(Number.isInteger(save.missionProgress) ? save.missionProgress : 0, 0, 3));
    setSideStoriesSeen(Array.isArray(save.sideStoriesSeen) ? save.sideStoriesSeen : []);
    setStoryDay(Math.max(1, Number(save.storyDay) || 1));
    setSelectedStateName(restoredState);
    if (restoredProfile.roleMode === 'institutional') {
      setActiveVenueId(getInstitutionStartVenue(restoredProfile.institution, restoredState));
      setVenueFocusRequest((request) => request + 1);
    }
    setDraftAlias(save.profile?.alias || '');
    setOnboardingOpen(false); setModal(null); setAccountProfileReady(true);
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
      const session = { ...result.session, expires_at: Number(result.session.expires_at) || Math.floor(Date.now() / 1000) + Number(result.session.expires_in || 3600), user: result.session.user || result.user || null };
      cloudRestoreAttemptedRef.current = false; guestBackupSavedRef.current = false;
      if (profile.started) {
        try { window.localStorage.setItem(`${SAVE_KEY}-before-account-link`, JSON.stringify({ profile, stageIndex, missionProgress, storyDay, state: selectedStateName, sideStoriesSeen })); guestBackupSavedRef.current = true; }
        catch { /* A local backup is best-effort. */ }
      }
      setAccountProfileReady(false); setAuthSession(session);
      let save = null;
      let profileChecked = !authConfig.persistenceEnabled;
      if (authConfig.persistenceEnabled) {
        try {
          const profileResponse = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } });
          profileChecked = profileResponse.ok;
          const profileResult = profileChecked ? await profileResponse.json().catch(() => null) : null;
          save = profileResult?.save || null;
          if (profileChecked && profileResult?.save?.profile?.started) cloudRestoreAttemptedRef.current = true;
        } catch { profileChecked = false; }
      }
      return { ok: true, session, save, profileChecked };
    } catch {
      return { ok: false, error: 'Could not reach the account service. Your local campaign is still available.' };
    } finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    const token = authSession?.access_token;
    if (token) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setAuthSession(null); setAccountProfileReady(true); setDmMessages([]); setToast('Signed out · local campaign remains on this device'); setModal(null);
  };

  const startCandidate = () => {
    const roleMode = draftMode === 'institutional' ? 'institutional' : 'political';
    const role = getInstitutionRole(draftInstitution);
    const party = PARTY_OPTIONS.find((item) => item.name === draftParty) || PARTY_OPTIONS[0];
    const alias = draftAlias.trim().slice(0, 26) || 'New Candidate';
    const venueId = roleMode === 'institutional' ? getInstitutionStartVenue(role.id, draftState) : 'square';
    setProfile({
      ...defaultProfile,
      started: true,
      roleMode,
      institution: roleMode === 'institutional' ? role.id : null,
      alias,
      party: roleMode === 'political' ? party.name : null,
      partyId: roleMode === 'political' ? party.id : null,
      partyTag: roleMode === 'political' ? party.tag : null,
      color: roleMode === 'political' ? party.color : role.color,
      currentOffice: null,
      cash: 1_000_000,
      property: { ...defaultProfile.property, homeState: draftState },
    });
    setStageIndex(0); setMissionProgress(0); setSideStoriesSeen([]); setStoryDay(1);
    setSelectedStateName(draftState); setActiveVenueId(venueId); setVenueFocusRequest((request) => request + 1);
    setOnboardingOpen(false); setModal(null); setAccountProfileReady(true);
    const startText = roleMode === 'institutional'
      ? `₦1,000,000 fictional story funds added. You begin as fictional ${role.personnelLabel.toLowerCase()} in a non-partisan roleplay—no real appointment or authority. The single political ladder remains optional; you can join it later through a registered party.`
      : `₦1,000,000 fictional seed fund added. Begin with the shared civic chapter and continue up one political ladder; judiciary, election administration and CBN remain optional story encounters.`;
    setFeed([{ id: `${Date.now()}-welcome`, title: roleMode === 'institutional' ? 'Institutional story begins' : 'Civic story begins', text: startText, type: 'start', time: 'DAY 01' }]);
    setToast(roleMode === 'institutional'
      ? `${authSession ? 'Story' : 'Guest story'} role launched · ₦1,000,000 in-game funds`
      : `${authSession ? 'Career' : 'Guest career'} launched · ₦1,000,000 in-game seed fund`);
  };

  const requestPoliticalSwitch = () => {
    if (!isInstitutional) return;
    setModal({ type: 'join-party' });
  };

  const joinPoliticalLadder = (partyId) => {
    const party = PARTY_OPTIONS.find((item) => item.id === partyId) || PARTY_OPTIONS[0];
    if (!isInstitutional) { showToast('Your character is already on the political ladder.'); setModal(null); return; }
    setProfile((current) => ({
      ...current,
      roleMode: 'political', institution: null,
      party: party.name, partyId: party.id, partyTag: party.tag, color: party.color,
      currentOffice: null, lastContest: null, legalBoost: false, completed: false,
    }));
    setStageIndex(0); setMissionProgress(0); setActiveVenueId('square');
    setVenueFocusRequest((request) => request + 1); setPage('world'); setModal(null);
    setStoryDay((day) => day + 1);
    addFeed('Entered the single political ladder', `You voluntarily joined ${party.name} (${party.tag}) using the registered-party snapshot. Chapter 1 begins with no office; every later political position still requires a paid, contested process. Your fictional funds and civic-story record remain.`, 'start');
    setToast(`Political ladder joined · ${party.tag} · no office awarded`);
    focusWorldOnMobile('start');
  };

  const createNewCandidate = () => {
    setDraftAlias(''); setDraftParty(PARTY_OPTIONS[0].name); setDraftMode('political'); setDraftInstitution('election-admin');
    setDraftState(selectedStateName); setOnboardingOpen(true);
  };

  const actionCost = (actionId) => actionId === 'consult' ? { id: 'consult', label: 'Senior consultation', cost: 25_000, energy: 5 } : ACTIONS.find((item) => item.id === actionId);

  const applyStoryOutcome = (actionId, effects, narrative, typedText = '') => {
    if (isInstitutional) { showToast('Political campaign actions are unavailable until you voluntarily join the single political ladder.'); setModal(null); return false; }
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
    if (isInstitutional) { showToast('Campaign actions unlock only if you choose to join the single political ladder.'); return; }
    const action = actionCost(actionId);
    if (!action) return;
    if (profile.cash < action.cost) { showToast(`Not enough in-game funds for ${action.label.toLowerCase()}.`); return; }
    if (profile.energy < action.energy) { showToast('Your character needs rest before the next story scene.'); return; }
    const scene = CAMPAIGN_SCENES[actionId];
    if (actionId === 'listen') {
      const venue = WORLD_VENUES.find((item) => item.id === 'square');
      setMeetingPhase('en-route'); meetingArrivalIdRef.current = null;
      setActiveVenueId('square'); setVenueFocusRequest((request) => request + 1); setPage('world'); setToast('Travelling to the community meeting'); focusWorldOnMobile('start');
      const location = { state: selectedStateName, lga: currentLga?.name || '', ward: currentWard?.name || '', venueId: 'square', venueName: venue?.label || 'Community Square' };
      if (socketRef.current?.connected) {
        socketRef.current.emit('meeting:create', { title: 'Town hall · community priorities', topic: 'Listen to different neighbourhood concerns, deliver a short typed opening, reply to other speakers, then vote on the meeting direction.', actionId, location });
      } else {
        const id = `local-${Date.now()}`;
        const localMeeting = { id, title: 'Town hall · community priorities', topic: 'Listen to different neighbourhood concerns, deliver a short typed opening, reply to other speakers, then vote on the meeting direction.', actionId, hostName: profile.alias, location, status: 'open', createdAt: Date.now(), participants: 1, interested: 1, enRoute: 1, atVenue: 0, votes: { support: 0, mixed: 0, concern: 0 }, isHost: true, local: true };
        meetingArrivalIdRef.current = id;
        setMeetingPhase('en-route');
        setActiveMeeting(localMeeting); setMeetingMessages([]); setMeetingParticipants([{ id: 'local-player', name: profile.alias, state: selectedStateName, meetingId: id, meetingStatus: 'en-route', meetingSlot: 0 }]); setMeetingVotes({ support: 0, mixed: 0, concern: 0 });
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
    const narrative = modal?.npc ? `${modal.npc.name} heard your response. ${choice.outcome}` : choice.outcome;
    applyStoryOutcome(actionId, choice.effects, narrative, text);
  };

  const openSideStory = (storyId) => {
    const story = OTHER_SIDE_STORIES.find((item) => item.id === storyId);
    if (!story) return;
    setActiveVenueId(story.venueId); setVenueFocusRequest((request) => request + 1); setPage('world');
    setModal({ type: 'side-story', storyId });
    showToast(`Travelling to ${story.title}`); focusWorldOnMobile();
  };

  const finishSideStory = (storyId, text, choiceId) => {
    const sourceStory = OTHER_SIDE_STORIES.find((item) => item.id === storyId);
    const story = isInstitutional ? getStorySceneForRole(storyId, institutionRole) : sourceStory;
    const choice = story?.choices.find((item) => item.id === choiceId);
    if (!story || !choice) return;
    setProfile((current) => ({
      ...current,
      trust: clamp(current.trust + choice.effects.trust),
      influence: clamp(current.influence + choice.effects.influence),
      integrity: clamp(current.integrity + choice.effects.integrity),
    }));
    setSideStoriesSeen((current) => current.includes(storyId) ? current : [...current, storyId]);
    setStoryDay((day) => day + 1);
    const roleNote = isInstitutional ? ' This is a fictional personnel story record; it grants no appointment, official power or political office.' : '';
    addFeed(story.title, `${choice.outcome} Your typed response: “${text.trim().slice(0, 120)}”.${roleNote}`, 'civic-story');
    setModal(null);
    showToast(isInstitutional ? 'Institutional story recorded · no appointment or office awarded' : 'Side story recorded · political ladder unchanged');
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
    const responseSignal = scoreMeetingResponses(meetingMessages);
    let effects;
    let narrative;
    if (outcome.outcome === 'supported' || support > concern) {
      effects = { trust: 6 + Math.min(2, replies) + responseSignal, influence: 3, integrity: 2 + Math.max(0, responseSignal), coalition: voices > 1 ? 2 : 1 };
      narrative = `The town hall closed with majority support (${support} support, ${concern} concern). ${replies} replies and ${voices} participant${voices === 1 ? '' : 's'} were recorded; the published response shaped the meeting record.`;
    } else if (outcome.outcome === 'rework' || concern > support) {
      effects = { trust: -2 + responseSignal, influence: 1, integrity: 3 + Math.max(0, responseSignal), coalition: 1 };
      narrative = `Residents asked for the proposal to be reworked (${support} support, ${concern} concern). Typed responses moderated the trust effect; the published record preserves concerns for follow-up.`;
    } else {
      effects = { trust: 3 + responseSignal, influence: 2, integrity: 3 + Math.max(0, responseSignal), coalition: voices > 1 ? 1 : 0 };
      narrative = `The meeting ended without a clear majority. ${replies} replies were included in the minutes; typed responses and the room’s vote shaped a contested record rather than forced consensus.`;
    }
    applyStoryOutcome('listen', effects, narrative);
  };
  resolveCampaignMeetingRef.current = resolveCampaignMeeting;

  const submitMeetingMessage = (event) => {
    event?.preventDefault?.();
    const body = meetingDraft.trim().slice(0, 500);
    if (!body || !activeMeeting) return;
    const kind = meetingReplyTo ? 'reply' : 'speech';
    if (activeMeeting.local) {
      const item = { id: `local-${Date.now()}`, meetingId: activeMeeting.id, senderId: 'local-player', senderSocketId: 'local-player', senderName: profile.alias, kind, body, replyTo: meetingReplyTo?.id || null, at: Date.now() };
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
      setMeetingPhase('discussion'); meetingArrivalIdRef.current = null;
      resolveCampaignMeeting(activeMeeting, outcome);
    } else socketRef.current?.emit('meeting:close', { meetingId: activeMeeting.id, summary: 'Meeting record published by the host.' });
  };

  const leaveMeeting = () => {
    if (activeMeeting && !activeMeeting.local) socketRef.current?.emit('meeting:leave', { meetingId: activeMeeting.id });
    meetingArrivalIdRef.current = null;
    setMeetingPhase('idle');
    setActiveMeeting(null); setMeetingMessages([]); setMeetingParticipants([]); setMeetingReplyTo(null);
  };

  const markMeetingArrived = (meetingId) => {
    if (!meetingId || meetingArrivalIdRef.current !== meetingId) return;
    meetingArrivalIdRef.current = null;
    setMeetingPhase('at-venue');
    const current = activeMeetingRef.current;
    if (current?.id === meetingId && current.local) {
      setMeetingParticipants((participants) => participants.map((item) => item.id === 'local-player' ? { ...item, meetingStatus: 'at-venue' } : item));
    } else if (socketRef.current?.connected) socketRef.current.emit('meeting:arrived', { meetingId });
    showToast('At the venue · the gathering is visible in the 3D world.');
  };

  const enterMeetingDiscussion = () => {
    if (!activeMeeting) return;
    if (activeMeeting.status === 'open' && !['at-venue', 'discussion'].includes(meetingPhase)) {
      showToast('Your character is still travelling. Arrive at the venue before opening the discussion.');
      return;
    }
    setMeetingPhase('discussion');
    if (activeMeeting.local) setMeetingParticipants((participants) => participants.map((person) => person.id === 'local-player' ? { ...person, meetingStatus: 'in-session' } : person));
    else if (activeMeeting.status === 'open' && socketRef.current?.connected) socketRef.current.emit('meeting:enter', { meetingId: activeMeeting.id });
  };

  const minimizeMeetingDiscussion = () => {
    if (!activeMeeting) return;
    setMeetingPhase('at-venue');
  };

  const focusMeetingWorld = () => {
    const meeting = activeMeetingRef.current;
    if (!meeting) return;
    setPage('world'); setImmersiveMode(true); setPhoneOpen(false); setNavigationOpen(false);
    setActiveVenueId(meeting.location?.venueId || 'square');
    setVenueFocusRequest((request) => request + 1);
    if (['at-venue', 'discussion'].includes(meetingPhase)) { setMeetingPhase('at-venue'); meetingArrivalIdRef.current = null; }
    else { setMeetingPhase('en-route'); meetingArrivalIdRef.current = meeting.id; }
  };

  const dismissMeeting = () => {
    if (activeMeeting?.status === 'open' && activeMeeting.isHost) { closeMeeting(); return; }
    leaveMeeting();
  };

  const joinMeeting = (meeting) => {
    if (!meeting?.id) return;
    const currentMeeting = activeMeetingRef.current;
    if (currentMeeting?.id === meeting.id) { focusMeetingWorld(); return; }
    if (currentMeeting && !currentMeeting.local) socketRef.current?.emit('meeting:leave', { meetingId: currentMeeting.id });
    if (currentMeeting) { setActiveMeeting(null); setMeetingMessages([]); setMeetingParticipants([]); setMeetingPhase('idle'); }
    const location = meeting.location || {};
    const targetState = STATES.find((item) => item.name === location.state);
    if (targetState && location.lga && location.ward) {
      const destination = { state: targetState.name, lga: location.lga, ward: location.ward };
      if (stateLocalities?.state === targetState.name) {
        const targetLga = stateLocalities.lgas?.find((item) => item.name === destination.lga);
        const targetWard = targetLga?.wards?.find((item) => item.name === destination.ward);
        if (targetWard) { setSelectedLgaName(targetLga.name); setSelectedWardKey(wardKey(targetWard)); meetingDestinationRef.current = null; }
        else meetingDestinationRef.current = destination;
      } else meetingDestinationRef.current = destination;
    }
    if (targetState && targetState.name !== selectedStateName) {
      setSelectedStateName(targetState.name); setSelectedLgaName(''); setSelectedWardKey('');
    }
    meetingArrivalIdRef.current = meeting.id;
    setMeetingPhase('en-route');
    setActiveVenueId(location.venueId || 'square'); setVenueFocusRequest((request) => request + 1); setPage('world'); setImmersiveMode(true); setPhoneOpen(false); setNavigationOpen(false);
    setMeetingDraft(''); setMeetingReplyTo(null);
    if (meeting.local) {
      setActiveMeeting(meeting);
      setMeetingMessages([]);
      setMeetingParticipants([{ id: 'local-player', name: profile.alias, state: selectedStateName, meetingId: meeting.id, meetingStatus: 'en-route', meetingSlot: 0 }]);
      return;
    }
    if (!socketRef.current?.connected) { meetingArrivalIdRef.current = null; setMeetingPhase('idle'); showToast('Connect to the world before joining this meeting.'); return; }
    socketRef.current.emit('meeting:join', { meetingId: meeting.id });
    focusWorldOnMobile('start');
  };

  const sendDirectMessage = (event) => {
    event?.preventDefault?.();
    const body = dmDraft.trim().slice(0, 300);
    if (!body || !selectedDmPeer || !socketRef.current?.connected) return;
    socketRef.current.emit('dm:send', { recipientId: selectedDmPeer.id, message: body });
    setDmDraft('');
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
    if (isInstitutional) { showToast('Institutional roleplay is non-partisan; this campaign mechanic is unavailable.'); setModal(null); return; }
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

  const startPlaneTrip = ({ destination, cabinClass } = {}) => {
    const route = STATES.find((item) => item.name === destination);
    const fareClass = FLIGHT_CLASSES.find((item) => item.id === cabinClass);
    if (!route || !fareClass) { showToast('Choose a valid destination and cabin class.'); return; }
    if (route.name === selectedStateName) { showToast('Choose another state for this flight.'); return; }
    if (flightCommand) { showToast('A flight is already in progress.'); return; }
    if (profile.cash < fareClass.fare) { showToast(`Not enough fictional funds for ${fareClass.label} · ₦${money(fareClass.fare)} required.`); return; }
    const request = { id: Date.now(), origin: selectedStateName, destination: route.name, cabinClass, fare: fareClass.fare };
    setProfile((current) => ({ ...current, cash: current.cash - fareClass.fare }));
    closeWorldPanels();
    setFlightCommand(request);
    addFeed(`Flight booked · ${route.name}`, `${fareClass.label} departure from ${stateInfo.capital} to ${route.capital}. Fare ₦${money(fareClass.fare)} deducted from fictional in-game funds.`, 'travel');
    setToast(`Boarding ${fareClass.label} service to ${route.capital}…`);
  };

  const completePlaneTrip = (request) => {
    const destination = STATES.find((item) => item.name === request?.destination);
    if (!destination) { setFlightCommand(null); return; }
    setFlightCommand(null);
    setSelectedStateName(destination.name);
    setSelectedLgaName('');
    setSelectedWardKey('');
    setActiveVenueId('airport');
    setVenueFocusRequest((value) => value + 1);
    setCommunityFocusRequest((value) => value + 1);
    setPage('world');
    addFeed(`Landed in ${destination.name}`, `Your ${FLIGHT_CLASSES.find((item) => item.id === request.cabinClass)?.label || 'flight'} touched down in ${destination.capital}. The arrival and airport scene are fictional game imagery.`, 'travel');
    setToast(`Welcome to ${destination.capital}, ${destination.name} · arrival complete`);
    focusWorldOnMobile();
  };

  const purchasePropertyUpgrade = (kind) => {
    const property = normalizePropertyProfile(profile.property);
    const currentLevel = kind === 'house' ? property.houseLevel : kind === 'garage' ? property.garageLevel : property.extraPlots;
    const tier = PROPERTY_UPGRADES[kind]?.find((upgrade) => upgrade.level === currentLevel + 1);
    if (!tier) { showToast('This property line is fully upgraded in the demo.'); return; }
    if (profile.cash < tier.cost) { showToast(`Not enough fictional funds · ₦${money(tier.cost)} required.`); return; }
    const field = kind === 'house' ? 'houseLevel' : kind === 'garage' ? 'garageLevel' : 'extraPlots';
    setProfile((current) => ({
      ...current,
      cash: current.cash - tier.cost,
      property: { ...normalizePropertyProfile(current.property), [field]: tier.level },
    }));
    addFeed(`${tier.label} complete`, `${tier.detail}. ₦${money(tier.cost)} in fictional funds spent; the residence is stored on this game profile.`, 'property');
    showToast(`${tier.label} added · ₦${money(tier.cost)} fictional funds`);
  };

  const visitPlayerHome = () => {
    const homeState = profile.property?.homeState || selectedStateName;
    if (homeState !== selectedStateName) {
      setSelectedStateName(homeState);
      setSelectedLgaName('');
      setSelectedWardKey('');
      setCommunityFocusRequest((value) => value + 1);
    }
    setActiveVenueId('home');
    setVenueFocusRequest((value) => value + 1);
    setPage('world');
    showToast(homeState === selectedStateName ? 'Heading to your home and garage' : `Returning to your home in ${homeState}`);
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
    if (isInstitutional) { showToast('This fictional personnel role has no promotion ladder. Institutional stories remain optional encounters; you may join the single political ladder if you choose.'); return; }
    if (missionProgress < 3) { showToast('Complete three chapter moves to unlock the next political stage.'); return; }
    const nextIndex = Math.min(stageIndex + 1, CHAPTERS.length - 1);
    setStageIndex(nextIndex); setMissionProgress(0); setStoryDay((day) => day + 1); setPage('world');
    addFeed('Chapter unlocked', `${CHAPTERS[nextIndex].title} is now open.`, 'promotion'); showToast(`Chapter ${String(nextIndex + 1).padStart(2, '0')} unlocked`);
  };

  const runContest = (confirmVacating = false) => {
    if (isInstitutional) { showToast('Institutional personnel cannot enter party contests. Voluntarily join the political ladder first.'); return; }
    if (missionProgress < 3) { showToast('Complete three story preparations before entering the paid contest.'); return; }
    const chapter = currentChapter;
    if (chapter.kind === 'story') { showToast('This opening is a civic story, not a political office or contest.'); return; }
    const fee = Number(chapter.contestFee);
    if (!Number.isFinite(fee) || fee <= 0) { showToast('This position is not available until a paid, contested process is configured.'); return; }
    if (profile.cash < fee) { showToast(`This ${chapter.kind === 'appointment' ? 'merit review' : 'contest'} costs ₦${money(fee)} in-game. Build funds before entering.`); return; }
    if (profile.currentOffice && !confirmVacating) {
      setModal({ type: 'contest-confirm', office: profile.currentOffice, chapter, fee });
      return;
    }
    const support = clamp(Math.round(20 + profile.trust * .18 + profile.influence * .2 + profile.coalition * 1.65 + profile.integrity * .05 + missionProgress * 1.55 - profile.scandals * 8 + (profile.legalBoost ? 6 : 0) + (Math.random() * 8 - 4)), 16, 89);
    const opponent = clamp(Math.round(47 + stageIndex * .78 + Math.random() * 7), 34, 78);
    const won = support >= opponent;
    const typeLabel = chapter.kind === 'primary' ? 'PAID INTERNAL CONTEST · SIMULATED' : chapter.kind === 'appointment' ? 'COMPETITIVE MERIT REVIEW · NOT A BALLOT' : 'PAID PUBLIC ELECTION · NOT A FORECAST';
    const contest = { chapterId: chapter.id, chapterTitle: chapter.title, office: chapter.office, won, support, opponent, opponentName: 'Rival candidate', fee, typeLabel, petitioned: false, petitionEligible: chapter.kind === 'race', vacatedOffice: profile.currentOffice?.title || null };
    setStoryDay((day) => day + 2);
    if (won) {
      const nextIndex = Math.min(stageIndex + 1, CHAPTERS.length - 1);
      const label = chapter.kind === 'appointment' ? 'Competitive appointment review advanced' : chapter.kind === 'primary' ? 'Internal contest won' : 'Public contest won';
      setProfile((current) => ({ ...current, cash: Math.max(0, current.cash - fee), currentOffice: { title: chapter.office, chapterId: chapter.id, acquiredDay: storyDay + 2, partyId: current.partyId }, wins: current.wins + 1, trust: clamp(current.trust + 4), influence: clamp(current.influence + 5), integrity: clamp(current.integrity + 1), coalition: clamp(current.coalition + 1, 0, 12), energy: clamp(current.energy + 10), lastContest: chapter.kind === 'race' ? contest : current.lastContest, legalBoost: false, completed: stageIndex === CHAPTERS.length - 1 }));
      addFeed(`${label} · ${chapter.office}`, `Your paid contest was won ${support}–${opponent} against a rival. ${contest.vacatedOffice ? `${contest.vacatedOffice} was vacated before entry; only one current position is recorded. ` : ''}This is a fictional game result, not a real-world election or appointment.`, chapter.kind === 'race' ? 'win' : 'promotion');
      setMissionProgress(0);
      if (stageIndex === CHAPTERS.length - 1) setModal({ type: 'ending', contest });
      else { setStageIndex(nextIndex); setModal({ type: 'result', contest, nextChapter: CHAPTERS[nextIndex] }); }
    } else {
      setProfile((current) => ({ ...current, cash: Math.max(0, current.cash - fee), currentOffice: null, trust: clamp(current.trust - 2), influence: clamp(current.influence - 2), energy: clamp(current.energy - 8), lastContest: chapter.kind === 'race' ? contest : current.lastContest, legalBoost: false }));
      addFeed(`${chapter.kind === 'appointment' ? 'Merit review not advanced' : chapter.kind === 'primary' ? 'Internal contest not won' : 'Election result'} · ${chapter.office}`, `This paid contest had a rival; your score was ${support}, the rival score ${opponent}. No position was awarded. ${contest.vacatedOffice ? `${contest.vacatedOffice} was vacated before entry, so your character now holds no current office. ` : ''}Rebuild support or accept the simulated result.`, 'loss');
      setModal({ type: 'result', contest, nextChapter: null });
    }
  };

  const prepareEvidence = () => {
    if (isInstitutional) { showToast('Election-petition mechanics are available only from the political ladder. You can still explore the court story.'); setModal(null); return; }
    if (profile.cash < 65_000) { showToast('Evidence review requires ₦65,000 in-game.'); return; }
    setProfile((current) => ({ ...current, cash: current.cash - 65_000, evidence: current.evidence + 1, integrity: clamp(current.integrity + 1) }));
    setStoryDay((day) => day + 1); addFeed('Evidence review', 'Your fictional legal team reviewed public records and election procedures. A file is not proof by itself.', 'legal');
    showToast('Evidence file prepared · no outcome guaranteed');
  };

  const filePetition = () => {
    if (isInstitutional) { showToast('Election petitions are available only after a simulated public-election contest.'); setModal(null); return; }
    const contest = profile.lastContest;
    if (!contest || contest.won || !contest.petitionEligible) { showToast('There is no unresolved public-election loss eligible for the simulated petition desk.'); return; }
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
    executiveAudienceRequestsRef.current.clear();
    officeActivityUsesRef.current.clear();
    setProfile({ ...defaultProfile }); setStageIndex(0); setMissionProgress(0); setStoryDay(1); setSideStoriesSeen([]); setSelectedStateName('Lagos');
    setDraftAlias(''); setDraftParty(PARTY_OPTIONS[0].name); setDraftMode('political'); setDraftInstitution('election-admin'); setDraftState('Lagos'); setOnboardingOpen(true); setModal(null);
  };

  const renderMainPage = () => {
    if (page === 'property') return <PropertyPage profile={profile} homeState={profile.property?.homeState || selectedStateName} onUpgrade={purchasePropertyUpgrade} onVisitHome={visitPlayerHome} />;
    if (page === 'career') return <CareerPage stageIndex={stageIndex} progress={missionProgress} profile={profile} onJump={setPage} onContinue={continueCareer} onExploreSideStory={openSideStory} sideStoriesSeen={sideStoriesSeen} onJoinPolitical={requestPoliticalSwitch} />;
    if (page === 'offices') return <OfficesPage />;
    if (page === 'civic') return <CivicPage />;
    if (page === 'atlas') return <AtlasPage query={atlasQuery} setQuery={setAtlasQuery} zone={selectedZone} setZone={setSelectedZone} selected={selectedStateName} onTravel={travelToState} />;
    return <WorldPage stateInfo={stateInfo} profile={profile} playerId={activeMeeting?.local ? 'local-player' : socketRef.current?.id || 'local-player'} stateWorldProfile={stateWorldProfile} venue={activeVenue} venueName={activeVenueName} focusRequest={venueFocusRequest} locationKey={sceneLocationKey} locality={sceneLocality} localityData={stateLocalities?.state === stateInfo.name ? stateLocalities : null} localityLoading={localityLoading || (!localityError && stateLocalities?.state !== stateInfo.name)} localityError={localityError} selectedLgaName={selectedLgaName} selectedWardKey={selectedWardKey} onSelectLga={selectLga} onSelectWard={selectWardByKey} onSelectVenue={goToVenue} remotePlayers={remotePlayers} onMove={sendMove} playerColor={playerColor} playerAppearance={playerAppearance} onlineCount={onlineCount} networkStatus={networkStatus} onTravel={travelToState} daysToFederal={daysToFederal} daysToState={daysToState} storyDay={storyDay} activeMeeting={activeMeeting} meetingPhase={meetingPhase} meetingParticipants={meetingParticipants} meetingSlot={meetingParticipants.find((person) => person.id === socketRef.current?.id)?.meetingSlot ?? (activeMeeting?.local ? 0 : null)} onMeetingArrival={markMeetingArrived} onEnterMeeting={enterMeetingDiscussion} meetingMessages={meetingMessages} currentParty={currentParty} institutionRole={institutionRole} isInstitutional={isInstitutional} chapter={currentChapter} missionProgress={missionProgress} worldMinute={worldMinute} onOpenCareer={() => setPage('career')} onOpenPhone={openPhonePanel} onNavigate={navigateMobile} onOpenAvatar={() => setModal({ type: 'avatar-customize' })} onExploreSideStory={openSideStory} onJoinPolitical={requestPoliticalSwitch} onRequestExecutiveAudience={recordExecutiveAudienceRequest} onOfficeActivity={recordOfficeActivity} flightCommand={flightCommand} onStartFlight={startPlaneTrip} onFlightComplete={completePlaneTrip} onUpgradeProperty={purchasePropertyUpgrade} onVisitHome={visitPlayerHome} />;
  };

  return <div className={`app-shell ${immersiveActive ? 'immersive-shell' : ''} ${flightCommand ? 'in-flight' : ''} ${navigationOpen ? 'nav-open' : ''} ${phoneOpen ? 'phone-open' : ''}`}>
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><span /><i /></div><div className="brand-type"><strong>NIGERIA <b>2027</b></strong><small>A LIFE IN PUBLIC OFFICE</small></div></div>
      <div className="topbar-middle"><div className="season-pill"><span className="season-dot" /> STORY MODE <span className="season-divider" /> {isInstitutional ? 'INSTITUTIONAL ROLEPLAY' : 'POLITICAL LADDER'}</div><div className="election-clock"><CalendarDays size={14} /><span>FEDERAL <b>16 JAN 2027</b></span><i /> <span>STATE <b>06 FEB 2027</b></span></div></div>
      <div className="topbar-actions">
        <div className="world-topbar-tools" aria-label="Game controls">
          <button type="button" onClick={() => { setNavigationOpen((open) => !open); setPhoneOpen(false); }} aria-expanded={navigationOpen} aria-label="Open game menu" title="Game menu"><Menu size={16} /></button>
          {page === 'world' && <>
            <button type="button" onClick={() => { setPhoneOpen((open) => !open); setNavigationOpen(false); }} aria-expanded={phoneOpen} aria-label="Open social phone" title="World chat, DMs and meetings"><Smartphone size={15} /></button>
            <button type="button" className="immersion-toggle" onClick={() => { setImmersiveMode((active) => !active); closeWorldPanels(); }} aria-label={immersiveMode ? 'Exit immersive view' : 'Enter immersive view'} title={immersiveMode ? 'Exit immersive view' : 'Enter immersive view'}>{immersiveMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
          </>}
        </div>
        <div className={`network-chip ${networkStatus}`}><span className="pulse-dot" />{networkStatus === 'online' ? `${onlineCount || 1} IN WORLD` : networkStatus === 'connecting' ? 'CONNECTING' : 'LOCAL MODE'}</div>
        <button className="wallet-chip" onClick={() => showToast('In-game funds only · no real money or withdrawals')} title="In-game funds only"><Wallet size={15} /><span className="wallet-full">₦{money(profile.cash)}</span><span className="wallet-compact">₦{profile.cash >= 1_000_000 ? `${(profile.cash / 1_000_000).toFixed(1)}m` : money(profile.cash)}</span></button>
        <button className="avatar-customize-shortcut" onClick={() => setModal({ type: 'avatar-customize' })} title="Customize your avatar" aria-label="Customize your avatar"><Shirt size={15} /></button>
        <button className="top-avatar" onClick={() => setModal({ type: 'account' })} title={authSession?.access_token ? `Signed in${authSession.user?.email ? ` as ${authSession.user.email}` : ''}` : 'Account sign-in and cloud-save settings'} aria-label="Account and cloud-save settings">{initials(profile.alias)}</button>
      </div>
    </header>
    {(navigationOpen || phoneOpen) && <button className="world-drawer-backdrop" onClick={closeWorldPanels} aria-label="Close game panel" />}
    <div className="app-layout">
      <aside className="left-sidebar">
        <div className={`candidate-summary ${isInstitutional ? 'institutional-summary' : ''}`}>
          <div className="candidate-kicker">{isInstitutional ? 'YOUR INSTITUTIONAL STORY' : 'YOUR POLITICAL STORY'} <span>{authSession?.access_token ? 'ACCOUNT' : 'GUEST'}</span></div>
          <div className="candidate-id-row"><div className="candidate-avatar" style={{ '--party-color': playerColor }}>{initials(profile.alias)}</div><div className="candidate-name-wrap"><strong>{profile.alias || 'New Candidate'}</strong><span>{isInstitutional ? `${institutionRole.personnelLabel} · FICTIONAL` : `${currentParty.tag} · ${currentParty.name}`}</span></div></div>
          <div className="candidate-meta"><span><MapPin size={12} />{stateInfo.capital}, {stateInfo.name}</span>{isInstitutional ? <span><Shield size={12} />NON-PARTISAN ROLEPLAY</span> : <span><Flag size={12} />{String(stageIndex + 1).padStart(2, '0')} / 12</span>}</div>
          {isInstitutional ? <><div className="institutional-mini-note">No separate office or promotion ladder. Join the single political ladder later only if you choose.</div><button className="candidate-switch-button" onClick={requestPoliticalSwitch}>OPTIONALLY JOIN PARTY LADDER <ArrowRight size={12} /></button></> : <>{profile.currentOffice && <div className="current-position-chip"><small>ONE CURRENT POSITION · WON IN A PAID CONTEST</small><strong>{profile.currentOffice.title}</strong><span>Released before your next office contest.</span></div>}<div className="career-mini-progress"><span style={{ width: `${((stageIndex + 1) / CHAPTERS.length) * 100}%` }} /></div><div className="mini-progress-caption"><span>POLITICAL LADDER</span><b>{Math.round(((stageIndex + 1) / CHAPTERS.length) * 100)}%</b></div></>}
        </div>
        <div className="sidebar-section-title">COMMAND DECK</div><nav className="side-nav" aria-label="Game navigation">{NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); closeWorldPanels(); }}><Icon size={17} strokeWidth={1.8} /><span>{item.id === 'career' && isInstitutional ? 'Story record' : item.label}</span>{item.id === 'world' && <span className="nav-online" />}</button>; })}</nav>
        <div className="sidebar-nation-card"><div className="nation-card-top"><span><Globe2 size={13} /> NIGERIA MAP</span><span>36 + FCT</span></div><strong>37 capital visits</strong><p>Travel the atlas. Hear a different set of local priorities in every stop.</p><button onClick={() => { setPage('atlas'); closeWorldPanels(); }}>OPEN STATE ATLAS <ArrowRight size={13} /></button></div>
        <div className="sidebar-bottom"><div className="live-server-card"><div className="server-card-head"><span>REALTIME PROTOTYPE</span><span className={`server-led ${networkStatus}`} /></div><div className="server-card-status"><Radio size={14} /><b>{networkStatus === 'online' ? 'World link active' : networkStatus === 'connecting' ? 'Connecting to world' : 'Offline · local play'}</b></div><small>{authConfig.persistenceEnabled ? 'Account identity · persistent story records enabled' : 'Guest preview · rooms/messages are temporary until database setup'}</small></div><button className="sidebar-reset" onClick={() => setModal({ type: 'reset' })}><Sparkles size={15} />Start a new story</button></div>
      </aside>
      <main className="main-content">
        <div className="main-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" />{page === 'world' ? 'LIVE SIMULATION' : page === 'property' ? 'HOME & PROPERTY' : page === 'career' ? isInstitutional ? 'INSTITUTIONAL STORY RECORD' : 'CAMPAIGN JOURNAL' : page === 'offices' ? 'CIVIC STRUCTURE' : page === 'civic' ? 'RESEARCH & CONTEXT' : 'NATIONAL ATLAS'} <span className="heading-season">/ STORY 2027</span></div><h1>{page === 'world' ? 'The Republic is in motion.' : page === 'property' ? 'A home of your own.' : page === 'career' ? isInstitutional ? 'A story role, not another ladder.' : 'Every office has a route.' : page === 'offices' ? 'Know the titles. Know the route.' : page === 'civic' ? 'Politics, with the context intact.' : 'One federation. 37 capital stops.'}</h1><p>{page === 'world' ? isInstitutional ? 'Explore a fictional non-partisan institution story; switch into the political ladder only if you choose.' : 'Build a public life one conversation, one decision, one mandate at a time.' : page === 'property' ? 'Your starter house is included. Use fictional funds to grow your home, garage and property plots.' : page === 'career' ? isInstitutional ? 'Your institutional role has no promotions or office contests. Explore its story encounters or voluntarily join the existing political ladder.' : 'From ward work to the national ticket, your next move is earned in public.' : page === 'offices' ? 'Elected, internal party, appointed, and legislative leadership roles—kept distinct.' : page === 'civic' ? 'A researched, non-partisan desk for the realities behind this fictional public-life story.' : 'Select a state to travel into its capital district and continue your story.'}</p></div><div className="heading-location"><span className="heading-location-icon"><MapPin size={17} /></span><div><small>CURRENT STOP</small><strong>{stateInfo.capital}, {stateInfo.name}</strong><span>{stateInfo.zone.toUpperCase()}</span></div><button onClick={() => setPage('atlas')} aria-label="Choose a state"><ChevronDown size={15} /></button></div></div>
        {renderMainPage()}
      </main>
      <aside className="right-rail">
        <div className="rail-title-row"><div><div className="rail-eyebrow"><span className="pulse-dot" />{isInstitutional ? 'CURRENT STORY ROLE' : 'CURRENT OBJECTIVE'}</div><h2>{isInstitutional ? 'NON-PARTISAN' : `CHAPTER ${currentChapter.number}`}</h2></div>{immersiveActive ? <button className="rail-more" onClick={() => setPhoneOpen(false)} aria-label="Close world phone"><X size={16} /></button> : <button className="rail-more" onClick={() => setPage('career')} aria-label="Open career or story record"><ChevronRight size={17} /></button>}</div>
        {isInstitutional ? <InstitutionalRolePanel role={institutionRole} /> : <div className="mission-card"><div className="mission-card-top"><span>{currentChapter.phase}</span><span>{currentChapter.number} / 12</span></div><h3>{currentChapter.title}</h3><p>{currentChapter.goal}</p><div className="mission-description">{currentChapter.description}</div><div className="mission-objectives">{currentChapter.objectives.map((item, index) => <div className={missionProgress > index ? 'done' : ''} key={item}><span>{missionProgress > index ? <Check size={10} /> : String(index + 1).padStart(2, '0')}</span>{item}</div>)}</div><div className="mission-fact"><span>FIELD NOTE</span>{currentChapter.fact}</div><div className="objective-office"><div className="office-glyph"><Landmark size={18} /></div><div><small>{currentChapter.kind === 'story' ? 'NO OFFICE AWARDED' : `PAID CONTEST · ₦${money(currentChapter.contestFee)}`}</small><strong>{currentChapter.office}</strong></div></div><div className="objective-meter"><div><span>MANDATE PREP</span><b>{missionProgress} / 3</b></div><div className="objective-meter-track"><span style={{ width: `${progressPercent}%` }} /></div></div><div className="mission-actions-row">{currentChapter.kind === 'story' ? <button className="primary-action" onClick={continueCareer} disabled={missionProgress < 3}>ADVANCE CHAPTER <ArrowRight size={14} /></button> : <button className="primary-action" onClick={() => runContest()} disabled={missionProgress < 3}>{currentChapter.kind === 'appointment' ? 'ENTER PAID MERIT REVIEW' : currentChapter.kind === 'primary' ? 'ENTER PAID INTERNAL CONTEST' : 'ENTER PAID ELECTION CONTEST'} · ₦{money(currentChapter.contestFee)} <ArrowRight size={14} /></button>}<button className="icon-action" onClick={() => setPage('career')} title="View the full career path"><BookOpen size={16} /></button></div></div>}
        <div className={`stats-panel ${isInstitutional ? 'institutional-stats-panel' : ''}`}><div className="stats-panel-title"><span>{isInstitutional ? 'INSTITUTIONAL STORY RECORD' : 'CAMPAIGN HEALTH'}</span><span className="stats-live"><Activity size={12} /> LIVE</span></div><StatBar label={isInstitutional ? 'COMMUNITY TRUST' : 'PUBLIC TRUST'} value={profile.trust} color="mint" icon={Users} /><StatBar label={isInstitutional ? 'REPUTATION' : 'INFLUENCE'} value={profile.influence} color="blue" icon={TrendingUp} /><StatBar label="INTEGRITY" value={profile.integrity} color="lime" icon={Shield} /><div className={`resource-row ${isInstitutional ? 'single-resource' : ''}`}><div className="resource-box"><div><Zap size={13} /><span>ENERGY</span></div><strong>{profile.energy}<small>/100</small></strong><div className="micro-track"><span style={{ width: `${profile.energy}%` }} /></div></div>{!isInstitutional && <div className="resource-box"><div><Users size={13} /><span>COALITION</span></div><strong>{profile.coalition}<small>/12</small></strong><div className="micro-track coalition"><span style={{ width: `${(profile.coalition / 12) * 100}%` }} /></div></div>}</div><div className="cash-line"><span><Banknote size={13} /> {isInstitutional ? 'STORY FUNDS · FICTIONAL' : 'CAMPAIGN PURSE'}</span><strong>₦{money(profile.cash)}</strong></div>{!isInstitutional && profile.scandals > 0 && <div className="risk-line"><ShieldAlert size={13} /> INTEGRITY RISK · {profile.scandals} OPEN FLAG{profile.scandals === 1 ? '' : 'S'}</div>}</div>
        {isInstitutional ? <InstitutionalStoryActionPanel role={institutionRole} stateName={stateInfo.name} onExplore={openSideStory} onJoinPolitical={requestPoliticalSwitch} /> : <div className="quick-actions-panel"><div className="quick-actions-heading"><div><span className="rail-eyebrow">YOUR NEXT MOVE</span><h3>Story interactions</h3></div><button className="rest-button" onClick={rest} title="Rest to restore energy"><Clock3 size={13} />REST</button></div><div className="action-list">{ACTIONS.map((action) => { const Icon = action.icon; return <button key={action.id} className={`action-row ${action.color}`} onClick={() => startCampaignAction(action.id)} disabled={profile.cash < action.cost || profile.energy < action.energy}><span className="action-icon"><Icon size={16} /></span><span className="action-copy"><strong>{action.label}</strong><small>{action.detail}</small></span><ChevronRight size={15} className="action-chevron" /></button>; })}<button className="action-row consult-action" onClick={openConsultation}><span className="action-icon"><Briefcase size={16} /></span><span className="action-copy"><strong>Consult a senior</strong><small>Listen to what they ask of you</small></span><ChevronRight size={15} className="action-chevron" /></button></div><div className="risk-actions"><button onClick={() => setModal({ type: 'illegal-confirm' })}><Banknote size={13} />Try illicit inducement <span>HIGH RISK</span></button><button onClick={() => setModal({ type: 'legal' })}><Scale size={13} />Open court desk <span>{profile.evidence} FILES</span></button></div></div>}
        <ChatPanel messages={chatMessages} draft={chatDraft} setDraft={setChatDraft} onSend={sendChat} onlineCount={onlineCount} status={networkStatus} stateName={selectedStateName} players={remotePlayers} meetings={availableMeetings} selectedPeer={selectedDmPeer} onSelectPeer={setSelectedDmPeer} dmMessages={dmMessages} dmDraft={dmDraft} setDmDraft={setDmDraft} onSendDm={sendDirectMessage} onInvite={inviteToMeeting} activeMeeting={activeMeeting} meetingPhase={meetingPhase} onEnterMeeting={enterMeetingDiscussion} onFocusMeeting={focusMeetingWorld} onJoinMeeting={joinMeeting} persistenceEnabled={authConfig.persistenceEnabled} accountBacked={Boolean(authSession?.access_token)} />
        <div className="rail-disclaimer"><LockKeyhole size={12} /><span>{isInstitutional ? 'Fictional personnel roleplay · no real employment, appointment, statutory authority or real-money.' : 'Fictional candidate · no real money, electoral registration or real-party affiliation.'}</span></div>
      </aside>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Mobile game navigation">
      <button className={page === 'world' ? 'active' : ''} onClick={openMobileWorld} aria-current={page === 'world' ? 'page' : undefined} aria-label="Live world" title="World"><Globe2 size={18} /><span>World</span></button>
      <button className={page === 'property' ? 'active' : ''} onClick={() => navigateMobile('property')} aria-current={page === 'property' ? 'page' : undefined} aria-label="Home and property upgrades" title="Property"><Home size={18} /><span>Home</span></button>
      <button className={page === 'career' ? 'active' : ''} onClick={() => navigateMobile('career')} aria-current={page === 'career' ? 'page' : undefined} aria-label="Political story and career" title="Story"><TrendingUp size={18} /><span>Story</span></button>
      <button className={page === 'atlas' ? 'active' : ''} onClick={() => navigateMobile('atlas')} aria-current={page === 'atlas' ? 'page' : undefined} aria-label="State atlas" title="Atlas"><Map size={18} /><span>Atlas</span></button>
      <button className={phoneOpen ? 'active' : ''} onClick={() => { if (phoneOpen) closeWorldPanels(); else openPhonePanel(); }} aria-pressed={phoneOpen} aria-label="Phone, messages and meetings" title="Phone"><Smartphone size={18} /><span>Phone</span></button>
    </nav>
    {toast && <div className="toast-pop"><span className="toast-symbol"><Check size={14} /></span>{toast}</div>}
    {activeMeeting && meetingPhase === 'discussion' && <MeetingRoom meeting={activeMeeting} messages={meetingMessages} participants={meetingParticipants} votes={meetingVotes} draft={meetingDraft} setDraft={setMeetingDraft} replyTo={meetingReplyTo} setReplyTo={setMeetingReplyTo} onSend={submitMeetingMessage} onVote={castMeetingVote} onCloseMeeting={closeMeeting} onLeave={dismissMeeting} onMinimize={minimizeMeetingDiscussion} />}
    {onboardingOpen && <WelcomeModal alias={draftAlias} setAlias={setDraftAlias} party={draftParty} setParty={setDraftParty} mode={draftMode} setMode={setDraftMode} institution={draftInstitution} setInstitution={setDraftInstitution} state={draftState} setState={setDraftState} onStart={startCandidate} onClose={() => setOnboardingOpen(false)} hasSave={Boolean(boot?.profile?.started)} authReady={authReady} authConfig={authConfig} authSession={authSession} authBusy={authBusy} onAuth={submitAccount} onSignOut={signOut} onAccountSuccess={(result) => { if (result.save?.profile?.started) restoreCloudSave(result.save); else { startCandidate(); if (result.profileChecked === false) { setAccountProfileReady(false); showToast('Account linked · checking cloud profile before saving; guest fallback remains local.'); } } }} />}
    {modal?.type === 'story-action' && <StoryActionModal scene={CAMPAIGN_SCENES[modal.actionId]} npc={modal.npc} actionLabel={modal.actionId === 'rally' ? 'PUBLISH ADDRESS' : modal.actionId === 'policy' ? 'RECORD POLICY BRIEF' : 'RECORD RESPONSE'} onClose={() => setModal(null)} onComplete={(text, choiceId) => finishStoryAction(modal.actionId, text, choiceId)} />}
    {modal?.type === 'side-story' && <StoryActionModal scene={isInstitutional ? getStorySceneForRole(modal.storyId, institutionRole) : OTHER_SIDE_STORIES.find((story) => story.id === modal.storyId)} title={isInstitutional ? getStorySceneForRole(modal.storyId, institutionRole)?.title : OTHER_SIDE_STORIES.find((story) => story.id === modal.storyId)?.title} classification={isInstitutional ? getStorySceneForRole(modal.storyId, institutionRole)?.classification : OTHER_SIDE_STORIES.find((story) => story.id === modal.storyId)?.classification} isSideStory institutionalRole={isInstitutional ? institutionRole : null} onClose={() => setModal(null)} onComplete={(text, choiceId) => finishSideStory(modal.storyId, text, choiceId)} />}
    {modal?.type === 'account' && <AccountModal authReady={authReady} authConfig={authConfig} authSession={authSession} authBusy={authBusy} alias={profile.alias} onSubmit={submitAccount} onSignOut={signOut} onClose={() => setModal(null)} onSuccess={(result) => { if (result.save?.profile?.started) restoreCloudSave(result.save); else { setAccountProfileReady(result.profileChecked !== false); setModal(null); showToast(result.profileChecked === false ? 'Account connected · cloud profile check is retrying; local progress remains available.' : authConfig.persistenceEnabled ? `Account connected · the current ${isInstitutional ? 'institutional story' : 'political story'} will autosave.` : 'Signed in · database setup is still needed for cloud saves and persistent messages.'); } }} />}
    {modal?.type === 'avatar-customize' && <AvatarCustomizer appearance={playerAppearance} playerColor={playerColor} onClose={() => setModal(null)} onSave={saveAvatarAppearance} />}
    {modal && !['story-action', 'side-story', 'account', 'avatar-customize'].includes(modal.type) && <GameModal modal={modal} onClose={() => setModal(null)} onAcceptMeetingInvite={acceptMeetingInvite} onIllegalConfirm={attemptVoteBuying} onPrepareEvidence={prepareEvidence} onFilePetition={filePetition} onReset={resetGame} onContestConfirm={() => runContest(true)} onJoinPolitical={joinPoliticalLadder} profile={profile} />}
  </div>;
}

function PropertyPage({ profile, homeState, onUpgrade, onVisitHome }) {
  const property = normalizePropertyProfile(profile.property);
  const houseTier = PROPERTY_UPGRADES.house.find((item) => item.level === property.houseLevel + 1);
  const garageTier = PROPERTY_UPGRADES.garage.find((item) => item.level === property.garageLevel + 1);
  const plotTier = PROPERTY_UPGRADES.plots.find((item) => item.level === property.extraPlots + 1);
  const ownedCount = 1 + property.extraPlots;
  const garageSpaces = property.garageLevel >= 4 ? 3 : property.garageLevel === 3 ? 2 : property.garageLevel > 0 ? 1 : 0;
  const cards = [
    { id: 'house', title: 'HOME & ROOMS', icon: Home, level: property.houseLevel, levelText: `LEVEL ${property.houseLevel} / 5`, description: property.houseLevel === 1 ? 'Your free starter home is already yours.' : 'Expand and finish your personal residence.', next: houseTier },
    { id: 'garage', title: 'GARAGE', icon: CarFront, level: property.garageLevel, levelText: property.garageLevel ? `${property.garageLevel} UPGRADE${property.garageLevel > 1 ? 'S' : ''}` : 'NOT BUILT', description: property.garageLevel ? `${garageSpaces} covered vehicle space${garageSpaces > 1 ? 's' : ''} in this demo.` : 'Add secure covered parking to your home.', next: garageTier },
    { id: 'plots', title: 'PROPERTY PLOTS', icon: Building2, level: property.extraPlots, levelText: `${ownedCount} PARCEL${ownedCount > 1 ? 'S' : ''}`, description: property.extraPlots ? 'Your additional fictional lots are part of this save.' : 'Grow your property portfolio with additional lots.', next: plotTier },
  ];
  return <main className="property-page">
    <div className="property-hero">
      <div className="property-hero-copy"><span className="property-kicker"><Home size={13} /> PLAYER PROPERTY · FICTIONAL GAME ASSETS</span><h1>{profile.alias || 'Your character'}’s home</h1><p>A starter residence is included for every player. Build its rooms, garage and surrounding plots with fictional in-game funds.</p><div className="property-hero-tags"><span><Shield size={12} /> OWNED BY THIS CHARACTER</span><span><MapPin size={12} /> {homeState}</span><span><Wallet size={12} /> ₦{money(profile.cash)} AVAILABLE</span></div></div>
      <div className="property-hero-art" aria-hidden="true"><div className="property-art-sky" /><div className="property-art-home"><span className="property-art-roof" /><span className="property-art-wall" /><span className="property-art-window one" /><span className="property-art-window two" /><span className="property-art-door" /><span className="property-art-garage" /></div><div className="property-art-yard" /><div className="property-art-tree" /></div>
      <button type="button" className="property-visit-button" onClick={onVisitHome}>VISIT MY HOME IN 3D <ArrowRight size={14} /></button>
    </div>
    <div className="property-summary-row"><div><span>OWNED PROPERTY</span><strong>{ownedCount}</strong></div><div><span>HOUSE TIER</span><strong>{property.houseLevel}<small> / 5</small></strong></div><div><span>GARAGE</span><strong>{garageSpaces ? <>{garageSpaces}<small> bays</small></> : '—'}</strong></div><div><span>HOME STATE</span><strong>{homeState}</strong></div></div>
    <div className="property-section-heading"><div><span className="eyebrow-line" />UPGRADE YOUR PLACE</div><small>All purchases use fictional funds only</small></div>
    <div className="property-upgrade-grid">{cards.map((card) => { const Icon = card.icon; const canAfford = Boolean(card.next && profile.cash >= card.next.cost); return <section className="property-upgrade-card" key={card.id}>
      <div className="property-upgrade-top"><span className={`property-upgrade-icon property-${card.id}`}><Icon size={18} /></span><span className="property-level-chip">{card.levelText}</span></div>
      <h2>{card.title}</h2><p>{card.description}</p>
      {card.next ? <><div className="property-next-tier"><strong>{card.next.label}</strong><span>{card.next.detail}</span></div><button type="button" className="property-upgrade-button" onClick={() => onUpgrade(card.id)} disabled={!canAfford}><span>{canAfford ? 'UPGRADE' : 'NEED MORE FUNDS'}</span><b>₦{money(card.next.cost)}</b><ArrowRight size={14} /></button></> : <div className="property-complete-chip"><Check size={13} /> MAXIMUM DEMO TIER REACHED</div>}
    </section>; })}</div>
    <div className="property-note"><PackagePlus size={15} /><span><strong>YOUR PROPERTY SAVE</strong> House and garage upgrades are saved with this game profile on this device. Cloud persistence depends on account setup. This is a fictional open-world simulation, not real estate, a real deed, or a financial product.</span></div>
  </main>;
}

function InstitutionalRolePanel({ role }) {
  return <section className="institution-role-card">
    <div className="mission-card-top"><span>FICTIONAL PERSONNEL STORY</span><span>NO OFFICE LADDER</span></div>
    <div className="institution-role-card-title"><span>{role.id === 'judiciary' ? <Scale size={19} /> : role.id === 'cbn' ? <Banknote size={19} /> : <Landmark size={19} />}</span><div><h3>{role.personnelLabel}</h3><small>{role.agency}</small></div></div>
    <p>{role.description}</p>
    <div className="institution-role-boundary"><Shield size={13} /><span>Fictional story perspective only—not real employment, appointment, agency powers, judicial authority or an elected position.</span></div>
  </section>;
}

function InstitutionalStoryActionPanel({ role, stateName, onExplore, onJoinPolitical }) {
  const stories = getInstitutionStoryIds(role.id, stateName).map((id) => OTHER_SIDE_STORIES.find((story) => story.id === id)).filter(Boolean);
  return <div className="quick-actions-panel institution-quick-actions"><div className="quick-actions-heading"><div><span className="rail-eyebrow">YOUR NEXT MOVE</span><h3>Institutional story scenes</h3></div></div><div className="institution-story-link-list">{stories.map((story) => <button key={story.id} className="institution-story-link" onClick={() => onExplore(story.id)}><span><small>{story.classification}</small><strong>{story.title}</strong></span><ChevronRight size={15} /></button>)}</div><button className="institution-switch-button" onClick={onJoinPolitical}>OPTIONALLY JOIN ONE REGISTERED PARTY <ArrowRight size={13} /></button><div className="institution-switch-note">Switching starts chapter 1 of the existing political ladder. It grants no office; all political positions remain paid contests.</div></div>;
}

function StatBar({ label, value, color, icon: Icon }) {
  return <div className={`stat-row ${color}`}><div className="stat-row-label"><span><Icon size={13} />{label}</span><b>{value}<small>%</small></b></div><div className="stat-track"><span style={{ width: `${value}%` }} /></div></div>;
}

function LocalityExplorer({ stateInfo, stateWorldProfile, data, loading, error, lgaName, selectedWardKey, onSelectLga, onSelectWard, rootId = 'locality-explorer' }) {
  const [wardQuery, setWardQuery] = useState('');
  const lga = data?.lgas?.find((item) => item.name === lgaName) || null;
  const wards = lga?.wards || [];
  const selectedWard = wards.find((item) => wardKey(item) === selectedWardKey) || null;
  const filteredWards = wards.filter((item) => !wardQuery.trim() || item.name.toLowerCase().includes(wardQuery.trim().toLowerCase()));
  useEffect(() => setWardQuery(''), [lgaName]);

  return <section id={rootId} className="locality-explorer" aria-label="State, local government and ward explorer">
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
        <div className="locality-active-pin"><MapPin size={16} /></div><div className="locality-active-copy"><small>SELECTED WARD · APPROXIMATE MAP CENTER</small><strong>{selectedWard ? selectedWard.name : 'Select a ward'}<span> · </span>{lga?.name || 'LGA'}</strong><span>{stateInfo.name} · {selectedWard ? `approx. ${selectedWard.lat.toFixed(4)}° N, ${selectedWard.lon.toFixed(4)}° E` : 'Representative point not available'}</span></div>
        <button disabled={!selectedWard} onClick={() => selectedWard && onSelectWard(wardKey(selectedWard))}><MapPin size={13} />REVISIT IN 3D</button>
      </div>
      <div className="ward-directory-heading"><div><span className="eyebrow-line" />WARD DIRECTORY <b>{filteredWards.length}</b></div><label className="ward-search"><Search size={13} /><input value={wardQuery} onChange={(event) => setWardQuery(event.target.value)} placeholder="Filter wards in this LGA" /></label></div>
      {filteredWards.length ? <div className="ward-chip-grid">{filteredWards.map((ward, index) => {
        const key = wardKey(ward);
        const active = key === selectedWardKey;
        return <button key={key} className={`ward-chip ${active ? 'active' : ''}`} onClick={() => onSelectWard(key)} aria-label={`Travel to ${ward.name} ward, ${lga.name}`} title={`Open ${ward.name} in the 3D world`}><span className="ward-chip-index">{String(index + 1).padStart(2, '0')}</span><strong>{ward.name}</strong><small>{active ? 'CURRENT 3D LOCATION' : 'VISIT THIS WARD'}</small><ArrowRight size={13} /></button>;
      })}</div> : <div className="locality-empty">No wards match that filter.</div>}
      <div className="locality-data-note"><span>GEOGRAPHIC DATA NOTE</span><p>Ward coordinates are approximate representative points, not ward boundaries or surveyed addresses. LIVE MAP uses OpenFreeMap vector tiles based on OpenStreetMap; road, building-height and landmark coverage varies by locality. The separate 3D Story World is procedural art, not a surveyed model.</p></div>
    </>}
  </section>;
}

function PartyDirectory({ parties, branches, activeParty, stateInfo, locality, onEnter }) {
  const [query, setQuery] = useState('');
  const [expandedParty, setExpandedParty] = useState(activeParty?.id || '');
  const search = query.trim().toLowerCase();
  const visibleParties = parties.filter((item) => `${item.tag} ${item.name}`.toLowerCase().includes(search));
  const locationLabel = locality ? `${locality.ward} · ${locality.lga} LGA · ${stateInfo.name}` : `Capital district · ${stateInfo.name}`;
  const checked = PARTY_REGISTER_CHECKED_AT.split('-').reverse().join(' ');
  return <section className="party-directory" aria-label="INEC registered party and branch directory">
    <div className="party-directory-head"><div><div className="eyebrow"><span className="eyebrow-line" />INEC REGISTER · {checked}</div><h2>One branded ward office for every party.</h2><p>The 22 registered-party records, acronyms, logos and published national chair/secretary fields below are copied from INEC’s register. The visible local office row and local executives are fictional game constructs—not claims about real-world premises or village officers.</p></div><div className="party-directory-count"><b>{visibleParties.length}</b><span>PARTIES<br />IN VIEW</span></div></div>
    <div className="party-directory-tools"><label className="party-directory-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find party by acronym or name" aria-label="Search INEC-registered parties" /></label><a href={PARTY_REGISTER_SOURCE} target="_blank" rel="noreferrer">OPEN OFFICIAL INEC REGISTER <ArrowRight size={12} /></a></div>
    <div className="party-directory-grid">{visibleParties.map((item) => {
      const branch = branches[item.id] || [];
      const expanded = expandedParty === item.id;
      const chosen = activeParty?.id === item.id;
      return <article className={`party-directory-card ${chosen ? 'player-party' : ''} ${expanded ? 'expanded' : ''}`} key={item.id} style={{ '--party-color': item.color }}>
        <div className="party-directory-card-head"><img src={item.logo} alt={`${item.tag} official party logo`} loading="lazy" /><div className="party-directory-party-name"><span>{item.tag} · INEC REGISTERED</span><strong>{item.name}</strong></div>{chosen && <span className="player-party-tag">YOUR PARTY</span>}</div>
        <div className="national-officer-list"><div><span>NATIONAL CHAIRPERSON · INEC SNAPSHOT</span><b>{item.chair || 'Not listed in this snapshot'}</b></div><div><span>NATIONAL SECRETARY · INEC SNAPSHOT</span><b>{item.secretary || 'Not listed in this snapshot'}</b></div></div>
        <div className="party-locality-row"><MapPin size={12} /><span>SIMULATED BRANCH · {locationLabel}</span></div>
        <div className="party-directory-actions"><button type="button" className="party-executive-toggle" onClick={() => setExpandedParty(expanded ? '' : item.id)} aria-expanded={expanded}>{expanded ? 'HIDE' : 'VIEW'} LOCAL EXECUTIVES <ChevronDown size={13} /></button><button type="button" className="party-office-enter" onClick={() => onEnter(item.id)}>ENTER 3D OFFICE <ArrowRight size={13} /></button></div>
        {expanded && <div className="party-local-roster"><div className="party-roster-warning"><Shield size={13} /><span>FICTIONAL DISPLAY-ONLY ROSTER · generated for gameplay · not verified by INEC or a contest result</span></div>{branch.map((person) => <div className="party-local-executive" key={person.id}><span>{person.position}</span><b>{person.name}</b></div>)}</div>}
        <a className="party-inec-profile" href={item.inecUrl || PARTY_REGISTER_SOURCE} target="_blank" rel="noreferrer">INEC PARTY PROFILE <ArrowRight size={11} /></a>
      </article>;
    })}</div>
    {!visibleParties.length && <div className="party-directory-empty">No INEC register entry matches that search.</div>}
    <div className="party-directory-source-note"><InfoDot /><span>Register data snapshot checked {checked}. INEC registration/recognition is not a guarantee that a party or candidate will appear on the final 2027 ballot; candidate eligibility and filings are separate processes. The local branches here are simulated only.</span></div>
  </section>;
}

function WorldPage({ stateInfo, profile, playerId, meetingSlot, meetingParticipants, meetingPhase, onMeetingArrival, onEnterMeeting, stateWorldProfile, venue, venueName, focusRequest, locationKey, locality, localityData, localityLoading, localityError, selectedLgaName, selectedWardKey, onSelectLga, onSelectWard, onSelectVenue, remotePlayers, onMove, playerColor, playerAppearance, onlineCount, networkStatus, onTravel, daysToFederal, daysToState, storyDay, worldMinute, activeMeeting, meetingMessages, currentParty, institutionRole, isInstitutional, chapter, missionProgress, onOpenCareer, onOpenPhone, onNavigate, onOpenAvatar, onExploreSideStory, onJoinPolitical, onRequestExecutiveAudience, onOfficeActivity, flightCommand, onStartFlight, onFlightComplete }) {
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [worldView, setWorldView] = useState('story');
  const [worldPanel, setWorldPanel] = useState(null);
  const [interiorInfo, setInteriorInfo] = useState(null);
  const [interiorMenuOpen, setInteriorMenuOpen] = useState(false);
  const [interiorActionStatus, setInteriorActionStatus] = useState('');
  const [isSeatedInOffice, setIsSeatedInOffice] = useState(false);
  const [executiveAudience, setExecutiveAudience] = useState(null);
  const [audienceDraft, setAudienceDraft] = useState('');
  const [interiorActivity, setInteriorActivity] = useState(null);
  const [interiorActivityDraft, setInteriorActivityDraft] = useState('');
  const [flightPanelOpen, setFlightPanelOpen] = useState(false);
  const [flightClass, setFlightClass] = useState('economy');
  const [flightDestination, setFlightDestination] = useState(() => STATES.find((item) => item.name !== stateInfo.name)?.name || stateInfo.name);
  const [flightStatus, setFlightStatus] = useState(null);
  const planeBoardActionRef = useRef(null);
  const partyOfficeActionRef = useRef(null);
  const exitInteriorActionRef = useRef(null);
  const executiveFocusActionRef = useRef(null);
  const minimapMarkerRef = useRef(null);
  const minimapUpdateAtRef = useRef(0);
  const localPartyBranches = createLocalPartyBranches(PARTY_OPTIONS, { state: stateInfo.name, lga: locality?.lga || stateInfo.capital, ward: locality?.ward || 'Capital District', reservedNames: NPCS.map((person) => person.name) });
  const localityVisual = createLocalityVisualProfile(stateInfo, stateWorldProfile, locality);
  const handleInteriorChange = (nextInterior) => {
    setInteriorInfo(nextInterior);
    if (nextInterior?.metadata?.venueType === 'plane') {
      setFlightClass(nextInterior.metadata.cabinClass || 'economy');
      setFlightPanelOpen(false);
    }
    if (nextInterior?.metadata?.venueType === 'airport' && flightDestination === stateInfo.name) {
      setFlightDestination(STATES.find((item) => item.name !== stateInfo.name)?.name || stateInfo.name);
    }
    if (!nextInterior) {
      setFlightPanelOpen(false);
      setInteriorMenuOpen(false);
      setInteriorActionStatus('');
      setIsSeatedInOffice(false);
      setExecutiveAudience(null);
      setAudienceDraft('');
      setInteriorActivity(null);
      setInteriorActivityDraft('');
    }
  };
  const handleInteriorAction = (action = {}) => {
    if (action.type === 'seated') {
      setIsSeatedInOffice(true);
      setInteriorActionStatus(`Seated · ${action.seatLabel || 'visitor chair'}`);
    } else if (action.type === 'stood-up') {
      setIsSeatedInOffice(false);
      setInteriorActionStatus('Standing · tap a chair to sit');
    } else if (action.type === 'executive-ready' && action.executive?.id) {
      setInteriorMenuOpen(false);
      setInteriorActionStatus(`At ${action.executive.name}’s desk`);
      setExecutiveAudience({ phase: 'request', executive: action.executive, messages: [] });
      setAudienceDraft('');
    } else if (action.type === 'activity-ready' && action.activity?.id) {
      setInteriorMenuOpen(false);
      setInteriorActivity({ ...action.activity, recordType: '' });
      setInteriorActivityDraft('');
    }
  };
  const handleFlightPhase = (status) => setFlightStatus(status);
  const handleFlightArrival = (request) => {
    setFlightStatus(null);
    setFlightPanelOpen(false);
    onFlightComplete?.(request);
  };
  const executiveReply = (executive, body, turn = 0) => {
    const text = String(body || '').toLowerCase();
    const topic = /road|water|drain|power|electric|school|clinic|health|security|market|transport/.test(text)
      ? 'Let us make the next step specific: which street or service point should the ward office review first?'
      : /budget|money|fund|account|transparent|record|report/.test(text)
        ? 'A clear record matters. Bring the figures and the people affected; our fictional team can set a public follow-up.'
        : /party|policy|campaign|candidate|election|vote/.test(text)
          ? 'Keep the discussion open to different residents. The branch should explain its position and invite practical alternatives.'
          : 'Thank you for raising that. Let us note who is affected, what evidence is available, and one realistic next action.';
    return `${turn % 2 ? 'I appreciate the follow-up. ' : ''}${topic}`;
  };
  const submitExecutiveAudienceRequest = (event) => {
    event?.preventDefault?.();
    const executive = executiveAudience?.executive;
    const subject = audienceDraft.trim().slice(0, 260);
    if (!executive || !subject) return;
    onRequestExecutiveAudience?.({ executive, officeTitle: interiorInfo?.title || 'Simulated ward office', subject });
    const response = `${executive.name}: Your request is accepted for a brief, fictional in-office audience. ${executiveReply(executive, subject)}`;
    setExecutiveAudience({ phase: 'conversation', executive, subject, messages: [
      { id: `player-${Date.now()}`, speaker: 'YOU', body: subject },
      { id: `npc-${Date.now() + 1}`, speaker: executive.name, body: response },
    ] });
    setAudienceDraft('');
  };
  const sendExecutiveAudienceMessage = (event) => {
    event?.preventDefault?.();
    const body = audienceDraft.trim().slice(0, 260);
    if (!body || !executiveAudience?.executive) return;
    const executive = executiveAudience.executive;
    const turn = executiveAudience.messages.filter((message) => message.speaker === 'YOU').length;
    const timestamp = Date.now();
    setExecutiveAudience((current) => current ? ({
      ...current,
      messages: [...current.messages,
        { id: `player-${timestamp}`, speaker: 'YOU', body },
        { id: `npc-${timestamp + 1}`, speaker: executive.name, body: executiveReply(executive, body, turn) },
      ].slice(-14),
    }) : current);
    setAudienceDraft('');
  };
  const finishInteriorActivity = (recordType = '') => {
    if (!interiorActivity) return;
    onOfficeActivity?.({ activity: interiorActivity, officeTitle: interiorInfo?.title || 'Simulated ward office', note: interiorActivityDraft.trim().slice(0, 220), recordType });
    setInteriorActivity(null);
    setInteriorActivityDraft('');
  };
  const dismissInteriorActivity = () => {
    setInteriorActivity(null);
    setInteriorActivityDraft('');
  };
  const endExecutiveAudience = () => {
    const name = executiveAudience?.executive?.name;
    setExecutiveAudience(null);
    setInteriorActionStatus(name ? `Audience ended · ${name}` : 'Standing · tap a chair to sit');
  };
  const enterPartyOffice = (partyId) => {
    if (worldView === 'story') partyOfficeActionRef.current?.(partyId);
    else {
      setWorldView('story');
      window.setTimeout(() => partyOfficeActionRef.current?.(partyId), 220);
    }
  };
  const venueTypes = ['ALL', 'PUBLIC', 'POLITICS', 'TRAVEL', 'HOME'];
  const safeMinute = ((Number(worldMinute) || 0) % 1440 + 1440) % 1440;
  const clockHour = Math.floor(safeMinute / 60);
  const clockMinute = safeMinute % 60;
  const worldClock = `${String(clockHour).padStart(2, '0')}:${String(clockMinute).padStart(2, '0')}`;
  const timePhase = clockHour >= 5 && clockHour < 7 ? 'DAWN' : clockHour >= 7 && clockHour < 16 ? 'DAYLIGHT' : clockHour >= 16 && clockHour < 19 ? 'GOLDEN HOUR' : 'NIGHT';
  const handlePlayerMove = (position) => {
    onMove(position);
    const now = Date.now();
    if (!minimapMarkerRef.current || now - minimapUpdateAtRef.current < 220) return;
    minimapUpdateAtRef.current = now;
    const x = 75 + clamp((Number(position.x) || 0) / 24, -1, 1) * 48;
    const y = 51 + clamp((Number(position.z) || 0) / 33, -1, 1) * 36;
    const heading = ((Number(position.heading) || 0) * (180 / Math.PI)) + 180;
    minimapMarkerRef.current.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${heading.toFixed(1)})`);
  };
  const visibleVenues = WORLD_VENUES.filter((item) => venueFilter === 'ALL' || (venueFilter === 'PUBLIC' && ['square', 'market', 'stadium'].includes(item.type)) || (venueFilter === 'POLITICS' && ['office', 'court', 'assembly', 'caucus'].includes(item.type)) || (venueFilter === 'TRAVEL' && item.type === 'airport') || (venueFilter === 'HOME' && item.type === 'home'));
  const interiorKind = interiorInfo?.metadata?.venueType || interiorInfo?.type;
  const interiorKindLabel = ({ airport: 'AIRPORT TERMINAL', plane: 'AIRCRAFT CABIN', home: 'PLAYER RESIDENCE', garage: 'HOME GARAGE', market: 'COMMUNITY MARKET', court: 'ELECTION PETITION COURT', assembly: 'STATE ASSEMBLY CHAMBER', office: 'PUBLIC INSTITUTION', square: 'CIVIC MEETING HALL', caucus: 'PARTY & CAUCUS HOUSE', stadium: 'UNITY STADIUM', vehicle: 'NIGERIAN VEHICLE' })[interiorKind] || `${interiorKind || 'COMMUNITY'} INTERIOR`;
  const interiorKindDescription = ({ airport: 'Fictional state-capital airport terminal. Choose a destination, select your cabin class, and board one of the parked aircraft.', plane: 'Clean, enclosed aircraft cabin for this fictional fare class. Use the flight-plan control to choose a Nigerian state and depart.', home: 'This is your fictional starter residence. Your house tier, garage and property plots come from your character save.', garage: 'Your fictional home garage and workshop. Upgrades are purchased in Home & Property with in-game funds.', market: 'A simulated indoor market with produce, textiles and several independent stalls; no single trader speaks for everyone.', court: 'A fictional courtroom built for learning about evidence, deadlines and lawful petitions. No real case or court is represented.', assembly: 'A fictional legislative chamber for roleplay, oversight and public-hearing scenes; it is not an official session.', office: 'A simulated, non-partisan public-service interior. Game encounters do not represent real appointments or official decisions.', square: 'An enclosed community meeting hall for open-ended fictional gatherings and dialogue.', caucus: 'A fictional caucus and consultation venue for your political story.', stadium: 'A standard fictional stadium bowl with stands, aisles and visible fans.' })[interiorKind] || 'A fictional, enclosed venue interior built for exploration and open-ended gameplay.';
  const isAirportInterior = interiorKind === 'airport';
  const isPlaneInterior = interiorKind === 'plane';
  const activeFlightClass = FLIGHT_CLASSES.find((item) => item.id === flightClass) || FLIGHT_CLASSES[0];
  const arrivedMeetingPlayers = (meetingParticipants || []).filter((person) => ['at-venue', 'in-session'].includes(person.meetingStatus)).length;
  const travellingMeetingPlayers = (meetingParticipants || []).filter((person) => person.meetingStatus === 'en-route').length;
  const interestedMeetingPlayers = Math.max((meetingParticipants || []).length, Number(activeMeeting?.interested || activeMeeting?.participants) || 0);
  useEffect(() => { if (activeMeeting?.id && ['en-route', 'at-venue', 'discussion'].includes(meetingPhase)) setWorldView('story'); }, [activeMeeting?.id, meetingPhase]);
  useEffect(() => {
    if (!worldPanel) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setWorldPanel(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [worldPanel]);
  return <div className={`world-page ${interiorInfo ? 'interior-active' : ''}`}>
    <div className="mobile-world-status" aria-label="Live story and player status">
      <div className="mobile-status-item mobile-status-clock"><Clock3 size={14} /><span><b>{worldClock} WAT</b><small>{dateLabel(storyDay)} · {timePhase}</small></span></div>
      <div className="mobile-status-item mobile-status-trust"><Activity size={14} /><span><b>{isInstitutional ? 'REPUTATION' : 'PUBLIC TRUST'}</b><small>{profile?.trust ?? 0}% · {profile?.integrity ?? 0}% integrity</small></span></div>
      <div className="mobile-status-item mobile-status-election"><Radio size={14} /><span><b>{Number.isFinite(daysToFederal) ? Math.max(0, daysToFederal) : '—'}d FED · {Number.isFinite(daysToState) ? Math.max(0, daysToState) : '—'}d STATE</b><small>16 JAN / 06 FEB 2027 · ELECTIONS</small></span></div>
      <div className="mobile-status-item mobile-status-network"><Users size={14} /><span><b>{networkStatus === 'online' ? `${onlineCount || 1} PLAYERS` : 'LOCAL PLAY'}</b><small>{networkStatus === 'online' ? 'WORLD LINK ACTIVE' : 'GUEST PREVIEW'}</small></span></div>
    </div>
    <div className="mobile-world-shortcuts" aria-label="Quick world actions">
      <button type="button" className={worldView === 'story' ? 'active' : ''} onClick={() => setWorldView('story')} disabled={Boolean(flightCommand)} aria-label="Return to 3D story view" title="3D Story"><Move size={17} /><span>WALK</span></button>
      <button type="button" className={worldView === 'map' ? 'active' : ''} onClick={() => setWorldView('map')} aria-label="Open live map" title="Live map"><Map size={17} /><span>LIVE MAP</span></button>
      <button type="button" onClick={() => setWorldPanel('places')} aria-label="Browse places in the world" title="Places"><Landmark size={17} /><span>PLACES</span></button>
      {!institutionRole && <button type="button" onClick={() => setWorldPanel('parties')} aria-label="Open registered party directory" title="INEC party directory"><Flag size={17} /><span>PARTIES</span></button>}
      <button type="button" onClick={() => onNavigate('civic')} aria-label="Open civic research" title="Civic desk"><Scale size={17} /><span>CIVIC</span></button>
      <button type="button" onClick={onOpenPhone} aria-label="Open phone, chat and meetings" title="Phone and meetings"><Smartphone size={17} /><span>PHONE</span></button>
    </div>
    <div className="mobile-location-strip">
      <div className="mobile-location-name"><MapPin size={16} /><span><b>{locality?.ward || stateInfo.capital}</b><small>{locality ? `${locality.lga} LGA · ` : ''}{stateInfo.name}</small></span></div>
      <button type="button" onClick={() => onNavigate('atlas')} aria-label="Open state atlas" title="State atlas"><Map size={13} /><span>ATLAS</span></button>
      <button type="button" onClick={() => setWorldPanel('wards')} aria-label="Browse ward directory" title="Ward directory"><Users size={13} /><span>WARD LIST</span></button>
    </div>
    <div className="world-live-clock" aria-label={`World time ${worldClock} WAT, ${timePhase}; ${networkStatus === 'online' ? `${onlineCount || 1} players online` : 'local play'}`}>
      <span className="world-clock-icon"><Clock3 size={13} /></span><span className="world-clock-copy"><strong>{worldClock} WAT</strong><small>{dateLabel(storyDay)} · {timePhase}</small></span><i className={`network-led ${networkStatus}`} /><span className="world-clock-network">{networkStatus === 'online' ? `${onlineCount || 1} IN WORLD` : 'LOCAL PLAY'}</span>
    </div>
    <div className="mobile-world-ticker">
      <span className={activeMeeting ? 'ticker-live meeting-live' : 'ticker-live'}><i />{activeMeeting ? activeMeeting.status === 'closed' ? 'MEETING RECORD' : ['at-venue', 'discussion'].includes(meetingPhase) ? 'AT VENUE' : 'MEETING · EN ROUTE' : isInstitutional ? 'STORY UPDATE' : 'MISSION'}</span>
      <strong>{activeMeeting?.title || chapter?.title || 'Continue your public-life story'}</strong>
      {activeMeeting && <small className="mobile-meeting-count">{arrivedMeetingPlayers}/{interestedMeetingPlayers} HERE</small>}
      <button type="button" onClick={activeMeeting ? onEnterMeeting : onOpenCareer} disabled={Boolean(activeMeeting?.status === 'open' && !['at-venue', 'discussion'].includes(meetingPhase))}>{activeMeeting ? activeMeeting.status === 'closed' ? 'RECORD' : ['at-venue', 'discussion'].includes(meetingPhase) ? 'DISCUSS' : 'WALKING' : 'OPEN'} <ArrowRight size={12} /></button>
    </div>
    <div className="world-topline"><div className="world-live"><span className="pulse-dot" />LOCAL WORLD <b>{(locality?.ward || stateInfo.capital).toUpperCase()}</b><span className="line-sep" />{stateInfo.zone.toUpperCase()}</div><div className={`world-date world-time-${timePhase.toLowerCase().replace(' ', '-')}`}><Clock3 size={13} />{dateLabel(storyDay)} <span>·</span> {worldClock} WAT <span className="weather-dot" /> {timePhase}</div><div className="world-connect"><span className={`network-led ${networkStatus}`} />{networkStatus === 'online' ? `${onlineCount || 1} PLAYERS` : 'LOCAL INSTANCE'}</div><div className="world-mode-tabs" role="tablist" aria-label="Choose map view"><button type="button" role="tab" aria-selected={worldView === 'story'} className={worldView === 'story' ? 'active' : ''} onClick={() => setWorldView('story')}><Move size={12} />3D STORY</button><button type="button" role="tab" aria-selected={worldView === 'map'} className={worldView === 'map' ? 'active' : ''} onClick={() => setWorldView('map')}><Map size={12} />LIVE MAP</button></div></div>
    <div className={`world-view-frame ${worldView === 'map' ? 'map-mode' : ''} ${interiorInfo ? 'inside-interior' : ''}`}>
      {worldView === 'map' ? <Suspense fallback={<div className="maplibre-load-shell"><span className="maplibre-spinner" />Loading MapLibre…</div>}><MapLibreWorld stateInfo={stateInfo} locality={locality} locationKey={locationKey} /></Suspense> : <>
      <World state={stateInfo.name} locality={locality} locationKey={locationKey} selectedVenueId={venue.id} focusRequest={focusRequest} onVenueSelect={onSelectVenue} onMove={handlePlayerMove} remotePlayers={remotePlayers} playerColor={playerColor} playerAppearance={playerAppearance} propertyProfile={profile.property} propertyOwner={profile.alias} worldMinute={safeMinute} meeting={activeMeeting} meetingMessages={meetingMessages} meetingParticipants={meetingParticipants} meetingPhase={meetingPhase} meetingSlot={meetingSlot} playerId={playerId} onMeetingArrival={onMeetingArrival} partyOfficeActionRef={partyOfficeActionRef} planeBoardActionRef={planeBoardActionRef} exitInteriorActionRef={exitInteriorActionRef} executiveFocusRef={executiveFocusActionRef} flightCommand={flightCommand} onFlightPhase={handleFlightPhase} onFlightComplete={handleFlightArrival} onInteriorChange={handleInteriorChange} onInteriorAction={handleInteriorAction} /><div className="scene-vignette" />
      <div className={`scene-mission-card ${isInstitutional ? 'institutional-mission-hud' : ''}`}>
        <div className="scene-mission-head"><span><i />{activeMeeting ? activeMeeting.status === 'closed' ? 'MEETING RECORD' : ['at-venue', 'discussion'].includes(meetingPhase) ? 'GATHERED AT VENUE' : 'PLAYERS ON THE WAY' : isInstitutional ? 'FICTIONAL ROLEPLAY' : 'ACTIVE MISSION'}</span><b>{activeMeeting ? `${arrivedMeetingPlayers}/${interestedMeetingPlayers} HERE` : isInstitutional ? 'STORY' : `${missionProgress}/3`}</b></div>
        <strong>{activeMeeting?.title || (isInstitutional ? institutionRole?.personnelLabel || 'Institutional story' : chapter?.title || 'Continue your story')}</strong>
        <p>{activeMeeting?.topic || (isInstitutional ? 'Explore a fictional institution story. No employment, appointment or separate office ladder.' : missionProgress >= 3 ? 'Preparations complete. Review the chapter and continue when you are ready.' : chapter?.objectives?.[missionProgress] || chapter?.goal || 'Move through the district and meet your next contact.')}</p>
        {!isInstitutional && <div className="scene-mission-meter"><span style={{ width: `${Math.min(100, (missionProgress / 3) * 100)}%` }} /></div>}
        <button type="button" onClick={activeMeeting ? onEnterMeeting : onOpenCareer} disabled={Boolean(activeMeeting?.status === 'open' && !['at-venue', 'discussion'].includes(meetingPhase))}>{activeMeeting ? activeMeeting.status === 'closed' ? 'VIEW MEETING RECORD' : ['at-venue', 'discussion'].includes(meetingPhase) ? 'OPEN DISCUSSION' : 'GATHERING IN WORLD' : isInstitutional ? 'OPEN STORY RECORD' : 'OPEN MISSION FILE'} <ArrowRight size={12} /></button>
      </div>{interiorInfo && <div className={`interior-overlay ${interiorMenuOpen ? 'is-open' : ''}`}>
        <div className="interior-quickbar" role="toolbar" aria-label="Interior controls">
          <button type="button" className="interior-quick-button" onClick={() => setInteriorMenuOpen((open) => !open)} aria-expanded={interiorMenuOpen} aria-label={interiorMenuOpen ? 'Close interior details' : 'Open interior details and interactions'} title="Interior details and interactions"><CircleHelp size={15} /></button>
          {(isAirportInterior || isPlaneInterior) && <button type="button" className="interior-quick-button flight-quick-button" onClick={() => setFlightPanelOpen((open) => !open)} aria-expanded={flightPanelOpen} aria-label="Open flight plan" title="Flight plan and cabin options"><Plane size={15} /></button>}
          <button type="button" className="interior-quick-button interior-exit-icon" onClick={() => exitInteriorActionRef.current?.()} aria-label="Exit interior" title="Exit interior"><X size={15} /></button>
        </div>
        {interiorMenuOpen && <section className="interior-details-panel" aria-label="Interior details and interactions">
          <div className="interior-overlay-top"><div><div className="interior-kicker"><i />{interiorInfo.type === 'party-office' ? 'SIMULATED PARTY BRANCH' : interiorKindLabel}</div><h3>{interiorInfo.title}</h3><p className="interior-locality">{locality ? `${locality.ward} ward · ${locality.lga} LGA · ${stateInfo.name}` : `${stateInfo.capital} · ${stateInfo.name}`}</p></div><button type="button" onClick={() => setInteriorMenuOpen(false)} aria-label="Close interior details"><X size={13} /></button></div>
          {interiorInfo.party && <><div className="interior-party-brand"><img src={interiorInfo.party.logo} alt="" /><span><b>{interiorInfo.party.name} ({interiorInfo.party.tag})</b><small>REGISTERED PARTY · NATIONAL DATA FROM INEC</small></span></div><div className="interior-register-note"><strong>INEC REGISTER SNAPSHOT · {interiorInfo.nationalOfficers?.checkedAt}</strong><span>National officers are shown separately from the fictional ward branch below.</span><a href={interiorInfo.nationalOfficers?.source} target="_blank" rel="noreferrer">Open official INEC party register</a></div><div className="interior-national-roster"><span>NATIONAL CHAIR<b>{interiorInfo.nationalOfficers?.chair || 'Not listed in snapshot'}</b></span><span>NATIONAL SECRETARY<b>{interiorInfo.nationalOfficers?.secretary || 'Not listed in snapshot'}</b></span></div><div className="interior-fiction-heading"><span>WARD EXECUTIVE TEAM</span><b>SIMULATED · FICTIONAL</b></div><div className="interior-executive-list">{(interiorInfo.branch || []).map((person) => <button key={person.id} type="button" onClick={() => { setInteriorMenuOpen(false); executiveFocusActionRef.current?.(person.id); }} aria-label={`Walk to ${person.position}, ${person.name}, and request a meeting`}><span>{person.position}</span><b>{person.name}</b><i>MEET</i></button>)}</div></>}
          <div className="interior-room-help"><span className="interior-seat-indicator">{isSeatedInOffice ? <Check size={12} /> : <Move size={12} />}</span><div><b>{interiorActionStatus || (interiorInfo.type === 'party-office' ? 'TAP A VISITOR CHAIR TO SIT' : 'TAP A CHAIR TO SIT')}</b><small>Tap a chair to sit · tap the floor to stand and walk{interiorInfo.type === 'party-office' ? ' · tap an executive to request an audience · use the board, files or water station for activities.' : '.'}</small></div></div>
          <div className="interior-description">{interiorInfo.type === 'party-office' ? 'This ward office and its local officers are generated for gameplay; they are not verified real premises or real officials.' : interiorKindDescription}</div>
          <button className="interior-exit-button" type="button" onClick={() => exitInteriorActionRef.current?.()}>EXIT TO STREET <span>TAP</span></button>
        </section>}
      </div>}
      {flightPanelOpen && (isAirportInterior || isPlaneInterior) && <div className="flight-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFlightPanelOpen(false); }}><section className="flight-panel-card" role="dialog" aria-modal="true" aria-labelledby="flight-panel-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flight-panel-head"><span className="flight-panel-icon"><Plane size={17} /></span><div><small>{isAirportInterior ? 'AIRPORT CHECK-IN · FICTIONAL FARES' : 'ONBOARD AIRCRAFT · FLIGHT PLAN'}</small><h2 id="flight-panel-title">{isAirportInterior ? 'Choose your cabin' : 'Where are you flying?'}</h2><p>{isAirportInterior ? 'Select a cabin, then walk to its boarding gate.' : `${activeFlightClass.label} cabin · ${stateInfo.capital} departure`}</p></div><button type="button" onClick={() => setFlightPanelOpen(false)} aria-label="Close flight plan"><X size={15} /></button></header>
        <label className="flight-destination-label" htmlFor="flight-destination">DESTINATION STATE</label><div className="flight-select-wrap"><select id="flight-destination" value={flightDestination} onChange={(event) => setFlightDestination(event.target.value)}>{STATES.filter((item) => item.name !== stateInfo.name).map((item) => <option key={item.name} value={item.name}>{item.name} · {item.capital}</option>)}</select><ChevronDown size={15} /></div>
        {isAirportInterior ? <><div className="flight-class-grid">{FLIGHT_CLASSES.map((item) => <button key={item.id} type="button" className={`flight-class-option ${flightClass === item.id ? 'selected' : ''}`} onClick={() => setFlightClass(item.id)}><span><b>{item.label}</b><small>{item.detail}</small></span><strong>₦{money(item.fare)}</strong></button>)}</div><button type="button" className="flight-action-button" onClick={() => { planeBoardActionRef.current?.(flightClass); setFlightPanelOpen(false); }}>BOARD {activeFlightClass.label.toUpperCase()} CABIN <ArrowRight size={14} /></button></> : <><div className="flight-confirm-summary"><span>ARRIVAL AIRPORT<b>{STATES.find((item) => item.name === flightDestination)?.capital || 'Select a state'}</b></span><span>FICTIONAL ONE-WAY FARE<b>₦{money(activeFlightClass.fare)}</b></span></div><button type="button" className="flight-action-button" disabled={Boolean(flightCommand)} onClick={() => { onStartFlight?.({ destination: flightDestination, cabinClass: flightClass }); setFlightPanelOpen(false); }}>PAY FARE & TAKE OFF <ArrowRight size={14} /></button></>}
        <p className="flight-panel-note">All routes and fares are fictional game simulation. No real airline ticket is booked and no real money is charged.</p>
      </section></div>}
      {flightStatus && <div className="flight-cinematic-hud" role="status"><span className="flight-hud-plane"><Plane size={17} /></span><div><small>{flightStatus.phase === 'deboarding' ? 'ARRIVAL' : 'FLIGHT IN PROGRESS'}</small><strong>{flightStatus.phase === 'takeoff' ? 'TAKING OFF' : flightStatus.phase === 'landing' ? 'APPROACHING THE RUNWAY' : flightStatus.phase === 'deboarding' ? 'WALKING DOWN THE STAIRS' : 'CRUISING ABOVE THE CLOUDS'}</strong><span>{flightStatus.origin || stateInfo.name} → {flightStatus.destination}</span></div><div className="flight-progress"><i style={{ width: `${Math.round((flightStatus.progress || 0) * 100)}%` }} /></div></div>}
      {executiveAudience && <div className="executive-audience-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) endExecutiveAudience(); }}><section className="executive-audience-modal" role="dialog" aria-modal="true" aria-labelledby="executive-audience-title" onMouseDown={(event) => event.stopPropagation()}><header className="executive-audience-header"><span className="executive-audience-icon"><Handshake size={17} /></span><div><small>FICTIONAL BRANCH ROLEPLAY · PRIVATE AUDIENCE</small><h3 id="executive-audience-title">{executiveAudience.phase === 'request' ? 'Request a meeting' : 'Audience in progress'}</h3><p>{executiveAudience.executive.position} · {executiveAudience.executive.name}</p></div><button type="button" onClick={endExecutiveAudience} aria-label="Close audience"><X size={15} /></button></header>{executiveAudience.phase === 'request' ? <><p className="executive-audience-copy">You have reached the executive in the simulated office. Briefly state what you would like to discuss; the request starts a fictional, typed in-game audience.</p><form className="executive-audience-form" onSubmit={submitExecutiveAudienceRequest}><label htmlFor="executive-audience-draft">MEETING REQUEST / AGENDA</label><textarea id="executive-audience-draft" value={audienceDraft} onChange={(event) => setAudienceDraft(event.target.value)} maxLength={260} rows={4} placeholder="What would you like to discuss with this executive?" autoFocus /><div className="executive-audience-form-foot"><span>Do not include real-world contact details or sensitive personal information.</span><b>{audienceDraft.length}/260</b></div><button className="executive-audience-send" type="submit" disabled={!audienceDraft.trim()}>REQUEST & BEGIN AUDIENCE <ArrowRight size={14} /></button></form></> : <><div className="executive-audience-messages" aria-live="polite">{executiveAudience.messages.map((message) => <article key={message.id} className={message.speaker === 'YOU' ? 'from-player' : 'from-executive'}><span>{message.speaker === 'YOU' ? 'YOU' : executiveAudience.executive.position.toUpperCase()}</span><p>{message.body}</p></article>)}</div><form className="executive-audience-reply" onSubmit={sendExecutiveAudienceMessage}><textarea value={audienceDraft} onChange={(event) => setAudienceDraft(event.target.value)} maxLength={260} rows={2} aria-label="Type a message for the executive" placeholder="Type a follow-up…" /><button type="submit" aria-label="Send follow-up" disabled={!audienceDraft.trim()}><Send size={14} /></button></form><button type="button" className="executive-audience-end" onClick={endExecutiveAudience}>END AUDIENCE</button></>}<div className="executive-audience-footnote"><LockKeyhole size={11} /> Dialogue is generated for NIGERIA 2027; it is not a real appointment or official response.</div></section></div>}
      {interiorActivity && <div className="executive-audience-backdrop interior-activity-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissInteriorActivity(); }}><section className="executive-audience-modal interior-activity-modal" role="dialog" aria-modal="true" aria-labelledby="office-activity-title" onMouseDown={(event) => event.stopPropagation()}><header className="executive-audience-header"><span className="executive-audience-icon">{interiorActivity.id === 'water-break' ? <Zap size={17} /> : <BookOpen size={17} />}</span><div><small>FICTIONAL OFFICE ACTIVITY</small><h3 id="office-activity-title">{interiorActivity.title}</h3><p>{interiorInfo?.title || 'Simulated ward office'}</p></div><button type="button" onClick={dismissInteriorActivity} aria-label="Close activity"><X size={15} /></button></header>
        {interiorActivity.id === 'noticeboard' && <><p className="executive-audience-copy">A fictional branch notice invites residents to add a road, drainage, market-access, school, clinic, or safety issue to the next ward agenda.</p><form className="executive-audience-form" onSubmit={(event) => { event.preventDefault(); finishInteriorActivity(); }}><label htmlFor="office-activity-note">ADD A SHORT AGENDA NOTE (OPTIONAL)</label><textarea id="office-activity-note" value={interiorActivityDraft} onChange={(event) => setInteriorActivityDraft(event.target.value)} maxLength={220} rows={3} placeholder="What should the branch discuss next?" /><div className="executive-audience-form-foot"><span>Use fictional gameplay details only; no contact or sensitive personal data.</span><b>{interiorActivityDraft.length}/220</b></div><button className="executive-audience-send" type="submit">REVIEW NOTICE <ArrowRight size={14} /></button></form></>}
        {interiorActivity.id === 'records-cabinet' && !interiorActivity.recordType && <><p className="executive-audience-copy">Choose a fictional file. The office contains no real membership records or personal data.</p><div className="office-file-actions"><button type="button" onClick={() => setInteriorActivity((current) => current ? { ...current, recordType: 'minutes' } : current)}><b>RECENT MEETING MINUTES</b><span>Review agreed actions and follow-up dates.</span></button><button type="button" onClick={() => setInteriorActivity((current) => current ? { ...current, recordType: 'issues' } : current)}><b>WARD ISSUE REGISTER</b><span>Browse simulated service priorities by category.</span></button></div></>}
        {interiorActivity.id === 'records-cabinet' && interiorActivity.recordType && <><p className="executive-audience-copy">{interiorActivity.recordType === 'minutes' ? 'Fictional minutes: list each open issue, a responsible role, and a target date before the next consultation. No real office record is being shown.' : 'Simulated issue register: roads and drainage, public services, market access, and community safety. Entries are fictional and contain no personal records.'}</p><button className="executive-audience-send" type="button" onClick={() => finishInteriorActivity(interiorActivity.recordType)}>MARK FILE REVIEWED <Check size={14} /></button></>}
        {interiorActivity.id === 'water-break' && <><p className="executive-audience-copy">Take a short pause in the office before you carry on exploring. This restores a little character energy, up to the normal cap.</p><button className="executive-audience-send" type="button" onClick={() => finishInteriorActivity()}>TAKE A SHORT BREAK · +8 ENERGY <Zap size={14} /></button></>}
        <div className="executive-audience-footnote"><LockKeyhole size={11} /> These are local, fictional story interactions. They do not contact real offices or people.</div>
      </section></div>}
      <div className="scene-location-card"><div className="scene-card-kicker"><span className="scene-pin" />{locality ? 'YOUR WARD' : 'STATE CAPITAL'} <span>·</span> {stateInfo.zone.toUpperCase()}</div><h2>{locality?.lga || stateInfo.capital}<span>,</span> {stateInfo.name}</h2><p>{locality ? `${locality.ward} · ${stateWorldProfile.biome}` : `${stateWorldProfile.biome} · ${stateInfo.capital}`} · fictional procedural scene</p><div className="scene-time-chip"><span><Clock3 size={11} />{worldClock} WAT</span><b>{timePhase}</b></div><div className="scene-local-style"><span>LOCAL STREET STYLE</span><b>{localityVisual.label}</b><small>{localityVisual.trafficMix.slice(0, 3).join(' · ')}</small></div><div className="scene-local-landmark"><MapPin size={13} /><span>STATE SIGNATURE</span><b>{stateInfo.landmark}</b></div></div>
      <div className="scene-brief-card"><div className="brief-head"><span className="brief-live"><Radio size={12} /> ELECTION CLOCK</span><span>INEC CALENDAR</span></div><div className="brief-countdown"><div><strong>{Number.isFinite(daysToFederal) ? Math.max(0, daysToFederal) : '—'}</strong><span>DAYS TO FEDERAL</span></div><i /><div><strong>{Number.isFinite(daysToState) ? Math.max(0, daysToState) : '—'}</strong><span>DAYS TO STATE</span></div></div><div className="brief-dates"><span>16 JAN 2027</span><span>06 FEB 2027</span></div></div>
      <div className="mini-map-card"><div className="mini-map-top"><span>{locality ? `${locality.lga.toUpperCase()} GRID` : 'CAPITAL GRID'}</span><span className="map-north">N ↑</span></div><svg viewBox="0 0 150 102" role="img" aria-label="Stylised local street grid with a player marker that tracks your 3D position"><path d="M8 26H138M8 50H138M8 75H138M31 10V92M67 10V92M103 10V92M128 10V92" stroke="rgba(241,240,215,.42)" strokeWidth="3" /><path d="M8 50H138M67 10V92" stroke="#d6f176" strokeWidth="6" /><g ref={minimapMarkerRef} className="minimap-player-marker" transform="translate(63.4 54.8) rotate(180)"><circle r="10" fill="rgba(214,241,118,.18)" stroke="#d6f176" strokeWidth="1.5" /><circle r="4.4" fill="#fff8da" stroke="#152016" strokeWidth="1.4" /><path d="M0 -14 L-4 -5 L0 -7 L4 -5Z" fill="#d6f176" /></g></svg><div className="mini-map-foot"><span><i /> YOU</span><span>NOT TO SCALE</span></div></div>
      <div className="scene-current-site"><span className="site-icon"><MapPin size={14} /></span><div><small>SELECTED LOCATION</small><strong>{venueName}</strong><span>{venue.desc}</span><span>{locality ? `${locality.ward} ward · ${locality.lga} LGA` : `Capital district · ${stateInfo.name}`}</span></div></div>
      <div className="scene-controls"><span><Move size={13} /> CLICK TO WALK</span><i /> <span>WASD / ARROWS MOVE</span><i /> <span>CLICK DOOR TO ENTER</span><i /> <span>DRAG TO ORBIT</span><i /> <span>SCROLL TO ZOOM</span></div>
      <div className="mobile-gesture-hint" aria-label="Touch controls: tap to walk or enter doors, drag to orbit, pinch to zoom"><span>TAP TO WALK</span><i /> <span>DRAG TO ORBIT</span><i /> <span>PINCH TO ZOOM</span><i /> <span>TAP DOOR TO ENTER</span></div>
      <div className="scene-cinematic-label"><span>REALTIME CITY</span><b>3D</b></div><div className="scene-asset-note">STYLISED PROCEDURAL STORY WORLD · NOT A SURVEY MAP</div>
      <div className="mobile-player-dock" aria-label="Player status and shortcuts">
        <button className="mobile-player-avatar" type="button" onClick={onOpenAvatar} style={{ '--party-color': playerColor }} aria-label="Customize player avatar">{initials(profile?.alias || 'New Candidate')}</button>
        <div className="mobile-player-identity"><strong>{profile?.alias || 'New Candidate'}</strong><small>{isInstitutional ? institutionRole?.personnelLabel || 'Institutional story' : currentParty?.tag || 'GUEST PLAYER'}</small></div>
        <div className="mobile-player-meter"><div><span>{isInstitutional ? 'REPUTATION' : 'TRUST'}</span><b>{profile?.trust ?? 0}</b></div><i><em style={{ width: `${clamp(Number(profile?.trust) || 0)}%` }} /></i></div>
        <div className="mobile-player-meter energy-meter"><div><span>ENERGY</span><b>{profile?.energy ?? 0}</b></div><i><em style={{ width: `${clamp(Number(profile?.energy) || 0)}%` }} /></i></div>
        <button className="mobile-phone-shortcut" type="button" onClick={onOpenPhone} aria-label="Open chat and meetings"><MessageCircle size={17} /></button>
      </div>
      </>}
    </div>
    {worldPanel && <div className="world-directory-scrim" onClick={() => setWorldPanel(null)}>
      <section className={`world-directory-panel ${worldPanel === 'wards' ? 'world-ward-directory-panel' : 'world-places-directory-panel'}`} role="dialog" aria-modal="true" aria-labelledby="world-directory-title" onClick={(event) => event.stopPropagation()}>
        <header className="world-directory-header">
          <span className="world-directory-icon">{worldPanel === 'wards' ? <Users size={18} /> : worldPanel === 'parties' ? <Flag size={18} /> : <Landmark size={18} />}</span>
          <div><small>{worldPanel === 'parties' ? 'INEC REGISTER · LOCAL OFFICES SIMULATED' : `WORLD DIRECTORY · ${stateInfo.name.toUpperCase()}`}</small><h2 id="world-directory-title">{worldPanel === 'wards' ? 'Choose a ward' : worldPanel === 'parties' ? 'Registered parties' : 'Places to visit'}</h2></div>
          <button type="button" className="world-directory-close" onClick={() => setWorldPanel(null)} aria-label="Close directory" title="Close"><X size={18} /></button>
        </header>
        {worldPanel === 'places' ? <>
          <div className="world-directory-filters" aria-label="Filter places">{venueTypes.map((type) => <button type="button" key={type} className={venueFilter === type ? 'active' : ''} onClick={() => setVenueFilter(type)}>{type}</button>)}</div>
          <div className="world-directory-scroll world-place-grid">{visibleVenues.map((place) => <button key={place.id} type="button" className={`venue-chip ${venue.id === place.id ? 'selected' : ''}`} onClick={() => { onSelectVenue(place.id); setWorldPanel(null); }} aria-label={`Travel to ${place.label} in the 3D city`} title={`Travel to ${place.label}`}><span className={`venue-icon venue-${place.type}`}>{venueIcon(place.type)}</span><span><strong>{place.label}</strong><small>{place.short} · VISIT IN 3D</small></span><ArrowRight size={15} /></button>)}</div>
        </> : worldPanel === 'wards' ? <div className="world-directory-scroll world-ward-directory-scroll"><LocalityExplorer rootId="world-ward-directory" stateInfo={stateInfo} stateWorldProfile={stateWorldProfile} data={localityData} loading={localityLoading} error={localityError} lgaName={selectedLgaName} selectedWardKey={selectedWardKey} onSelectLga={onSelectLga} onSelectWard={(key) => { onSelectWard(key); setWorldPanel(null); }} /></div> : <div className="world-directory-scroll world-party-directory-scroll"><PartyDirectory parties={PARTY_OPTIONS} branches={localPartyBranches} activeParty={currentParty} stateInfo={stateInfo} locality={locality} onEnter={(partyId) => { setWorldPanel(null); enterPartyOffice(partyId); }} /></div>}
      </section>
    </div>}
    <div className="mobile-scroll-note"><span>SCROLL FOR PLACES, MISSIONS & WARD DIRECTORY</span><ChevronDown size={12} /></div>
    <div className="world-lower-row"><div id="mobile-world-places" className="location-card-grid"><div className="location-filter-row"><div><span className="eyebrow-line" />PLACES TO VISIT <b>{visibleVenues.length}</b></div><div className="location-filter">{venueTypes.map((type) => <button key={type} className={venueFilter === type ? 'active' : ''} onClick={() => setVenueFilter(type)}>{type}</button>)}</div></div><div className="venue-cards">{visibleVenues.map((place) => <button key={place.id} className={`venue-chip ${venue.id === place.id ? 'selected' : ''}`} onClick={() => onSelectVenue(place.id)} aria-label={`Travel to ${place.label} in the 3D city`} title={`Travel to ${place.label}`}><span className={`venue-icon venue-${place.type}`}>{venueIcon(place.type)}</span><span><strong>{place.label}</strong><small>{place.short} · VISIT IN 3D</small></span><ArrowRight size={13} /></button>)}</div></div>
      <div className="world-feed-card"><div className="feed-card-head"><span><Activity size={14} />DISTRICT PULSE</span><button onClick={() => onTravel('Lagos')}>RETURN TO START <ArrowRight size={12} /></button></div><div className="district-pulse-grid"><div><strong>37</strong><small>CAPITALS</small></div><div><strong>06</strong><small>GEO-ZONES</small></div><div><strong>{onlineCount || 1}</strong><small>PLAYERS</small></div></div><p>Regional biomes, roadside compounds, market stalls, civic landmarks and familiar Nigerian vehicles vary by state and locality. Multiplayer presence is a small-room prototype.</p></div></div>
    {institutionRole
      ? <InstitutionalWorldPanel role={institutionRole} stateName={stateInfo.name} onExploreSideStory={onExploreSideStory} onJoinPolitical={onJoinPolitical} />
      : <PartyDirectory parties={PARTY_OPTIONS} branches={localPartyBranches} activeParty={currentParty} stateInfo={stateInfo} locality={locality} onEnter={enterPartyOffice} />}
    <LocalityExplorer stateInfo={stateInfo} stateWorldProfile={stateWorldProfile} data={localityData} loading={localityLoading} error={localityError} lgaName={selectedLgaName} selectedWardKey={selectedWardKey} onSelectLga={onSelectLga} onSelectWard={onSelectWard} />
  </div>;
}

function InstitutionalWorldPanel({ role, stateName, onExploreSideStory, onJoinPolitical }) {
  const stories = getInstitutionStoryIds(role.id, stateName)
    .map((id) => OTHER_SIDE_STORIES.find((story) => story.id === id))
    .filter(Boolean);
  return <section className="institution-world-panel">
    <div className="institution-world-head"><span className="institution-world-icon">{role.id === 'judiciary' ? <Scale size={20} /> : role.id === 'cbn' ? <Banknote size={20} /> : <Landmark size={20} />}</span><div><div className="institution-world-kicker">FICTIONAL PERSONNEL STORY · NON-PARTISAN</div><h2>{role.personnelLabel}</h2></div><span className="institution-role-stamp">NO<br />OFFICE</span></div>
    <p>{role.description}</p>
    <div className="institution-world-boundary"><Shield size={13} /><span>Roleplay only: no real employment, appointment, statutory authority or political office is implied. This character is not enrolled in a second career ladder.</span></div>
    <div className="institution-world-actions">{stories.map((story) => <button key={story.id} onClick={() => onExploreSideStory(story.id)}><span><small>OPEN STORY SCENE</small><strong>{story.title}</strong></span><ArrowRight size={14} /></button>)}</div>
    <button className="institution-switch-link" onClick={onJoinPolitical}>OPTIONALLY JOIN THE SINGLE POLITICAL LADDER <ArrowRight size={13} /></button>
  </section>;
}

function venueIcon(type) {
  if (['office', 'caucus', 'assembly'].includes(type)) return <Landmark size={15} />;
  if (type === 'court') return <Scale size={15} />;
  if (type === 'market') return <Banknote size={15} />;
  if (type === 'airport') return <Plane size={15} />;
  if (type === 'stadium') return <Flag size={15} />;
  return <Users size={15} />;
}

function CareerPage({ stageIndex, progress, profile, onJump, onContinue, onExploreSideStory, sideStoriesSeen, onJoinPolitical }) {
  const institutionRole = profile.roleMode === 'institutional' ? getInstitutionRole(profile.institution) : null;
  if (institutionRole) return <div className="career-page institutional-career-page">
    <section className="institution-career-hero">
      <div className="institution-career-icon">{institutionRole.id === 'judiciary' ? <Scale size={25} /> : institutionRole.id === 'cbn' ? <Banknote size={25} /> : <Landmark size={25} />}</div>
      <div className="institution-career-copy"><div className="career-label"><Shield size={13} /> FICTIONAL INSTITUTION ROLE <span>NO PROMOTION LADDER</span></div><h2>Public service,<br /><em>without an office race.</em></h2><p>{institutionRole.description} Your story character can explore short institutional encounters; no real appointment or official power is granted.</p><div className="institution-career-tags"><span><Check size={12} /> NON-PARTISAN ROLEPLAY</span><span><Check size={12} /> NO PARALLEL LADDER</span><span><Check size={12} /> PARTY SWITCH IS OPTIONAL</span></div><div className="institution-career-actions"><button className="secondary-button" onClick={() => onJump('world')}>RETURN TO THE WORLD <ArrowRight size={13} /></button><button className="primary-action" onClick={onJoinPolitical}>OPTIONALLY JOIN A REGISTERED PARTY <ArrowRight size={13} /></button></div></div>
    </section>
    <section className="side-story-section"><div className="side-story-heading"><div><div className="eyebrow"><span className="eyebrow-line" />INSTITUTIONAL STORY ENCOUNTERS</div><h2>Explore the other sides of public life</h2><p>These are short, fictional roleplay encounters with judiciary, INEC, state SIEC and CBN perspectives—not ranks, appointments, agency authority or a second career ladder.</p></div><span className="side-story-seal"><Users size={16} /> CIVIC WORLD</span></div><div className="side-story-grid">{OTHER_SIDE_STORIES.map((story) => <article className="side-story-card" key={story.id}><div className="side-story-card-top"><span>{story.classification}</span><b>{sideStoriesSeen.includes(story.id) ? 'VISITED' : 'STORY'}</b></div><h3>{story.title}</h3><p>{story.fact}</p><button onClick={() => onExploreSideStory(story.id)}>{sideStoriesSeen.includes(story.id) ? 'REVISIT SCENE' : 'ENTER STORY'} <ArrowRight size={13} /></button></article>)}</div></section>
    <div className="career-footer-note"><Shield size={17} /><div><strong>The political ladder remains one optional route.</strong><span>Switching only adds a registered-party political story at chapter 1. It awards no office. Every later political position still requires its paid, contested process; you may also remain in the institutional story role.</span></div></div>
  </div>;
  return <div className="career-page">
    <div className="career-hero-card"><div className="career-hero-copy"><div className="career-label"><Sparkles size={14} /> ONE POLITICAL LADDER <span>12 CHAPTERS</span></div><h2>From youth leadership<br /><em>to the presidency.</em></h2><p>The main progression stays political: ward leadership, councillor, legislator, Senate and the fictional presidential contest. Elected, internal-party and appointed roles remain clearly distinct.</p><button className="primary-action" onClick={() => onJump('world')}>RETURN TO THE WORLD <ArrowRight size={14} /></button></div><div className="career-ring"><div className="career-ring-inner"><strong>{String(stageIndex + 1).padStart(2, '0')}</strong><span>OF {CHAPTERS.length}</span></div><span className="ring-orbit" /><span className="ring-dot" /></div><div className="career-hero-stats"><div><small>SIMULATED MILESTONES</small><strong>{profile.wins}</strong></div><div><small>PUBLIC TRUST</small><strong>{profile.trust}<i>%</i></strong></div><div><small>CAREER PROGRESS</small><strong>{Math.round(((stageIndex + 1) / CHAPTERS.length) * 100)}<i>%</i></strong></div></div></div>
    <div className="timeline-heading"><div><div className="eyebrow"><span className="eyebrow-line" />THE POLITICAL LADDER</div><h2>One continuous route · {CHAPTERS.length} stages</h2></div><div className="timeline-legend"><span><i className="legend-done" />COMPLETED</span><span><i className="legend-current" />CURRENT</span><span><i className="legend-locked" />LOCKED</span></div></div>
    <div className="career-timeline">{CHAPTERS.map((chapter, index) => { const completed = index < stageIndex; const current = index === stageIndex; return <div key={chapter.id} className={`timeline-item ${completed ? 'done' : ''} ${current ? 'current' : ''}`}><div className="timeline-track"><div className="timeline-node">{completed ? <Check size={13} /> : chapter.number}</div>{index < CHAPTERS.length - 1 && <span className="timeline-line" />}</div><div className="timeline-content"><div className="timeline-meta"><span>{chapter.phase}</span><span>STAGE {chapter.number}</span></div><h3>{chapter.title}</h3><p>{chapter.office} · {chapter.goal}</p><small className="timeline-process">{chapter.kind === 'race' ? 'PUBLIC ELECTION · FICTIONAL' : chapter.kind === 'primary' ? 'INTERNAL PARTY / CHAMBER SELECTION' : chapter.kind === 'appointment' ? 'APPOINTMENT · NOT A PUBLIC BALLOT' : 'SHARED CIVIC STORY'}</small>{current && <div className="timeline-current-state"><span>IN PROGRESS</span><span>{progress} / 3 preparations complete</span><button onClick={chapter.kind === 'story' ? onContinue : () => onJump('world')} disabled={chapter.kind === 'story' && progress < 3}>{chapter.kind === 'story' ? 'ADVANCE' : 'PREPARE IN WORLD'}<ArrowRight size={12} /></button></div>}{completed && <div className="timeline-complete"><BadgeCheck size={13} />CHAPTER COMPLETE · {profile.alias}</div>}</div></div>; })}</div>
    <section className="side-story-section"><div className="side-story-heading"><div><div className="eyebrow"><span className="eyebrow-line" />THE OTHER SIDE OF PUBLIC LIFE</div><h2>Institutions beyond the campaign trail</h2><p>Meet fictional professionals and experience the judiciary, election administration and central banking from the inside. These are side-story encounters—not alternate ladders, appointments, or changes to your political office.</p></div><span className="side-story-seal"><Users size={16} /> CIVIC WORLD</span></div><div className="side-story-grid">{OTHER_SIDE_STORIES.map((story) => <article className="side-story-card" key={story.id}><div className="side-story-card-top"><span>{story.classification}</span><b>{sideStoriesSeen.includes(story.id) ? 'VISITED' : 'SIDE STORY'}</b></div><h3>{story.title}</h3><p>{story.fact}</p><button onClick={() => onExploreSideStory(story.id)}>{sideStoriesSeen.includes(story.id) ? 'REVISIT SCENE' : 'ENTER STORY'} <ArrowRight size={13} /></button></article>)}</div></section>
    <div className="career-footer-note"><Shield size={17} /><div><strong>The political ladder remains the main career.</strong><span>Side stories show the distinct roles of independent courts, INEC, state election commissions and the CBN. Judges, election officials and CBN leaders are not elected campaign offices; real appointment rules apply outside this fictional, accelerated game.</span></div></div>
  </div>;
}

function OfficesPage() {
  const [filter, setFilter] = useState('ALL ROLES');
  const filters = ['ALL ROLES', 'ELECTED', 'INTERNAL', 'APPOINTED'];
  const groups = OFFICE_CATALOG.filter((group) => filter === 'ALL ROLES' || group.group.includes(filter));
  return <div className="offices-page"><div className="offices-intro"><div className="offices-intro-icon"><Landmark size={25} /></div><div><div className="eyebrow"><span className="eyebrow-line" />OFFICE DIRECTORY</div><h2>Who holds what—and how they get there.</h2><p>Election titles, party positions, legislative leadership, and appointed offices are different routes. This is a reference catalogue only—it never grants a position. Every playable career office requires a paid contest/review with a rival, and your prior active position is vacated before the next contest.</p></div></div><div className="office-filter-row">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>{item}</button>)}<span><CircleHelp size={13} /> Titles can vary by law, party constitution, and chamber rules.</span></div><div className="office-groups">{groups.map((group) => <section className="office-group" key={group.group}><div className="office-group-head"><span className={`office-group-icon ${group.icon === '◆' ? 'elected' : group.icon === '◇' ? 'internal' : 'appointed'}`}>{group.icon}</span><h3>{group.group}</h3><span>{group.roles.length} TITLES</span></div><div className="office-role-grid">{group.roles.map(([title, description]) => <article className="office-role-card" key={title}><div className="office-role-top"><span>{group.icon}</span><span className="role-category">{group.group.split(' — ')[0]}</span></div><h4>{title}</h4><p>{description}</p><div className="role-divider" /><small><ArrowRight size={12} />{group.group.includes('ELECTED') ? 'PUBLIC BALLOT' : group.group.includes('INTERNAL') ? 'INTERNAL SELECTION' : group.group.includes('PUBLIC INSTITUTIONS') ? 'INDEPENDENT OFFICE' : 'APPOINTMENT / SERVICE'}</small></article>)}</div></section>)}</div><div className="office-footnote"><InfoDot /><span>This is a broad game-facing directory, not an exhaustive legal register of every public-service or party title. Constitutional and state-specific rules take precedence.</span></div></div>;
}

function InfoDot() { return <span className="info-dot">i</span>; }
function ShieldCheckIcon() { return <Shield size={26} />; }

function CivicPage() {
  const [expanded, setExpanded] = useState(0);
  return <div className="civic-page"><div className="civic-banner"><div className="civic-banner-icon"><BookOpen size={23} /></div><div><div className="eyebrow"><span className="eyebrow-line" />THE CIVIC DESK</div><h2>Documented pressure points. Not a stereotype.</h2><p>“Dirty politics” is treated as institutional pressures and reported practices—not as a Nigerian cultural trait. The game rewards accountable choices and makes abuse costly.</p></div><div className="civic-stamp"><ShieldCheckIcon /><span>NON-PARTISAN<br />GAME RESEARCH</span></div></div><div className="civic-note-strip"><span className="note-strip-icon"><Eye size={15} /></span><p><strong>How this world handles culture:</strong> Nigerian communities are diverse. The sim includes traditional institutions, faith communities, unions, market associations, youth networks, and civic groups as voluntary voices—not as uniform vote banks.</p></div><div className="research-grid">{RESEARCH_NOTES.map((note, index) => <article className={`research-card ${expanded === index ? 'expanded' : ''}`} key={note.tag}><button className="research-card-button" onClick={() => setExpanded(expanded === index ? -1 : index)}><div className="research-card-top"><span>{note.tag}</span><span className="research-index">0{index + 1}</span></div><h3>{note.title}</h3><p>{note.body}</p><div className="research-source"><BookOpen size={13} /><span>{note.source}</span><ChevronDown size={14} /></div></button>{expanded === index && <a className="source-link" href={note.url} target="_blank" rel="noreferrer">OPEN SOURCE <ArrowRight size={12} /></a>}</article>)}</div><div className="history-panel"><div className="history-panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" />HISTORICAL STARTING POINT</div><h3>From 2023 lessons to a fictional 2027 run.</h3></div><span className="history-date">REFERENCE · 10 OCT 2026</span></div><div className="history-track"><div className="history-point"><span>2023</span><strong>General election</strong><p>Observer findings inform game mechanics: trust, results transparency, campaign finance, participation, and dispute resolution.</p></div><div className="history-point"><span>2024</span><strong>Off-cycle contests</strong><p>State-by-state contests and controversies show why one national campaign template cannot explain every local race.</p></div><div className="history-point future"><span>2027</span><strong>Player-authored scenario</strong><p>INEC’s calendar lists 16 January and 6 February 2027 polls. The real outcome is unknown; your fictional run is not a prediction.</p></div></div></div><div className="civic-footer"><span><Scale size={15} /> Elections, petitions, and official titles use civic references. Party names, logos and dated national-officer fields follow INEC’s register; player characters, local branches and story results are fictional.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP <ArrowRight size={12} /></button></div></div>;
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

function ChatPanel({ messages, draft, setDraft, onSend, onlineCount, status, stateName, players, meetings, selectedPeer, onSelectPeer, dmMessages, dmDraft, setDmDraft, onSendDm, onInvite, activeMeeting, meetingPhase, onFocusMeeting, onJoinMeeting, persistenceEnabled, accountBacked }) {
  const [tab, setTab] = useState('world');
  const peerMessages = selectedPeer ? dmMessages.filter((item) => item.peerId === selectedPeer.id || (selectedPeer.accountId && item.peerAccountId === selectedPeer.accountId)) : [];
  return <div className="chat-panel social-panel">
    <div className="social-tabs" role="tablist" aria-label="Social features">
      {[['world', 'WORLD'], ['dm', 'DIRECT'], ['meetings', `MEETINGS${meetings.length ? ` · ${meetings.length}` : ''}`]].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === 'world' && <>
      <div className="chat-head"><div><span className="chat-head-icon"><MessageCircle size={14} /></span><div><strong>World chat</strong><small>{status === 'online' ? `${onlineCount || 1} IN THIS INSTANCE` : 'LOCAL PREVIEW'}</small></div></div><span className={`chat-online-dot ${status}`} /></div>
      <div className="chat-messages">{messages.slice(0, 4).map((item) => <div key={item.id} className={`chat-message ${item.system ? 'system' : ''} ${item.local ? 'mine' : ''}`}><div className="chat-message-meta"><b>{item.system ? 'WORLD DESK' : item.name}</b><span>{item.state || stateName}</span></div><p>{item.message}</p></div>)}</div>
      <form className="chat-compose" onSubmit={onSend}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={180} placeholder="Message this world…" aria-label="World chat message" /><button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={14} /></button></form>
      <div className="chat-safety">Keep it respectful; no private data or real-world vote requests.</div>
    </>}
    {tab === 'dm' && <>
      <div className="social-pane-heading"><div><strong>Players in this district</strong><small>{players.length} online · location scoped</small></div><Users size={15} /></div>
      {players.length ? <div className="dm-player-list">{players.slice(0, 6).map((player) => <button key={player.id} className={`dm-player ${selectedPeer?.id === player.id ? 'selected' : ''}`} onClick={() => onSelectPeer(player)}><i style={{ background: player.color || 'var(--mint)' }} /><span><b>{player.name}</b><small>{player.state}{player.accountBacked ? ' · ACCOUNT' : ' · GUEST'}</small></span><MessageCircle size={13} /></button>)}</div> : <div className="social-empty">No other players are in this locality. Invite someone to the same state/LGA/ward or use a meeting link.</div>}
      {selectedPeer && <>
        <div className="dm-conversation-head"><span>DIRECT WITH <b>{selectedPeer.name}</b></span>{activeMeeting?.status === 'open' && activeMeeting.isHost && <button onClick={() => onInvite(selectedPeer)}>INVITE TO MEETING</button>}</div>
        <div className="dm-conversation">{peerMessages.length ? peerMessages.slice(-5).map((item) => <div key={item.id} className={`dm-message ${item.incoming ? 'incoming' : 'outgoing'} ${item.type === 'meeting_invite' ? 'invite' : ''}`}><small>{item.incoming ? (item.fromName || selectedPeer.name) : 'YOU'}</small><p>{item.body}</p>{item.type === 'meeting_invite' && item.meetingId && <span>MEETING INVITE · CHECK MEETINGS TAB</span>}</div>) : <div className="social-empty">Start a private in-game conversation. Keep contact details and real-world political requests out of chat.</div>}</div>
        <form className="chat-compose dm-compose" onSubmit={onSendDm}><input value={dmDraft} onChange={(event) => setDmDraft(event.target.value)} maxLength={300} placeholder={`Message ${selectedPeer.name}…`} aria-label="Direct message" /><button type="submit" disabled={!dmDraft.trim() || status !== 'online'} aria-label="Send direct message"><Send size={14} /></button></form>
        <div className="chat-safety">{persistenceEnabled && accountBacked ? 'Account DMs are saved when both participants have signed in.' : 'Guest DMs are session-only; account history needs deployment setup.'}</div>
      </>}
    </>}
    {tab === 'meetings' && <>
      <div className="social-pane-heading"><div><strong>Open civic meetings</strong><small>Town halls · speeches · replies</small></div><Radio size={15} /></div>
      {activeMeeting?.status === 'open' && <button className="active-meeting-link" onClick={onFocusMeeting}><span className="live-dot" />CURRENT GATHERING · {activeMeeting.title}<small>{['at-venue', 'discussion'].includes(meetingPhase) ? 'AT VENUE · OPEN DISCUSSION' : 'YOUR AVATAR IS WALKING TO THE VENUE'}</small></button>}
      {meetings.length ? <div className="meeting-list-small">{meetings.slice(0, 4).map((meeting) => <article className="meeting-list-card" key={meeting.id}><div><b>{meeting.title}</b><small>{meeting.location?.venueName || 'Civic venue'} · {meeting.location?.state || stateName} · {meeting.atVenue || 0} at venue · {meeting.enRoute || 0} on way</small><p>{meeting.topic}</p></div><button onClick={() => onJoinMeeting(meeting)}>{activeMeeting?.id === meeting.id ? 'RETURN' : 'JOIN & WALK'} <ArrowRight size={12} /></button></article>)}</div> : <div className="social-empty">No meetings are open. Start a Town Hall story from Campaign actions; nearby players can join or receive a DM invitation.</div>}
      <div className="chat-safety">{persistenceEnabled ? 'Meetings and messages can persist for signed-in players.' : 'Preview meetings are in-memory until account/database setup is enabled.'}</div>
    </>}
  </div>;
}

function AccountAccessForm({ authReady, authEnabled, persistenceConfigured, persistenceEnabled, authSession, busy, alias, onSubmit, onSignOut, onSuccess }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setFeedback('');
    const result = await onSubmit(mode, email, password, alias);
    if (!result?.ok) { setFeedback(result?.error || 'Account access failed.'); return; }
    setPassword('');
    onSuccess?.(result);
  };
  if (!authReady) return <div className="account-config-note"><span className="locality-loader" />Checking account service…</div>;
  if (authSession?.access_token) return <div className="account-connected"><span className="account-check"><Check size={15} /></span><div><strong>ACCOUNT CONNECTED</strong><small>{authSession.user?.email || 'Signed-in player'}</small><p>{persistenceEnabled ? 'Profile, eligible DMs and meeting records can be cloud-saved.' : persistenceConfigured ? 'Database keys are present, but the schema is not reachable. Apply supabase/schema.sql and recheck the service.' : 'Auth is connected, but cloud saves and persistent messages need the server-only database key.'}</p></div><button onClick={onSignOut}>SIGN OUT</button></div>;
  if (!authEnabled) return <div className="account-config-note"><strong>Account service not connected</strong><span>Guest play works now. Real sign-up, login and cloud history need the Supabase environment keys and database schema listed in ACCOUNT_SETUP.md.</span></div>;
  return <div className="account-access-form">
    <div className="account-form-tabs"><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setFeedback(''); }}>CREATE ACCOUNT</button><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setFeedback(''); }}>SIGN IN</button></div>
    <form onSubmit={submit}>
      <label className="form-label">EMAIL ADDRESS<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
      <label className="form-label">PASSWORD <span>10+ CHARACTERS</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required placeholder="Use a strong, unique password" /></label>
      {!persistenceEnabled && <small className="account-inline-note">{persistenceConfigured ? 'Database keys are present; apply supabase/schema.sql to enable cloud saves and message history.' : 'Sign-in is available; cloud saves and persistent messages need the server database key.'}</small>}
      {feedback && <div className="account-feedback" role="status">{feedback}</div>}
      <button className="account-submit" type="submit" disabled={busy}>{busy ? 'WORKING…' : mode === 'signup' ? 'CREATE SECURE ACCOUNT' : 'SIGN IN'} <ArrowRight size={13} /></button>
    </form>
    <small className="account-privacy-note"><LockKeyhole size={11} />Passwords are handled by the configured account provider, not stored in the game database.</small>
  </div>;
}

function AvatarCustomizer({ appearance, playerColor, onClose, onSave }) {
  const [draft, setDraft] = useState(() => normalizeAvatarAppearance(appearance));
  const previewShirt = draft.outfitColor || playerColor;
  const headShape = draft.headStyle === 'wrap'
    ? <path d="M52 59 Q80 22 108 59 L104 71 Q80 60 56 71Z" fill="#dbb978" />
    : draft.headStyle === 'cap'
      ? <><path d="M54 52 Q80 26 106 53 L104 61 Q80 54 55 63Z" fill="#273b35" /><path d="M80 58 Q104 56 112 64 Q94 68 78 64Z" fill="#273b35" /></>
      : <path d={draft.headStyle === 'natural' ? 'M54 65 Q49 36 78 33 Q111 34 107 65 Q102 54 95 51 Q77 62 61 53Z' : 'M55 64 Q55 39 80 38 Q104 40 105 64 Q95 52 80 53 Q66 52 55 64Z'} fill="#202522" />;
  return <div className="modal-backdrop avatar-customizer-backdrop" onMouseDown={onClose}>
    <section className="avatar-customizer modal-card" role="dialog" aria-modal="true" aria-label="Customize your avatar" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Close avatar customizer"><X size={18} /></button>
      <div className="dialog-topline"><span className="dialog-icon"><Shirt size={19} /></span><span className="modal-eyebrow">PLAYER IDENTITY · STORY SAVE</span></div>
      <h2>Make this character yours.</h2>
      <p>The original NIGERIA 2027 avatar can be edited at any time. Changes apply to the 3D character and save with this local story.</p>
      <div className="avatar-customizer-layout">
        <div className="avatar-preview-card">
          <div className="avatar-preview-skyline"><i /><i /><i /><i /><span>FIELD PROFILE</span></div>
          <svg className="avatar-preview-figure" viewBox="0 0 160 250" role="img" aria-label="Live preview of the player character">
            <ellipse cx="80" cy="229" rx="42" ry="9" fill="rgba(0,0,0,.34)" />
            <path d="M61 143 L99 143 L107 211 L89 211 L80 166 L70 211 L52 211Z" fill="#343c36" />
            <path d="M57 204 L73 204 L70 224 L47 224 Q46 216 57 204M87 204 L103 204 Q112 215 112 224 L83 224Z" fill="#252d28" />
            <path d="M57 83 Q80 72 103 83 L111 142 Q80 154 49 142Z" fill={previewShirt} />
            <path d="M57 91 L42 101 L31 137 L43 141 L62 116M103 91 L119 101 L130 137 L118 141 L98 116" fill={previewShirt} />
            <path d="M31 132 L43 136 L42 147 L33 149Z M118 136 L130 132 L128 149 L119 147Z" fill={draft.skinTone} />
            <rect x="70" y="70" width="20" height="20" rx="7" fill={draft.skinTone} />
            <ellipse cx="80" cy="54" rx="25" ry="30" fill={draft.skinTone} />
            {headShape}
            <circle cx="71" cy="59" r="2" fill="#211b19" /><circle cx="89" cy="59" r="2" fill="#211b19" />
            <path d="M74 72 Q80 75 86 72" fill="none" stroke="#512f28" strokeWidth="2" strokeLinecap="round" />
            <path d="M62 96 L80 106 L98 96" fill="none" stroke="rgba(255,255,255,.27)" strokeWidth="2" />
          </svg>
          <div className="avatar-preview-name"><span><i /> ACTIVE PLAYER</span><b>FIELD LOOK · {draft.headStyle.toUpperCase()}</b></div>
        </div>
        <div className="avatar-controls">
          <fieldset className="avatar-choice-group"><legend>SKIN TONE</legend><div className="avatar-skin-options">{AVATAR_SKIN_OPTIONS.map((option) => <button key={option.value} type="button" className={draft.skinTone === option.value ? 'selected' : ''} style={{ '--swatch': option.value }} onClick={() => setDraft((current) => ({ ...current, skinTone: option.value }))} aria-label={option.label} title={option.label}><i /></button>)}</div><small>{AVATAR_SKIN_OPTIONS.find((option) => option.value === draft.skinTone)?.label}</small></fieldset>
          <fieldset className="avatar-choice-group"><legend>HEAD STYLE</legend><div className="avatar-head-options">{AVATAR_HEAD_OPTIONS.map((option) => <button key={option.id} type="button" className={draft.headStyle === option.id ? 'selected' : ''} onClick={() => setDraft((current) => ({ ...current, headStyle: option.id }))}>{option.label}</button>)}</div></fieldset>
          <fieldset className="avatar-choice-group"><legend>OUTFIT COLOUR</legend><div className="avatar-outfit-options">{AVATAR_OUTFIT_OPTIONS.map((option) => <button key={option.id} type="button" className={draft.outfitColor === option.value ? 'selected' : ''} style={{ '--swatch': option.value || playerColor }} onClick={() => setDraft((current) => ({ ...current, outfitColor: option.value }))} title={option.label} aria-label={option.label}><i />{option.id === 'accent' && <span>ROLE</span>}</button>)}</div><small>ROLE ACCENT {draft.outfitColor ? 'OVERRIDDEN' : 'ACTIVE'}</small></fieldset>
          <div className="avatar-customizer-note"><Shield size={13} /><span>Appearance only. It does not change your political alignment, institutional role, character stats or in-game funds.</span></div>
        </div>
      </div>
      <div className="avatar-customizer-actions"><button type="button" className="secondary-button" onClick={onClose}>CANCEL</button><button type="button" className="primary-action" onClick={() => onSave(draft)}>SAVE PLAYER LOOK <ArrowRight size={14} /></button></div>
    </section>
  </div>;
}

function AccountModal({ authReady, authConfig, authSession, authBusy, alias, onSubmit, onSignOut, onSuccess, onClose }) {
  return <div className="modal-backdrop"><section className="account-modal modal-card"><button className="modal-close" onClick={onClose}><X size={17} /></button><div className="dialog-topline"><span className="dialog-icon"><LockKeyhole size={19} /></span><span className="modal-eyebrow">PLAYER ACCOUNT · NIGERIA 2027</span></div><h2>Account and cloud save</h2><p>Sign in to save your political ladder and, when persistence is enabled, keep eligible meetings and DMs across sessions. A guest profile remains local to this browser.</p><AccountAccessForm authReady={authReady} authEnabled={authConfig.authEnabled} persistenceConfigured={authConfig.persistenceConfigured} persistenceEnabled={authConfig.persistenceEnabled} authSession={authSession} busy={authBusy} alias={alias} onSubmit={onSubmit} onSignOut={onSignOut} onSuccess={onSuccess} /><button className="secondary-button account-close-button" onClick={onClose}>BACK TO THE GAME</button></section></div>;
}

function StoryActionModal({ scene, npc, title, classification, actionLabel, onClose, onComplete, isSideStory = false, institutionalRole = null }) {
  const [text, setText] = useState('');
  const [choiceId, setChoiceId] = useState(scene?.choices?.[0]?.id || '');
  if (!scene) return null;
  const speaker = npc?.name || scene.speaker;
  const scenePrompt = npc ? `${npc.ask} ${scene.prompt}` : scene.prompt;
  const submit = (event) => { event.preventDefault(); if (text.trim().length >= 8 && choiceId) onComplete(text.trim(), choiceId); };
  return <div className="modal-backdrop"><section className="story-action-modal modal-card"><button className="modal-close" onClick={onClose} aria-label="Close scene"><X size={17} /></button><div className="dialog-topline"><span className="dialog-icon"><MessageCircle size={19} /></span><span className="modal-eyebrow">{classification || scene.format || 'STORY INTERACTION'}</span></div><h2>{title || scene.title}</h2><div className="story-speaker"><span className="speaker-avatar">{initials(speaker || 'Civic desk')}</span><div><small>{institutionalRole ? 'FICTIONAL PERSONNEL ROLEPLAY' : isSideStory ? 'FICTIONAL STORY ROLE' : 'SCENE PARTNER'}</small><strong>{speaker}</strong></div></div><p className="story-scene-prompt">{scenePrompt}</p><form onSubmit={submit}><label className="story-response-label">YOUR TYPED RESPONSE <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} minLength={8} rows={4} placeholder="Write what you would say. Keep it respectful and specific…" required /></label><div className="story-choice-list"><small>{isSideStory ? 'HOW YOU HANDLE THE ENCOUNTER' : 'CHOOSE YOUR APPROACH'}</small>{scene.choices.map((choice) => <button type="button" key={choice.id} className={choice.id === choiceId ? 'selected' : ''} onClick={() => setChoiceId(choice.id)}><span className="story-choice-radio">{choice.id === choiceId && <i />}</span><span><b>{choice.label}</b><small>{choice.outcome}</small></span></button>)}</div><div className="story-scene-footnote"><Shield size={13} /><span>{institutionalRole ? 'Fictional personnel-story record only. This does not grant employment, appointment, statutory powers, judicial authority or political office; no separate ladder advances.' : isSideStory ? 'Side story only. It adds context and a small civic record; it does not change your political office or advance the ladder.' : npc ? 'Fictional consultation. No endorsement is guaranteed; your written response and choice are logged.' : 'Your response and choice shape this scene before any in-game effect is applied.'}</span></div><div className="story-modal-actions"><button type="button" className="secondary-button" onClick={onClose}>LEAVE SCENE</button><button className="primary-action" type="submit" disabled={text.trim().length < 8}>{institutionalRole ? 'RECORD ROLEPLAY RESPONSE' : isSideStory ? 'RECORD SIDE STORY' : actionLabel || 'RECORD RESPONSE'} <ArrowRight size={13} /></button></div></form></section></div>;
}

function MeetingRoom({ meeting, messages, participants, votes, draft, setDraft, replyTo, setReplyTo, onSend, onVote, onCloseMeeting, onLeave, onMinimize }) {
  if (!meeting) return null;
  const voteItems = [['support', 'SUPPORT'], ['mixed', 'MIXED'], ['concern', 'NEEDS WORK']];
  const location = meeting.location || {};
  const closed = meeting.status === 'closed';
  return <div className="meeting-backdrop"><section className="meeting-room" role="dialog" aria-modal="false" aria-label={meeting.title}>
    <header className="meeting-room-head"><div><div className="meeting-kicker"><span className={closed ? 'meeting-status-dot closed' : 'meeting-status-dot'} />{closed ? 'MEETING RECORD PUBLISHED' : meeting.local ? 'LOCAL GUEST PREVIEW' : 'LIVE CIVIC MEETING'}</div><h2>{meeting.title}</h2><small>{location.venueName || 'Civic venue'} · {location.ward ? `${location.ward}, ` : ''}{location.lga ? `${location.lga}, ` : ''}{location.state || 'Nigeria'}</small></div><button className="meeting-room-close" onClick={onMinimize} aria-label="Minimize discussion and return to the 3D gathering"><X size={18} /></button></header>
    <div className="meeting-topic"><span>MEETING QUESTION</span><p>{meeting.topic || 'Share a public-interest view and listen to the responses.'}</p></div>
    <div className="meeting-participants"><div><Users size={14} /><span>IN THE ROOM</span><b>{participants.length || meeting.participants || 1}</b></div><div className="participant-pills">{participants.slice(0, 5).map((person) => <span key={person.id || person.name}>{person.name || 'Player'}</span>)}{participants.length > 5 && <span>+{participants.length - 5}</span>}</div></div>
    <div className="meeting-conversation">{messages.length ? messages.map((message) => <article className={`meeting-message ${message.kind || 'speech'}`} key={message.id}><div className="meeting-message-meta"><b>{message.senderName || message.name || 'Player'}</b><span>{message.kind === 'reply' ? 'REPLY' : message.kind === 'summary' ? 'MINUTES' : 'SPEECH'}</span></div>{message.replyTo && <small className="reply-mark">↳ responding to a speaker</small>}<p>{message.body || message.message}</p>{!closed && message.kind !== 'summary' && <button className="reply-button" onClick={() => setReplyTo(message)}>REPLY</button>}</article>) : <div className="meeting-empty"><MessageCircle size={23} /><strong>THE FLOOR IS OPEN</strong><span>Give the opening speech, then answer another speaker. Your replies and the room’s vote shape the published meeting outcome.</span></div>}</div>
    {!closed && <form className="meeting-composer" onSubmit={onSend}>{replyTo && <div className="reply-context"><span>REPLYING TO {replyTo.senderName || 'SPEAKER'}: “{(replyTo.body || '').slice(0, 95)}”</span><button type="button" onClick={() => setReplyTo(null)}>CANCEL</button></div>}<textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} rows={3} placeholder={replyTo ? 'Type a considered reply…' : 'Deliver a short typed speech to open the discussion…'} /><div className="meeting-compose-foot"><small>{draft.length}/500 · Respectful public dialogue only</small><button className="primary-action" type="submit" disabled={draft.trim().length < 2}>{replyTo ? 'SEND REPLY' : 'DELIVER SPEECH'} <Send size={13} /></button></div></form>}
    <section className="meeting-vote"><div className="meeting-vote-head"><div><strong>MEETING DIRECTION</strong><small>One vote each sets the record. Plans, budgets, evidence, listening and accountability in typed speeches/replies can improve trust; dismissive wording can lower it.</small></div><div className="vote-tally">{votes.support || 0} FOR · {votes.mixed || 0} MIXED · {votes.concern || 0} REWORK</div></div>{!closed && <div className="meeting-vote-buttons">{voteItems.map(([value, label]) => <button key={value} className={votes[value] ? 'selected' : ''} onClick={() => onVote(value)}>{label}<b>{votes[value] || 0}</b></button>)}</div>}{closed && <div className={`meeting-outcome outcome-${meeting.outcome?.outcome || 'contested'}`}><b>{String(meeting.outcome?.outcome || 'contested').replace('-', ' ').toUpperCase()}</b><span>{meeting.outcome?.summary || 'The meeting closed with a published tally; no response is treated as unanimous.'}</span></div>}</section>
    <footer className="meeting-room-footer"><span><LockKeyhole size={12} />{meeting.local ? 'Guest meeting is temporary.' : 'Account-backed records persist only when server storage is configured.'}</span>{!closed && meeting.isHost ? <button className="primary-action" onClick={onCloseMeeting}>PUBLISH RECORD & CLOSE <ArrowRight size={13} /></button> : closed ? <button className="secondary-button" onClick={onLeave}>RETURN TO STORY</button> : <button className="secondary-button" onClick={onLeave}>LEAVE MEETING</button>}</footer>
  </section></div>;
}

function WelcomeModal({ alias, setAlias, party, setParty, mode, setMode, institution, setInstitution, state, setState, onStart, onClose, hasSave, authReady, authConfig, authSession, authBusy, onAuth, onSignOut, onAccountSuccess }) {
  const [partyQuery, setPartyQuery] = useState('');
  const visibleParties = PARTY_OPTIONS.filter((item) => `${item.tag} ${item.name}`.toLowerCase().includes(partyQuery.trim().toLowerCase()));
  const startLabel = mode === 'institutional'
    ? hasSave ? 'START A NEW PERSONNEL STORY' : authSession ? 'START PERSONNEL STORY' : 'CONTINUE AS GUEST · FICTIONAL ROLE'
    : hasSave ? 'START A NEW CANDIDATE' : authSession ? 'START A NEW CANDIDATE' : 'CONTINUE AS GUEST · LOCAL ONLY';
  return <div className="modal-backdrop welcome-backdrop"><div className="welcome-modal modal-card"><div className="welcome-visual"><div className="welcome-orbit orbit-a" /><div className="welcome-orbit orbit-b" /><div className="welcome-silhouette"><div className="silhouette-stars">✦ &nbsp; ✦ &nbsp; ✦</div><div className="silhouette-sun" /><div className="silhouette-skyline"><i /><i /><i /><i /><i /></div><div className="silhouette-road" /><div className="silhouette-figure"><span /><i /></div></div><div className="welcome-visual-caption"><span>THE JOURNEY STARTS HERE</span><b>ONE WARD. ONE COUNTRY.</b></div></div><div className="welcome-content"><button className="modal-close" onClick={onClose} aria-label="Close onboarding"><X size={18} /></button><div className="welcome-mark"><span className="brand-mark"><span /><i /></span><small>CAMPAIGN PROTOCOL · 2027</small></div><div className="welcome-kicker"><Sparkles size={13} /> YOUR PUBLIC LIFE BEGINS</div><h2>Choose your<br /><em>starting role.</em></h2><p>Start as a registered-party political participant or as fictional personnel in election administration, the judiciary or CBN. Institutional roleplay has no separate office ladder; you may optionally join the one political ladder later.</p>
    <div className="start-mode-picks" role="group" aria-label="Choose your starting role"><button type="button" className={`start-mode-pick ${mode === 'political' ? 'selected' : ''}`} onClick={() => setMode('political')}><Flag size={17} /><span><b>REGISTERED PARTY</b><small>Start the single political ladder</small></span><i>{mode === 'political' ? '●' : '○'}</i></button><button type="button" className={`start-mode-pick ${mode === 'institutional' ? 'selected' : ''}`} onClick={() => setMode('institutional')}><Landmark size={17} /><span><b>INSTITUTION PERSONNEL</b><small>Fictional, non-partisan story role</small></span><i>{mode === 'institutional' ? '●' : '○'}</i></button></div>
    <label className="form-label">YOUR CHARACTER NAME <span>OPTIONAL</span><input autoFocus maxLength={26} value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="e.g. Ayo Ajala" /></label><label className="form-label">STARTING STATE <span>37 CAPITAL STOPS</span><div className="select-wrap"><select value={state} onChange={(event) => setState(event.target.value)}>{STATES.map((item) => <option key={item.name} value={item.name}>{item.name} — {item.capital}</option>)}</select><ChevronDown size={15} /></div></label>
    {mode === 'political' ? <><div className="party-select-head"><div className="party-pick-label">CHOOSE AN INEC-REGISTERED PARTY <small>22 INEC RECORDS · {partyRegisterDateLabel}</small></div><label className="party-search"><Search size={13} /><input value={partyQuery} onChange={(event) => setPartyQuery(event.target.value)} placeholder="Search acronym or name" aria-label="Search registered parties" /></label></div><div className="party-picks">{visibleParties.map((item) => <button type="button" key={item.id} className={`party-pick ${party === item.name ? 'selected' : ''}`} onClick={() => setParty(item.name)} style={{ '--party-color': item.color }}><img src={item.logo} alt="" loading="lazy" /><span className="party-radio">{party === item.name && <i />}</span><span className="party-pick-copy"><b>{item.tag}</b><small>{item.name}</small></span><span className="party-color-mark" /></button>)}</div>{visibleParties.length === 0 && <div className="party-no-results">No registered party matches that search.</div>}<div className="party-register-note">INEC register snapshot checked {partyRegisterDateLabel} · registration is not a final 2027 candidate/ballot list. Local offices and ward executives are fictional. <a href={PARTY_REGISTER_SOURCE} target="_blank" rel="noreferrer">VIEW INEC REGISTER</a></div></> : <><div className="institution-role-heading"><span>CHOOSE A FICTIONAL PERSONNEL PERSPECTIVE</span><small>ROLEPLAY ONLY · NO REAL APPOINTMENT</small></div><div className="institution-role-picks">{INSTITUTION_ROLES.map((role) => <button type="button" key={role.id} className={`institution-role-pick ${institution === role.id ? 'selected' : ''}`} onClick={() => setInstitution(role.id)} style={{ '--role-color': role.color }}><span className="institution-role-pick-icon">{role.id === 'judiciary' ? <Scale size={17} /> : role.id === 'cbn' ? <Banknote size={17} /> : <Landmark size={17} />}</span><span className="institution-role-pick-copy"><b>{role.personnelLabel}</b><small>{role.description}</small></span><span className="party-radio">{institution === role.id && <i />}</span></button>)}</div><div className="institution-role-note"><Shield size={12} /> Fictional staff-perspective only: no real employment, appointment, powers or official affiliation. Election administration uses INEC for federal/FCT responsibilities and SIEC for state local-government elections.</div></>}
    <div className="starter-bonus"><span className="bonus-icon"><Banknote size={17} /></span><div><small>FICTIONAL STORY FUNDS · NO REAL MONEY</small><strong>₦1,000,000 <i>IN-GAME</i></strong></div><BadgeCheck size={16} /></div><div className="starter-disclaimer"><LockKeyhole size={12} />Fictional, non-transferable funds; no real-money transfer or withdrawal exists.</div>
    <div className="account-start-panel"><div className="account-section-label"><LockKeyhole size={12} /> ACCOUNT-BACKED FOUNDATION</div><AccountAccessForm authReady={authReady} authEnabled={authConfig.authEnabled} persistenceConfigured={authConfig.persistenceConfigured} persistenceEnabled={authConfig.persistenceEnabled} authSession={authSession} busy={authBusy} alias={alias} onSubmit={onAuth} onSignOut={onSignOut} onSuccess={onAccountSuccess} /></div>
    <button className="welcome-cta" onClick={onStart}>{startLabel} <ArrowRight size={16} /></button><div className="welcome-bottom"><span><Shield size={12} /> FICTIONAL WORLD · ONE POLITICAL LADDER · INSTITUTIONS ARE ROLEPLAY</span><span>PRE-ALPHA</span></div></div></div></div>;
}

function GameModal({ modal, onClose, onAcceptMeetingInvite, onIllegalConfirm, onPrepareEvidence, onFilePetition, onReset, onContestConfirm, onJoinPolitical, profile }) {
  const [partyQuery, setPartyQuery] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState(PARTY_OPTIONS[0].id);
  if (!modal) return null;
  const close = () => onClose();
  if (modal.type === 'join-party') {
    const visibleParties = PARTY_OPTIONS.filter((item) => `${item.tag} ${item.name}`.toLowerCase().includes(partyQuery.trim().toLowerCase()));
    const selectedParty = PARTY_OPTIONS.find((item) => item.id === selectedPartyId) || PARTY_OPTIONS[0];
    return <div className="modal-backdrop"><section className="join-party-modal modal-card"><button className="modal-close" onClick={close} aria-label="Close party selection"><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><Flag size={20} /></span><span className="modal-eyebrow">VOLUNTARY STORY SWITCH · ONE POLITICAL LADDER</span></div><h2>Join a registered party?</h2><p>This switches your character from institutional roleplay into the existing political ladder at chapter 1. It does <strong>not</strong> appoint you or award an office. Your fictional funds and civic-story record stay; all later political positions still require paid contests.</p><div className="party-select-head"><div className="party-pick-label">CHOOSE AN INEC-REGISTERED PARTY<small>SNAPSHOT CHECKED {partyRegisterDateLabel}</small></div><label className="party-search"><Search size={13} /><input value={partyQuery} onChange={(event) => setPartyQuery(event.target.value)} placeholder="Search acronym or name" aria-label="Search registered parties" /></label></div><div className="party-picks join-party-picks">{visibleParties.map((item) => <button type="button" key={item.id} className={`party-pick ${selectedPartyId === item.id ? 'selected' : ''}`} onClick={() => setSelectedPartyId(item.id)} style={{ '--party-color': item.color }}><img src={item.logo} alt="" loading="lazy" /><span className="party-radio">{selectedPartyId === item.id && <i />}</span><span className="party-pick-copy"><b>{item.tag}</b><small>{item.name}</small></span><span className="party-color-mark" /></button>)}</div>{visibleParties.length === 0 && <div className="party-no-results">No registered party matches that search.</div>}<div className="party-register-note">Registered status is not a final 2027 candidate/ballot list. <a href={PARTY_REGISTER_SOURCE} target="_blank" rel="noreferrer">VIEW INEC REGISTER</a></div><div className="join-party-selected"><span>SELECTED PARTY</span><strong>{selectedParty.tag} · {selectedParty.name}</strong></div><div className="modal-actions"><button className="secondary-button" onClick={close}>NOT NOW</button><button className="primary-action" onClick={() => onJoinPolitical(selectedParty.id)}>JOIN LADDER · CHAPTER 1 <ArrowRight size={14} /></button></div></section></div>;
  }
  if (modal.type === 'contest-confirm') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal contest-confirm-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><Flag size={20} /></span><span className="modal-eyebrow">ONE CURRENT POSITION · PAID CONTEST</span></div><h2>Release your current office?</h2><p>You currently hold <strong>{modal.office?.title}</strong>. To enter the contest for <strong>{modal.chapter?.office}</strong>, you must vacate the existing role first. Your character will never have two active positions.</p><div className="contest-cost-box"><span>ENTRY COST · IN-GAME ONLY</span><b>₦{money(modal.fee)}</b></div><div className="dialog-note"><Shield size={14} /><span>The fee is charged whether you win or lose. At least one rival is included; no office is awarded unopposed or for free. If you lose, you leave with no current office.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>KEEP CURRENT OFFICE</button><button className="primary-action" onClick={onContestConfirm}>VACATE & ENTER · ₦{money(modal.fee)} <ArrowRight size={14} /></button></div></div></div>;
  if (modal.type === 'meeting-invite') {
    const invite = modal.invite || {};
    const meeting = invite.meeting || {};
    const location = meeting.location || {};
    return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><Users size={20} /></span><span className="modal-eyebrow">CIVIC MEETING INVITATION</span></div><h2>{meeting.title || 'Join a civic meeting?'}</h2><p><strong>{invite.fromName || meeting.hostName || 'A player'}</strong> invited you to a typed, in-game meeting at <strong>{location.venueName || 'a civic venue'}</strong> in {location.state || 'Nigeria'}.</p><div className="dialog-note"><LockKeyhole size={14} /><span>Keep the conversation in-game. No personal contact details or real-world voter requests.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>NOT NOW</button><button className="primary-action" onClick={onAcceptMeetingInvite}>TRAVEL & JOIN <ArrowRight size={14} /></button></div></div></div>;
  }
  if (modal.type === 'illegal-confirm') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal danger-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon danger"><ShieldAlert size={20} /></span><span className="modal-eyebrow">HIGH-RISK EVENT · FICTIONAL MECHANIC</span></div><h2>Attempt illicit inducement?</h2><p>This abstract choice spends <strong>₦250,000</strong> and may give a short-term influence bump. It sharply damages trust and integrity, adds an investigation flag, and can undermine later legal challenges.</p><div className="danger-list"><span><Check size={12} />No tactics, scripts, or real-world voter targeting are shown.</span><span><Check size={12} />Bribery is addressed in the Electoral Act; this is a critical simulation.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>KEEP IT CLEAN</button><button className="danger-button" onClick={onIllegalConfirm}>TAKE THE RISK <ArrowRight size={14} /></button></div></div></div>;
  if (modal.type === 'legal') {
    const contest = profile.lastContest;
    const eligible = contest && contest.petitionEligible && !contest.won && !contest.petitioned;
    return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal legal-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon legal"><Scale size={20} /></span><span className="modal-eyebrow">EVIDENCE & DUE PROCESS</span></div><h2>Election petition desk</h2>{eligible ? <><p>Your last result was in <strong>{contest.chapterTitle}</strong>. You may prepare an evidence file and, if standing and statutory timelines allow in this fictional scenario, file a petition.</p><div className="legal-case-box"><div><small>OPEN CASE</small><strong>{contest.office}</strong></div><span className="case-result">LOSS · SIMULATED</span></div><div className="evidence-meter"><span>CASE FILES</span><b>{profile.evidence} READY</b><div className="evidence-track"><i style={{ width: `${Math.min(100, profile.evidence * 35)}%` }} /></div></div><div className="dialog-note"><InfoDot /><span>A petition can fail. Courts are not a shortcut to office; remedies follow evidence and due process.</span></div><div className="modal-actions"><button className="secondary-button" onClick={onPrepareEvidence} disabled={profile.cash < 65_000}>REVIEW EVIDENCE · ₦65K</button><button className="primary-action" onClick={onFilePetition} disabled={profile.evidence < 1 || profile.cash < 180_000 || contest.petitioned}>FILE PETITION · ₦180K <ArrowRight size={14} /></button></div></> : <><p>No unresolved lost contest is currently available. You can still learn how the process works, but real petitions require a lawful basis, standing, evidence, and strict time limits.</p><div className="legal-empty-state"><Scale size={22} /><strong>NO ACTIVE CASE</strong><span>{profile.evidence} evidence review{profile.evidence === 1 ? '' : 's'} in your local file</span></div><div className="dialog-note"><InfoDot /><span>Fictional case mechanics are simplified. Consult a qualified Nigerian lawyer for real legal matters.</span></div><div className="modal-actions"><button className="secondary-button" onClick={close}>CLOSE DESK</button><button className="primary-action" onClick={onPrepareEvidence} disabled={profile.cash < 65_000}>PREPARE A PRACTICE FILE · ₦65K <ArrowRight size={14} /></button></div></>}</div></div>;
  }
  if (modal.type === 'result') {
    const result = modal.contest;
    const appointment = result.typeLabel?.includes('APPOINTMENT');
    const internal = result.typeLabel?.includes('INTERNAL');
    const finalStage = Boolean(modal.finalStage);
    const eyebrow = result.won ? appointment ? 'SIMULATED APPOINTMENT REVIEW' : internal ? 'INTERNAL SELECTION ADVANCED' : 'FICTIONAL MANDATE SECURED' : 'THE PROCESS DID NOT ADVANCE';
    const headline = result.won ? finalStage ? 'The political ladder is complete.' : appointment ? 'A public-service review advances.' : 'The next political door opens.' : appointment ? 'The appointment review did not advance.' : 'A hard result. A new choice.';
    const paragraph = result.won
      ? appointment ? `Your public record reached the next fictional appointment-review milestone for ${result.office}. No real nomination or appointment has occurred.` : internal ? `Your campaign passed a fictional internal selection stage for ${result.office}. This is separate from the public ballot.` : `Your ${result.office.toLowerCase()} campaign carried the fictional simulation, ${result.support} to ${result.opponent}. This is not a real poll or prediction.`
      : appointment ? `The competitive merit-review score was ${result.support}; the rival nominee scored ${result.opponent}. Rebuild your record; no appointment occurred.` : `Your campaign scored ${result.support}; the rival scored ${result.opponent}. Rebuild support or accept the simulated result.`;
    return <div className="modal-backdrop" onMouseDown={close}><div className={`result-modal modal-card ${result.won ? 'won' : 'lost'}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="result-emblem">{result.won ? <Crown size={27} /> : <Activity size={27} />}</div><div className="modal-eyebrow">{eyebrow}</div><h2>{headline}</h2><p>{paragraph}</p><div className="result-scoreboard"><div><small>{appointment ? 'YOUR MERIT-REVIEW SCORE' : internal ? 'YOUR PARTY SUPPORT' : 'YOUR SIMULATED SUPPORT'}</small><strong>{result.support}<i>pts</i></strong></div><span>VS</span><div><small>{appointment ? 'RIVAL NOMINEE' : internal ? 'RIVAL DELEGATE GROUP' : 'RIVAL CAMPAIGN'}</small><strong>{result.opponent}<i>pts</i></strong></div></div><div className="result-contest-cost">PAID CONTEST · ₦{money(result.fee)} · {result.opponentName || 'RIVAL'} · {result.won ? 'POSITION CONTESTED AND WON' : 'NO POSITION AWARDED'}</div>{result.won && modal.nextChapter && <div className="unlock-box"><span><Check size={13} /></span><div><small>NEXT CHAPTER UNLOCKED</small><strong>{modal.nextChapter.title} · {modal.nextChapter.office}</strong></div></div>}{!result.won && result.petitionEligible && <div className="dialog-note"><Scale size={14} /><span>The court desk is available only for a public-election loss and a genuine lawful basis; litigation is not guaranteed.</span></div>}<button className="primary-action result-continue" onClick={close}>{result.won ? 'CONTINUE THE STORY' : 'RETURN TO THE LADDER'} <ArrowRight size={14} /></button></div></div>;
  }
  if (modal.type === 'petition-result') return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon legal"><Scale size={20} /></span><span className="modal-eyebrow">FICTIONAL COURT OUTCOME</span></div><h2>{modal.succeeds ? 'A limited remedy is granted.' : 'The petition is dismissed.'}</h2><p>{modal.succeeds ? 'The court orders a lawful remedial process in the simulation. This does not automatically make you the office-holder; you must still follow the remedy.' : 'The evidence did not meet the simulated standard. The original result stands in this scenario.'}</p><div className="dialog-note"><Scale size={14} /><span>The game abstracts complex legal processes and is not legal advice.</span></div><div className="modal-actions"><button className="primary-action" onClick={close}>BACK TO THE CAMPAIGN <ArrowRight size={14} /></button></div></div></div>;
  if (modal.type === 'ending') return <div className="modal-backdrop ending-backdrop"><div className="ending-modal modal-card"><button className="modal-close" onClick={close}><X size={18} /></button><div className="ending-glow" /><div className="ending-kicker"><Crown size={14} /> THE REPUBLIC IS YOURS TO SERVE</div><h2>A mandate is<br /><em>only the beginning.</em></h2><p>You completed a fictional political-career arc and won the simulated national contest, {modal.contest.support} to {modal.contest.opponent}. The game ends with a choice: publish a transition plan, keep a promise to dissenters, and make your first 100 days accountable.</p><div className="ending-pill-row"><span><Check size={12} />12 CHAPTERS</span><span><Check size={12} />{profile.wins} SIMULATED WINS</span><span><Shield size={12} />{profile.integrity}% INTEGRITY</span></div><button className="primary-action" onClick={close}>OPEN THE TRANSITION JOURNAL <ArrowRight size={14} /></button><button className="secondary-button ending-restart" onClick={onReset}>START A NEW CANDIDATE</button></div></div>;
  if (modal.type === 'reset') { const storyType = profile.roleMode === 'institutional' ? 'institutional personnel story' : 'political story'; return <div className="modal-backdrop" onMouseDown={close}><div className="dialog-modal modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={close}><X size={18} /></button><div className="dialog-topline"><span className="dialog-icon"><Sparkles size={20} /></span><span className="modal-eyebrow">LOCAL SAVE</span></div><h2>Start a new story run?</h2><p>Your current {storyType} will be replaced by fresh onboarding, where you can choose a registered-party political start or fictional institutional roleplay. If you are signed in and cloud persistence is enabled, the new run becomes that account’s saved profile; the ₦1,000,000 funds remain in-game only.</p><div className="modal-actions"><button className="secondary-button" onClick={close}>KEEP THIS RUN</button><button className="primary-action" onClick={onReset}>CREATE NEW RUN <ArrowRight size={14} /></button></div></div></div>; }
  return null;
}

export default App;
