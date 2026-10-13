// Stable, fictional visual variation per state/LGA/community. This is a procedural art-direction
// layer, not a claim that every generated building or street is a surveyed real-world asset.
const DISTRICT_STYLES = {
  lagoon: [
    { id: 'lagoon-market', label: 'Lagoon market street', form: 'shopfront', roadPlan: 'market-spine', accent: '#f2a84a', walls: ['#f2c66d', '#4d9b88', '#d86d59', '#e8d8b8'], roofs: ['#8e5547', '#355e62', '#b57a4d'], awnings: ['#e7b540', '#2c8d91', '#e5684f', '#f5eee0'], compound: '#c6ac84' },
    { id: 'palm-boulevard', label: 'Palm boulevard', form: 'verandah', roadPlan: 'boulevard', accent: '#38a7a0', walls: ['#f0d3a0', '#4e947a', '#e1ad59', '#c7654e'], roofs: ['#56665e', '#ad6249', '#84724f'], awnings: ['#edbd44', '#3f9a8a', '#e56b55', '#fcf1d5'], compound: '#cbb695' },
    { id: 'canal-quarter', label: 'Canal-side quarter', form: 'stilt', roadPlan: 'waterfront', accent: '#4ca9b2', walls: ['#edc878', '#5b9f91', '#d77a58', '#efe3c4'], roofs: ['#46676a', '#9b5d48', '#c18b4d'], awnings: ['#e3b746', '#398e9d', '#d9684e', '#f2e5c7'], compound: '#bfa982' },
  ],
  delta: [
    { id: 'creek-stilts', label: 'Creekside stilt homes', form: 'stilt', roadPlan: 'waterfront', accent: '#39a99b', walls: ['#d9b575', '#4d927b', '#cf6f54', '#d6d9bb'], roofs: ['#526b5b', '#875643', '#c08a54'], awnings: ['#e5b644', '#329587', '#d65d4d', '#efe6ce'], compound: '#bba47d' },
    { id: 'port-frontage', label: 'Port-front market row', form: 'shopfront', roadPlan: 'market-spine', accent: '#e29d4c', walls: ['#e6bf73', '#4b9988', '#d57855', '#ead9b5'], roofs: ['#4c5d58', '#845447', '#b67849'], awnings: ['#e4b442', '#2e8d8e', '#d65f4d', '#f0e3c7'], compound: '#c5ad87' },
    { id: 'tidal-green', label: 'Tidal garden lane', form: 'verandah', roadPlan: 'boulevard', accent: '#4a9e80', walls: ['#e1ca94', '#5f9f7b', '#d88a62', '#e0dfbd'], roofs: ['#496759', '#925b46', '#b58a5d'], awnings: ['#dbb544', '#378f7f', '#d56a50', '#eee2c3'], compound: '#c0aa83' },
  ],
  sahel: [
    { id: 'courtyard-quarter', label: 'Shaded courtyard quarter', form: 'courtyard', roadPlan: 'market-spine', accent: '#d6a34c', walls: ['#d8bd8d', '#c6a473', '#eee0b8', '#ac8966'], roofs: ['#6a5946', '#857052', '#554c3e'], awnings: ['#c8864b', '#d5ad4c', '#55775f', '#ece0bf'], compound: '#bfa77e' },
    { id: 'shade-market', label: 'Canopied dryland market', form: 'shopfront', roadPlan: 'civic-ring', accent: '#d9ad57', walls: ['#e1c99a', '#c59f70', '#d8b587', '#b89a73'], roofs: ['#6c5b48', '#8a7655', '#584d41'], awnings: ['#c27f48', '#e0b94e', '#527858', '#e8d7b2'], compound: '#bba17b' },
    { id: 'red-earth-court', label: 'Red-earth civic court', form: 'courtyard', roadPlan: 'offset-grid', accent: '#c9824c', walls: ['#dabd91', '#c79b6e', '#e6d4ad', '#af8664'], roofs: ['#665843', '#80694d', '#51493d'], awnings: ['#c97e4c', '#d8ad4b', '#657b5d', '#ebdbb9'], compound: '#b59b76' },
  ],
  upland: [
    { id: 'granite-market', label: 'Granite-ridge market', form: 'stone-base', roadPlan: 'switchback', accent: '#c78055', walls: ['#d6bd9f', '#bd9477', '#b7c1a7', '#e4d2b8'], roofs: ['#5c6054', '#756858', '#514f47'], awnings: ['#cd7751', '#d5ae4c', '#5c886e', '#e9ddc4'], compound: '#b8a48b' },
    { id: 'ridge-verandah', label: 'Ridge verandah lane', form: 'verandah', roadPlan: 'offset-grid', accent: '#769a70', walls: ['#d9c6a6', '#c6aa8c', '#aebe9f', '#d6b3a0'], roofs: ['#626254', '#7a6e61', '#4e6256'], awnings: ['#c8754f', '#dbb54c', '#4e8c70', '#e7d8bc'], compound: '#c1af94' },
    { id: 'hill-service-road', label: 'Hillside service road', form: 'stone-base', roadPlan: 'switchback', accent: '#6d9390', walls: ['#d5c7aa', '#b7b89f', '#c9aa94', '#d4d5c3'], roofs: ['#5d6259', '#766c5c', '#495f5e'], awnings: ['#be704f', '#d5ad4a', '#4d8878', '#ece1ca'], compound: '#b7aa92' },
  ],
  planned: [
    { id: 'civic-boulevard', label: 'Civic boulevard', form: 'glass-front', roadPlan: 'boulevard', accent: '#81b4d8', walls: ['#dce2d7', '#a7c8c5', '#d5c9ad', '#c2c9c0'], roofs: ['#556863', '#66746e', '#4b6065'], awnings: ['#db8058', '#dfb94a', '#4b9b89', '#eff0df'], compound: '#bfc8bd' },
    { id: 'garden-estate', label: 'Garden estate street', form: 'verandah', roadPlan: 'offset-grid', accent: '#85a879', walls: ['#ded6c2', '#b9ccbd', '#c9d4c9', '#ddc7a9'], roofs: ['#5e6b63', '#788074', '#4d625f'], awnings: ['#d77c58', '#dbb645', '#4b907c', '#e7e5d6'], compound: '#c4c7b6' },
    { id: 'transit-quarter', label: 'Transit-quarter blocks', form: 'glass-front', roadPlan: 'civic-ring', accent: '#d2a353', walls: ['#d8ded7', '#b7c5c4', '#d7c6aa', '#c4d0c4'], roofs: ['#596760', '#737a71', '#4b5f63'], awnings: ['#d96f56', '#d5b34a', '#4a9789', '#f0ead9'], compound: '#c2c5b7' },
  ],
  forest: [
    { id: 'palm-belt-compounds', label: 'Palm-belt compounds', form: 'courtyard', roadPlan: 'offset-grid', accent: '#799b64', walls: ['#ddc49c', '#bd9f82', '#aebf9b', '#d8b6a2'], roofs: ['#5a6253', '#796855', '#4f6055'], awnings: ['#ca7450', '#dcb549', '#4b8c6d', '#eadbc0'], compound: '#c2ad8e' },
    { id: 'heritage-shop-row', label: 'Heritage shop row', form: 'shopfront', roadPlan: 'market-spine', accent: '#b87c4e', walls: ['#ddc49e', '#c5a183', '#bdc2a5', '#d6ae99'], roofs: ['#5a5f52', '#786654', '#4c5b51'], awnings: ['#c6704b', '#dbb247', '#4b8d6b', '#ead9b9'], compound: '#c0ae91' },
    { id: 'forest-verandah', label: 'Forest-edge verandah lane', form: 'verandah', roadPlan: 'boulevard', accent: '#5c9874', walls: ['#dfc9a4', '#c7a989', '#afc39c', '#d9b4a0'], roofs: ['#5e6254', '#78685a', '#4c6252'], awnings: ['#cb7851', '#dcb247', '#4f8c6e', '#eee0c4'], compound: '#c4b093' },
  ],
  middle: [
    { id: 'river-crossing', label: 'River-crossing town', form: 'shopfront', roadPlan: 'waterfront', accent: '#5a9c9e', walls: ['#d9c29b', '#c6aa83', '#abb99d', '#d8b29a'], roofs: ['#5d6255', '#786956', '#50615c'], awnings: ['#cb7850', '#dab54a', '#538870', '#eadbc0'], compound: '#bda98b' },
    { id: 'grain-market', label: 'Grain-market junction', form: 'courtyard', roadPlan: 'market-spine', accent: '#d2a74e', walls: ['#d7c09a', '#c5a77d', '#b4b998', '#d6b49a'], roofs: ['#655c4d', '#786b52', '#4f5e52'], awnings: ['#c77a4d', '#d9b24b', '#68845c', '#e8d8b9'], compound: '#bea989' },
    { id: 'farm-service-lane', label: 'Farm-service lane', form: 'stone-base', roadPlan: 'offset-grid', accent: '#9b9b62', walls: ['#d7c39e', '#c2a684', '#afb991', '#d8b59c'], roofs: ['#615b4c', '#796f56', '#526057'], awnings: ['#c9784d', '#d7b14a', '#5f8966', '#e7d9be'], compound: '#c0ad90' },
  ],
};

const TRANSPORT_POOLS = {
  lagoon: ['danfo', 'brt', 'keke', 'okada', 'sedan', 'pickup'],
  delta: ['water-taxi', 'minibus', 'keke', 'okada', 'pickup', 'sedan'],
  sahel: ['tricycle', 'minibus', 'taxi', 'motorcycle', 'pickup', 'bus'],
  upland: ['pickup', 'minibus', 'sedan', 'motorcycle', 'keke', 'bus'],
  planned: ['city-bus', 'shuttle', 'taxi', 'suv', 'motorcycle', 'pickup'],
  forest: ['minibus', 'keke', 'sedan', 'motorcycle', 'pickup', 'bus'],
  middle: ['pickup', 'minibus', 'tricycle', 'sedan', 'motorcycle', 'bus'],
};

function stableHash(text) {
  let value = 2166136261;
  for (const character of String(text)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

function districtFamily(profile = {}) {
  if (profile.kind === 'planned' || profile.architecture === 'planned') return 'planned';
  if (['delta', 'mangrove-city'].includes(profile.kind) || profile.vegetation === 'mangrove') return 'delta';
  if (profile.kind?.includes('sahel') || profile.vegetation === 'dry' || profile.architecture?.startsWith('north')) return 'sahel';
  if (profile.relief > 0.58 || profile.vegetation === 'highland') return 'upland';
  if (profile.kind === 'lagoon-city' || profile.architecture?.includes('coastal')) return 'lagoon';
  if (profile.architecture?.includes('middle')) return 'middle';
  if (profile.vegetation === 'rainforest' || profile.vegetation === 'forest') return 'forest';
  return 'middle';
}

/**
 * Produce repeatable LGA/ward-level geometry, palette and transport choices layered on
 * each state's separate biome/architecture profile. State, LGA, ward and coordinates
 * all contribute, so different locations resolve to different combinations.
 */
export function createLocalityVisualProfile(stateInfo, stateProfile, locality = null) {
  const stateName = stateInfo?.name || 'Unknown state';
  const lga = locality?.lga || stateInfo?.capital || 'Capital district';
  const ward = locality?.ward || 'Capital District';
  const coordinateKey = Number.isFinite(locality?.lat) && Number.isFinite(locality?.lon)
    ? `${locality.lat.toFixed(4)},${locality.lon.toFixed(4)}` : 'capital';
  const identity = `${stateName}/${lga}/${ward}/${coordinateKey}`;
  const seed = stableHash(identity);
  const family = districtFamily(stateProfile);
  const bank = DISTRICT_STYLES[family] || DISTRICT_STYLES.middle;
  const style = bank[seed % bank.length];
  const transport = TRANSPORT_POOLS[family] || TRANSPORT_POOLS.middle;
  const vehicleOffset = (seed >>> 7) % transport.length;
  const trafficMix = Array.from({ length: Math.min(5, transport.length) }, (_, index) => transport[(vehicleOffset + index) % transport.length]);
  const densityJitter = 0.84 + ((seed >>> 11) % 8) * 0.045;
  const densityScale = locality?.settlement === 'local' ? 0.92 : 1;
  return {
    identity,
    code: `${family}-${(seed >>> 16).toString(36)}-${(seed & 0xffff).toString(36)}`,
    family,
    label: style.label,
    form: style.form,
    roadPlan: style.roadPlan,
    accent: style.accent,
    houseColors: style.walls,
    roofColors: style.roofs,
    awningColors: style.awnings,
    compoundColor: style.compound,
    trafficMix,
    marketStalls: 2 + ((seed >>> 19) % 4) + (stateProfile?.density > 0.8 ? 2 : 0),
    densityFactor: densityJitter * densityScale,
    roadWidthFactor: 0.91 + ((seed >>> 3) % 7) * 0.035,
    vegetationFactor: 0.82 + ((seed >>> 23) % 6) * 0.09,
    roadsideAccent: style.accent,
    microLandmark: ['water tank', 'market canopy', 'bus shelter', 'civic roundabout', 'community hall', 'footbridge'][(seed >>> 13) % 6],
  };
}
