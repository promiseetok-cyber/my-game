const FIRST_NAMES = [
  'Amina', 'Bisi', 'Chinedu', 'Dayo', 'Efe', 'Femi', 'Halima', 'Ifeoma', 'Kelechi', 'Ladi',
  'Musa', 'Nkiru', 'Obinna', 'Ogechi', 'Rashida', 'Sadiq', 'Tayo', 'Uchenna', 'Yemi', 'Zainab',
  'Adaeze', 'Bala', 'Chika', 'Damilola', 'Emeka', 'Fatima', 'Gideon', 'Hadiza', 'Ibrahim', 'Jumoke',
  'Khadija', 'Maryam', 'Nnamdi', 'Olu', 'Peter', 'Rukayat', 'Sani', 'Tunde', 'Umar', 'Yusuf',
];
const LAST_NAMES = [
  'Abubakar', 'Adebayo', 'Adeyemi', 'Agboola', 'Akpan', 'Akinyemi', 'Aliyu', 'Amadi', 'Bako', 'Bello',
  'Danladi', 'Eze', 'Garba', 'Ibrahim', 'Ifeanyi', 'James', 'Jibril', 'Kalu', 'Lawal', 'Madu',
  'Mohammed', 'Nwosu', 'Obi', 'Okafor', 'Okeke', 'Olawale', 'Onyeka', 'Osei', 'Sule', 'Yakubu',
  'Yusuf', 'Zubairu', 'Abiodun', 'Anyanwu', 'Bassey', 'Danladi', 'Ekwueme', 'Falana', 'Gambo', 'Iwu',
  'Maiyaki', 'Nwachukwu', 'Ojo', 'Sani', 'Usman', 'Yakubu', 'Zakka', 'Ogunleye', 'Oladipo', 'Nwankwo',
];

export const LOCAL_EXECUTIVE_POSITIONS = [
  'Ward Chairperson',
  'Ward Secretary',
  'Ward Treasurer',
  'Ward Organising Secretary',
  'Ward Women Leader',
  'Ward Youth Leader',
];

function stableHash(text) {
  let value = 2166136261;
  for (const character of String(text)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

const normalizeName = (name) => String(name || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\b(?:hon|mr|mrs|ms|dr|prof|engr|chief|bar|barr)\.?\b/g, ' ').replace(/[^a-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

function localFictionalName(seed, occupied) {
  let attempt = 0;
  while (attempt < FIRST_NAMES.length * LAST_NAMES.length) {
    const token = `${seed}/${attempt}`;
    const firstIndex = stableHash(`${token}/first`) % FIRST_NAMES.length;
    const lastIndex = stableHash(`${token}/last`) % LAST_NAMES.length;
    const name = `${FIRST_NAMES[firstIndex]} ${LAST_NAMES[lastIndex]}`;
    const key = normalizeName(name);
    if (!occupied.has(key)) {
      occupied.add(key);
      return name;
    }
    attempt += 1;
  }
  throw new Error('Could not allocate a unique fictional local executive name.');
}

/**
 * Creates a reproducible, fictional local branch roster for the selected game locality.
 * Every generated person receives exactly one office in this roster. National officers
 * are kept separate and should only come from the INEC register snapshot.
 */
export function createLocalPartyBranches(parties, { state = '', lga = '', ward = '', reservedNames = [] } = {}) {
  const localityKey = `${state}/${lga}/${ward}`;
  const occupiedNames = new Set();
  for (const party of parties) {
    for (const nationalName of [party.chair, party.secretary]) {
      const key = normalizeName(nationalName);
      if (key) occupiedNames.add(key);
    }
  }
  for (const reservedName of reservedNames) {
    const key = normalizeName(reservedName);
    if (key) occupiedNames.add(key);
  }
  const branches = {};
  for (const party of parties) {
    branches[party.id] = LOCAL_EXECUTIVE_POSITIONS.map((position, index) => ({
      id: `${localityKey}/${party.id}/position-${index + 1}`,
      name: localFictionalName(`${localityKey}/${party.id}/${position}`, occupiedNames),
      position,
      partyId: party.id,
      partyName: party.name,
      localityKey,
      fictional: true,
    }));
  }
  return branches;
}
