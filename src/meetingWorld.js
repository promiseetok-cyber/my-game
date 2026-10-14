import { WORLD_VENUES } from './data.js';

const MEETING_RING_SPOTS = 24;
const MEETING_RING_RADIUS = 5.2;
const toTurn = (value) => ((value % 360) / 360) * Math.PI * 2;

function stableHash(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic, distinct gathering positions around a venue for each live attendee. */
export function meetingArrivalPoint(meetingId, venueId, playerId = 'guest-player', requestedSlot = null) {
  const venue = WORLD_VENUES.find((item) => item.id === venueId) || WORLD_VENUES.find((item) => item.id === 'square');
  const slot = requestedSlot !== null && requestedSlot !== undefined && Number.isInteger(Number(requestedSlot)) && Number(requestedSlot) >= 0
    ? Number(requestedSlot)
    : stableHash(`${meetingId || 'meeting'}:${playerId || 'guest-player'}`) % MEETING_RING_SPOTS;
  const ring = Math.floor(slot / MEETING_RING_SPOTS);
  const ringIndex = slot % MEETING_RING_SPOTS;
  const rotation = toTurn(stableHash(meetingId || venue?.id || 'meeting') % 360);
  const angle = rotation + (ringIndex / MEETING_RING_SPOTS) * Math.PI * 2 + ring * 0.11;
  const radius = MEETING_RING_RADIUS + ring * 1.35;
  return {
    x: (venue?.x || 0) + Math.cos(angle) * radius,
    z: (venue?.z || 0) + Math.sin(angle) * radius,
  };
}
