import { PARTY_REGISTRY } from './partyRegistry.js';

export const STATES = [
  { name: 'Abia', capital: 'Umuahia', zone: 'South East', landmark: 'Ariaria market district', terrain: 'southeast' },
  { name: 'Adamawa', capital: 'Yola', zone: 'North East', landmark: 'River Benue waterfront', terrain: 'northeast' },
  { name: 'Akwa Ibom', capital: 'Uyo', zone: 'South South', landmark: 'Godswill Akpabio Stadium', terrain: 'coastal' },
  { name: 'Anambra', capital: 'Awka', zone: 'South East', landmark: 'Civic and market quarter', terrain: 'southeast' },
  { name: 'Bauchi', capital: 'Bauchi', zone: 'North East', landmark: 'State museum quarter', terrain: 'northeast' },
  { name: 'Bayelsa', capital: 'Yenagoa', zone: 'South South', landmark: 'Isaac Boro Park', terrain: 'coastal' },
  { name: 'Benue', capital: 'Makurdi', zone: 'North Central', landmark: 'River Benue bridge', terrain: 'northcentral' },
  { name: 'Borno', capital: 'Maiduguri', zone: 'North East', landmark: 'Shehu’s Palace quarter', terrain: 'northeast' },
  { name: 'Cross River', capital: 'Calabar', zone: 'South South', landmark: 'Marina waterfront', terrain: 'coastal' },
  { name: 'Delta', capital: 'Asaba', zone: 'South South', landmark: 'Niger Bridge approach', terrain: 'coastal' },
  { name: 'Ebonyi', capital: 'Abakaliki', zone: 'South East', landmark: 'Abakaliki civic centre', terrain: 'southeast' },
  { name: 'Edo', capital: 'Benin City', zone: 'South South', landmark: 'Benin City moat district', terrain: 'coastal' },
  { name: 'Ekiti', capital: 'Ado-Ekiti', zone: 'South West', landmark: 'Olosunta Hills view', terrain: 'southwest' },
  { name: 'Enugu', capital: 'Enugu', zone: 'South East', landmark: 'Coal Camp heritage quarter', terrain: 'southeast' },
  { name: 'Gombe', capital: 'Gombe', zone: 'North East', landmark: 'Gombe civic square', terrain: 'northeast' },
  { name: 'Imo', capital: 'Owerri', zone: 'South East', landmark: 'Mbari cultural centre', terrain: 'southeast' },
  { name: 'Jigawa', capital: 'Dutse', zone: 'North West', landmark: 'Dutse Emir’s Palace quarter', terrain: 'northwest' },
  { name: 'Kaduna', capital: 'Kaduna', zone: 'North West', landmark: 'Kaduna railway station', terrain: 'northwest' },
  { name: 'Kano', capital: 'Kano', zone: 'North West', landmark: 'Kurmi market quarter', terrain: 'northwest' },
  { name: 'Katsina', capital: 'Katsina', zone: 'North West', landmark: 'Gobarau Minaret district', terrain: 'northwest' },
  { name: 'Kebbi', capital: 'Birnin Kebbi', zone: 'North West', landmark: 'Birnin Kebbi civic square', terrain: 'northwest' },
  { name: 'Kogi', capital: 'Lokoja', zone: 'North Central', landmark: 'Confluence waterfront', terrain: 'northcentral' },
  { name: 'Kwara', capital: 'Ilorin', zone: 'North Central', landmark: 'Ilorin central mosque district', terrain: 'northcentral' },
  { name: 'Lagos', capital: 'Ikeja', zone: 'South West', landmark: 'Ikeja civic and transit hub', terrain: 'coastal' },
  { name: 'Nasarawa', capital: 'Lafia', zone: 'North Central', landmark: 'Lafia civic quarter', terrain: 'northcentral' },
  { name: 'Niger', capital: 'Minna', zone: 'North Central', landmark: 'Minna railway and civic quarter', terrain: 'northcentral' },
  { name: 'Ogun', capital: 'Abeokuta', zone: 'South West', landmark: 'Olumo Rock approach', terrain: 'southwest' },
  { name: 'Ondo', capital: 'Akure', zone: 'South West', landmark: 'Akure civic park', terrain: 'southwest' },
  { name: 'Osun', capital: 'Osogbo', zone: 'South West', landmark: 'Osogbo cultural district', terrain: 'southwest' },
  { name: 'Oyo', capital: 'Ibadan', zone: 'South West', landmark: 'Mapo Hall ridge', terrain: 'southwest' },
  { name: 'Plateau', capital: 'Jos', zone: 'North Central', landmark: 'Jos wildlife park edge', terrain: 'northcentral' },
  { name: 'Rivers', capital: 'Port Harcourt', zone: 'South South', landmark: 'Port Harcourt waterfront', terrain: 'coastal' },
  { name: 'Sokoto', capital: 'Sokoto', zone: 'North West', landmark: 'Sultan’s Palace quarter', terrain: 'northwest' },
  { name: 'Taraba', capital: 'Jalingo', zone: 'North East', landmark: 'Jalingo civic garden', terrain: 'northeast' },
  { name: 'Yobe', capital: 'Damaturu', zone: 'North East', landmark: 'Damaturu central roundabout', terrain: 'northeast' },
  { name: 'Zamfara', capital: 'Gusau', zone: 'North West', landmark: 'Gusau civic square', terrain: 'northwest' },
  { name: 'Federal Capital Territory', capital: 'Abuja', zone: 'North Central', landmark: 'Three Arms Zone', terrain: 'northcentral' },
];

export const CHAPTERS = [
  {
    id: 'ward-roots', number: '01', title: 'Start in public', phase: 'SHARED CIVIC STORY', office: 'Community organiser · no office awarded',
    location: 'Community square', goal: 'Listen, convene, and build a public record before the first contested position.', kind: 'story', shared: true,
    description: 'A common civic opening: gather different voices, make a practical commitment, and publish what the community said before continuing the political ladder. This is a voluntary story step, not a political appointment or office. Other public institutions appear as optional side stories.',
    objectives: ['Hold a listening session', 'Write a public commitment', 'Continue the political ladder'],
    fact: 'No political position is awarded in this opening scene. Community organising is voluntary; later offices require a paid, contested process.'
  },
  {
    id: 'party-congress', number: '02', title: 'The ward congress', phase: 'PARTY POLITICS', office: 'Ward Chairperson',
    location: 'Party office', goal: 'Win a transparent, paid internal contest.', kind: 'primary', contestFee: 15000,
    description: 'Party gatekeepers can open doors—or close them. Build support through a record, clear rules, and a coalition rather than secret promises.',
    objectives: ['Meet party members', 'Agree a public platform', 'Face a delegate vote'],
    fact: 'Party primaries and congresses are internal party processes, not public elections.'
  },
  {
    id: 'councillor', number: '03', title: 'A seat at council', phase: 'LOCAL GOVERNMENT', office: 'Councillor',
    location: 'Ward hall', goal: 'Represent a ward on the council.', kind: 'race', contestFee: 20000,
    description: 'Take a local campaign from the ward hall to election day. Local-government election arrangements differ from federal and state contests.',
    objectives: ['Set out a ward agenda', 'Meet residents in public', 'Win the ward vote'],
    fact: 'State Independent Electoral Commissions conduct local-government elections in the states; INEC conducts FCT Area Council elections.'
  },
  {
    id: 'council-chair', number: '04', title: 'The council table', phase: 'LOCAL GOVERNMENT', office: 'Local Government Council Chairperson',
    location: 'Council chambers', goal: 'Lead a local-government administration.', kind: 'race', contestFee: 25000,
    description: 'The council race is about services, budgets, and trust. Residents will remember whether a campaign promise turns into an accountable plan.',
    objectives: ['Build an LGA-wide coalition', 'Defend a service budget', 'Win the council race'],
    fact: 'Local-government structures and election cycles can vary by state.'
  },
  {
    id: 'assembly', number: '05', title: 'The state house', phase: 'STATE POLITICS', office: 'Member, State House of Assembly',
    location: 'State Assembly', goal: 'Represent a state constituency.', kind: 'race', contestFee: 30000,
    description: 'A constituency campaign becomes a test of legislation, oversight, and public access—not just rallies.',
    objectives: ['Draft a bill brief', 'Answer a public debate', 'Win the constituency race'],
    fact: 'State Houses of Assembly make laws on matters assigned to states and oversee state government.'
  },
  {
    id: 'house-reps', number: '06', title: 'The green chamber', phase: 'FEDERAL LEGISLATURE', office: 'Member, House of Representatives',
    location: 'National Assembly', goal: 'Carry a federal constituency to Abuja.', kind: 'race', contestFee: 35000,
    description: 'Federal constituency work means balancing local casework with national legislation and scrutiny.',
    objectives: ['Build a constituency service record', 'Debate a national issue', 'Win the federal constituency'],
    fact: 'The National Assembly has a Senate and a House of Representatives.'
  },
  {
    id: 'senate', number: '07', title: 'The red chamber', phase: 'FEDERAL LEGISLATURE', office: 'Senator',
    location: 'Senate wing', goal: 'Represent a senatorial district.', kind: 'race', contestFee: 40000,
    description: 'A senatorial campaign is state-wide. A credible record, inclusion, and cross-district relationships matter more than a single headline.',
    objectives: ['Coordinate across districts', 'Table a policy package', 'Win the senatorial race'],
    fact: 'Each state returns three senators; the FCT returns one.'
  },
  {
    id: 'house-leadership', number: '08', title: 'The leadership vote', phase: 'LEGISLATIVE CAUCUS', office: 'Senate President',
    location: 'Caucus room', goal: 'Win a competitive internal leadership vote in a later chamber term.', kind: 'primary', contestFee: 20000,
    description: 'This is a paid internal vote among fictional chamber colleagues in a later term. Before entering a new contest, the player leaves the previous simulated office; the game tracks exactly one current position at a time.',
    objectives: ['Consult across caucuses', 'Publish a rules-and-reform pledge', 'Secure a caucus vote'],
    fact: 'The Speaker and Senate President are elected internally by members of their respective chambers.'
  },
  {
    id: 'cabinet', number: '09', title: 'A call to serve', phase: 'PUBLIC APPOINTMENT', office: 'State Commissioner',
    location: 'Executive secretariat', goal: 'Compete in a paid merit review among fictional nominees.', kind: 'appointment', contestFee: 25000,
    description: 'Some influential titles are appointed rather than directly elected. Build a public-service case, then face confirmation or oversight where required.',
    objectives: ['Show a track record', 'Answer a scrutiny hearing', 'Accept or decline a portfolio'],
    fact: 'Ministers and commissioners are appointments; they are not separate ballot positions.'
  },
  {
    id: 'governor', number: '10', title: 'The state mandate', phase: 'STATEWIDE ELECTION', office: 'Governor',
    location: 'State capital', goal: 'Win a statewide ticket and govern with accountability.', kind: 'race', contestFee: 50000,
    description: 'Build a ticket, defend a state plan, and campaign across very different communities without treating any group as a monolith.',
    objectives: ['Select a running mate', 'Debate a state budget', 'Win the governorship'],
    fact: 'Governors are elected with deputy governors; some state governorships are off-cycle.'
  },
  {
    id: 'party-convention', number: '11', title: 'The national convention', phase: 'PARTY POLITICS', office: 'Presidential Party Nominee',
    location: 'Convention arena', goal: 'Win the paid, competitive party nomination contest.', kind: 'primary', contestFee: 40000,
    description: 'A convention brings delegates, caucuses, coalition partners, and policy negotiations together. Every deal has a public-interest cost and a political cost.',
    objectives: ['Negotiate a coalition', 'Present a national platform', 'Win the party nomination'],
    fact: 'Party offices are internal; the presidential nominee is then presented to voters at the general election.'
  },
  {
    id: 'presidency', number: '12', title: 'Nigeria decides', phase: 'NATIONAL ELECTION', office: 'President',
    location: 'Abuja', goal: 'Win the national contest—or accept the result and choose a lawful next step.', kind: 'race', contestFee: 75000,
    description: 'The final chapter is a fictional 2027 scenario. Outcomes emerge from your decisions and simulated voter priorities; the game does not predict the real election.',
    objectives: ['Publish a costed national compact', 'Reach all six geopolitical zones', 'Face the simulated national vote'],
    fact: 'INEC’s current calendar lists 16 January 2027 for presidential and National Assembly polls and 6 February 2027 for governorship and State Assembly polls.'
  },
];

export const OFFICE_CATALOG = [
  {
    group: 'ELECTED — FEDERAL', icon: '◆', roles: [
      ['President', 'Head of the Federation; elected on a ticket with a Vice-President.'],
      ['Vice-President', 'Elected on the presidential ticket.'],
      ['Senator', 'Member of the Senate representing a state senatorial district; the FCT also has representation.'],
      ['Member, House of Representatives', 'Elected to represent a federal constituency.'],
    ]
  },
  {
    group: 'ELECTED — STATE', icon: '◆', roles: [
      ['Governor', 'State chief executive, elected with a Deputy Governor.'],
      ['Deputy Governor', 'Elected on the governor’s ticket.'],
      ['Member, State House of Assembly', 'Elected to a state constituency.'],
    ]
  },
  {
    group: 'ELECTED — LOCAL & FCT', icon: '◆', roles: [
      ['Council Chairman / Vice-Chairman', 'Local-government executive titles; state election arrangements vary.'],
      ['Councillor', 'Represents a ward in a local council.'],
      ['FCT Area Council Chairman / Vice-Chairman', 'Elected in FCT Area Council elections.'],
      ['FCT Area Council Councillor', 'Elected to an FCT council ward.'],
    ]
  },
  {
    group: 'LEGISLATIVE LEADERSHIP — INTERNAL', icon: '◇', roles: [
      ['Senate President / Deputy Senate President', 'Chosen by senators from among themselves.'],
      ['Senate Majority / Minority Leader', 'Caucus leadership roles within the Senate.'],
      ['Senate Chief Whip / Deputy Chief Whip', 'Internal party and chamber coordination roles.'],
      ['Speaker / Deputy Speaker, House of Representatives', 'Chosen by House members from among themselves.'],
      ['House Majority / Minority Leader', 'Caucus leadership roles within the House.'],
      ['House Chief Whip / Deputy Chief Whip', 'Internal party and chamber coordination roles.'],
      ['State Assembly Speaker / Deputy Speaker', 'Chosen internally by members of a State House.'],
      ['Assembly leaders / committee chairs', 'Assignments made under chamber rules; not separate public ballots.'],
    ]
  },
  {
    group: 'PARTY STRUCTURES — INTERNAL', icon: '◇', roles: [
      ['National / State / LGA / Ward Chairperson', 'Party leadership at different tiers; titles and selection rules vary by party constitution.'],
      ['Party Secretary / Assistant Secretary', 'Administrative leadership roles in party structures.'],
      ['Treasurer / Financial Secretary / Auditor', 'Party finance roles governed by party rules and applicable law.'],
      ['Organising / Publicity / Legal Secretary', 'Common party executive portfolios; exact titles vary.'],
      ['Women Leader / Youth Leader', 'Party-organising roles; structure and naming vary by party.'],
      ['Ward / LGA / State / National Executive Committee member', 'Internal party office at the relevant tier.'],
      ['Delegate / Convention delegate', 'Participates in a party nomination process where applicable.'],
      ['Party candidate / running mate', 'Internal nomination is followed by the relevant public election.'],
    ]
  },
  {
    group: 'APPOINTED — FEDERAL EXECUTIVE', icon: '○', roles: [
      ['Minister / Minister of State', 'Federal appointments; constitutional processes and Senate confirmation apply.'],
      ['Attorney-General of the Federation', 'Federal Minister of Justice and chief law officer of the Federation.'],
      ['Secretary to the Government of the Federation', 'Senior executive coordination role.'],
      ['Chief of Staff / National Security Adviser', 'Appointed advisory and executive support roles.'],
      ['Special Adviser / Senior Special Assistant', 'Advisory roles appointed by the executive.'],
      ['Permanent Secretary / Agency head', 'Senior public-service or statutory appointment; appointment rules vary.'],
      ['Board Chair / board member', 'Appointments to public bodies under their establishing laws.'],
    ]
  },
  {
    group: 'APPOINTED — STATE & LOCAL EXECUTIVE', icon: '○', roles: [
      ['Commissioner', 'State appointment; confirmation by the State House of Assembly applies.'],
      ['State Attorney-General / Commissioner for Justice', 'State chief law officer and executive portfolio.'],
      ['Secretary to the State Government', 'Senior state executive coordination role.'],
      ['Chief of Staff / Special Adviser / Senior Special Assistant', 'State executive appointments.'],
      ['Permanent Secretary / agency head', 'Senior public-service or statutory roles.'],
      ['LGA Secretary / Supervisory Councillor', 'Local executive/administrative titles; state laws and practice vary.'],
      ['Board Chair / member of a state body', 'Appointment to a state commission, board, or agency.'],
    ]
  },
  {
    group: 'APPOINTED / INDEPENDENT — PUBLIC INSTITUTIONS', icon: '○', roles: [
      ['INEC Chairperson / National Commissioner', 'Election-management leadership; institutionally distinct from party politics.'],
      ['Resident Electoral Commissioner (REC)', 'INEC’s state/FCT representative; not a partisan campaign office.'],
      ['Electoral Officer / Returning Officer', 'Election administration and result-return roles assigned for specific processes.'],
      ['SIEC Chairperson / Commissioner', 'State Independent Electoral Commission leadership for local elections; separate from INEC.'],
      ['Chief Justice of Nigeria / Supreme Court Justice', 'Judicial office; not an elected campaign title.'],
      ['Court of Appeal / High Court Judge', 'Judicial offices governed by constitutional appointment processes and qualifications.'],
      ['Election Petition Tribunal member', 'Judicial assignment for a petition; not a route to political office.'],
    ]
  },
  {
    group: 'CENTRAL BANK — PROFESSIONAL / APPOINTED', icon: '○', roles: [
      ['CBN Governor / Deputy Governor', 'Appointed under the Central Bank of Nigeria Act, subject to Senate confirmation; not elected posts.'],
      ['CBN Director / department head', 'Senior central-bank service role; recruitment and career rules are institution-specific.'],
      ['Monetary Policy Committee member', 'Committee membership follows statutory provisions; it is not a party nomination or public election.'],
      ['Central-bank economist / analyst', 'Professional policy and research service role, distinct from elected executive office.'],
    ]
  },
];

export const CAMPAIGN_SCENES = {
  service: {
    venueId: 'market', title: 'A neighbourhood service forum', format: 'PUBLIC SERVICE STORY', speaker: 'Fictional community convenor',
    prompt: 'Residents disagree about what to fix first. Write the first line you will say, then choose how to turn the concern into a public, checkable plan.',
    choices: [
      { id: 'co-design', label: 'Co-design the plan with residents', effects: { trust: 7, influence: 1, integrity: 3, coalition: 1 }, outcome: 'Residents will help define the work, publish the priorities, and review progress.' },
      { id: 'publish-costs', label: 'Publish costs and milestones first', effects: { trust: 4, influence: 3, integrity: 4, coalition: 0 }, outcome: 'A public cost sheet gives the neighbourhood something concrete to inspect.' },
      { id: 'quick-launch', label: 'Launch quickly, then report back', effects: { trust: 2, influence: 4, integrity: 0, coalition: 1 }, outcome: 'The launch creates visibility, but the follow-up will decide whether trust lasts.' },
    ],
  },
  coalition: {
    venueId: 'caucus', title: 'Coalition talks', format: 'CROSS-COMMUNITY ROUND TABLE', speaker: 'Fictional convenor',
    prompt: 'A partner wants a private assurance before joining. State your opening line and choose a transparent way to handle the disagreement.',
    choices: [
      { id: 'publish-terms', label: 'Publish shared terms and dissenting views', effects: { trust: 4, influence: 5, integrity: 4, coalition: 2 }, outcome: 'The coalition proceeds with a public agreement and a record of unresolved concerns.' },
      { id: 'slow-talks', label: 'Pause and invite an independent facilitator', effects: { trust: 6, influence: 2, integrity: 4, coalition: 1 }, outcome: 'The talks slow down, but each group gets a fair chance to explain its position.' },
      { id: 'narrow-deal', label: 'Agree only on a limited shared programme', effects: { trust: 2, influence: 4, integrity: 2, coalition: 1 }, outcome: 'A smaller pact is easier to verify; questions outside it remain open.' },
    ],
  },
  policy: {
    venueId: 'assembly', title: 'The policy lab', format: 'PUBLIC HEARING', speaker: 'Fictional policy clerk',
    prompt: 'A proposal sounds popular but its cost and delivery timeline are unclear. Write one sentence that explains your position.',
    choices: [
      { id: 'costed-plan', label: 'Publish a costed plan with milestones', effects: { trust: 6, influence: 2, integrity: 4, coalition: 0 }, outcome: 'The plan is recorded with a budget note, delivery milestones, and a review date.' },
      { id: 'pilot-first', label: 'Run a limited, independently reviewed pilot', effects: { trust: 5, influence: 3, integrity: 4, coalition: 1 }, outcome: 'A smaller pilot will test feasibility before public money is scaled up.' },
      { id: 'listen-again', label: 'Return to residents before committing', effects: { trust: 7, influence: 1, integrity: 3, coalition: 0 }, outcome: 'The proposal returns to consultation; no promise is made before the evidence is clearer.' },
    ],
  },
  rally: {
    venueId: 'stadium', title: 'A public address', format: 'OPEN COMMUNITY EVENT', speaker: 'Fictional event moderator',
    prompt: 'Deliver a short typed address. Make one promise you can explain, one limit you will acknowledge, and one way people can hold you to account.',
    choices: [
      { id: 'accountable', label: 'End with a public reporting commitment', effects: { trust: 5, influence: 6, integrity: 4, coalition: 1 }, outcome: 'The audience hears a reporting date and a public channel for scrutiny.' },
      { id: 'practical', label: 'Focus on one practical, costed priority', effects: { trust: 4, influence: 7, integrity: 3, coalition: 0 }, outcome: 'The address stays focused on a deliverable rather than sweeping promises.' },
      { id: 'inclusive', label: 'Invite questions and acknowledge disagreement', effects: { trust: 6, influence: 4, integrity: 4, coalition: 1 }, outcome: 'The address opens the floor to questions rather than presenting one community as a single voice.' },
    ],
  },
  consult: {
    venueId: 'caucus', title: 'A senior consultation', format: 'FICTIONAL ONE-TO-ONE STORY', speaker: 'Senior public figure',
    prompt: 'A senior figure asks what you will do with their advice. Write your answer, then decide whether to publish a commitment, ask a follow-up question, or decline the request.',
    choices: [
      { id: 'publish', label: 'Publish a checkable commitment', effects: { trust: 4, influence: 4, integrity: 3, coalition: 1 }, outcome: 'The consultation ends with a public, checkable follow-up rather than a guaranteed endorsement.' },
      { id: 'clarify', label: 'Ask for evidence and clarify the public interest', effects: { trust: 5, influence: 2, integrity: 4, coalition: 0 }, outcome: 'You ask for a written basis and keep the discussion focused on public service.' },
      { id: 'decline', label: 'Decline politely and explain why', effects: { trust: 2, influence: 1, integrity: 5, coalition: 0 }, outcome: 'You decline the ask respectfully and record the reason in your public journal.' },
    ],
  },
};

export const OTHER_SIDE_STORIES = [
  {
    id: 'judiciary', title: 'Behind the bench', classification: 'INDEPENDENT JUDICIARY · NOT A CAMPAIGN OFFICE',
    venueId: 'court', speaker: 'Fictional judicial officer',
    prompt: 'A petition creates pressure for a quick public answer. Write how you will respect the court’s independence while responding to residents.',
    fact: 'Judges are not elected. Judicial appointments follow constitutional processes and qualifications; election petitions are decided through evidence and due process.',
    choices: [
      { id: 'respect-process', label: 'Respect the court and publish only verified facts', effects: { trust: 3, influence: 1, integrity: 4 }, outcome: 'The campaign gives the court space to decide the case independently and shares only verified public information.' },
      { id: 'support-evidence', label: 'Ask counsel to explain evidence and timelines', effects: { trust: 2, influence: 2, integrity: 3 }, outcome: 'The response centres evidence, standing and statutory timelines—not pressure on a judge.' },
    ],
  },
  {
    id: 'inec', title: 'The election desk', classification: 'INEC · FEDERAL / STATE POLLS & FCT AREA COUNCILS',
    venueId: 'inec-office', speaker: 'Fictional election administrator',
    prompt: 'An observer raises a concern about public communication. Write a question that asks for transparency without directing an independent administrator.',
    fact: 'INEC is an independent constitutional commission. Its officials administer elections; they are not party campaign staff. INEC also conducts FCT Area Council elections.',
    choices: [
      { id: 'public-process', label: 'Request the published procedure and public record', effects: { trust: 2, influence: 2, integrity: 4 }, outcome: 'The campaign asks for the established public process and avoids private pressure on election officials.' },
      { id: 'observer-access', label: 'Support lawful observer access and clear communication', effects: { trust: 3, influence: 1, integrity: 4 }, outcome: 'The discussion focuses on transparent information and lawful access for accredited observers.' },
    ],
  },
  {
    id: 'siec', title: 'Local elections, local rules', classification: 'STATE INDEPENDENT ELECTORAL COMMISSION · NOT INEC',
    venueId: 'siec-office', speaker: 'Fictional state election administrator',
    prompt: 'Residents ask which body conducts local-government elections. Type a clear response that does not confuse state and federal responsibilities.',
    fact: 'State Independent Electoral Commissions conduct state local-government elections; INEC conducts FCT Area Council elections. State laws and arrangements differ.',
    choices: [
      { id: 'name-the-body', label: 'Name the correct commission and explain its remit', effects: { trust: 3, influence: 2, integrity: 3 }, outcome: 'The answer distinguishes the State Independent Electoral Commission from INEC and points people to the relevant state process.' },
      { id: 'check-state-law', label: 'Check the state law before making a claim', effects: { trust: 2, influence: 1, integrity: 4 }, outcome: 'The answer is careful: local procedures vary, so the public should verify the state-specific rules.' },
    ],
  },
  {
    id: 'cbn', title: 'Monetary policy briefing', classification: 'CENTRAL BANK · PROFESSIONAL / APPOINTED SERVICE',
    venueId: 'cbn-office', speaker: 'Fictional central-bank economist',
    prompt: 'A policy choice has competing effects on prices, growth and financial stability. Write a question about evidence and accountability without promising to direct an independent central bank.',
    fact: 'CBN Governor and Deputy Governors are appointed under the CBN Act, subject to Senate confirmation; the office is not elected and is distinct from party politics.',
    choices: [
      { id: 'ask-tradeoffs', label: 'Ask for evidence, risks and trade-offs', effects: { trust: 2, influence: 2, integrity: 4 }, outcome: 'The exchange focuses on evidence and trade-offs, while respecting statutory responsibilities.' },
      { id: 'public-explain', label: 'Request a plain-language public explanation', effects: { trust: 3, influence: 2, integrity: 3 }, outcome: 'The brief ends with a commitment to explain policy choices clearly without pretending the politician controls them.' },
    ],
  },
];

export const WORLD_VENUES = [
  { id: 'inec-office', short: 'INEC DESK', label: 'Election Commission Office', type: 'office', x: -10, z: -1, color: '#8fe2dc', desc: 'A fictional non-partisan election-administration story encounter.' },
  { id: 'siec-office', short: 'SIEC DESK', label: 'State Election Commission', type: 'office', x: -8, z: -5, color: '#8fe2dc', desc: 'A fictional state-level local-election administration encounter.' },
  { id: 'cbn-office', short: 'CBN DESK', label: 'Central Bank Office', type: 'office', x: 12, z: 3, color: '#8cb9ff', desc: 'A fictional central-banking policy briefing; not a political campaign venue.' },

  { id: 'ward', short: 'WARD HQ', label: 'Ward Office', type: 'office', x: -9, z: 4, color: '#d9f36b', desc: 'Meet ward organisers and work on the service charter.' },
  { id: 'square', short: 'CIVIC SQUARE', label: 'Community Square', type: 'square', x: -2, z: -5, color: '#ffc76a', desc: 'A public listening circle with residents and local associations.' },
  { id: 'market', short: 'MARKET', label: 'Market Street', type: 'market', x: 7, z: 5, color: '#ff9c75', desc: 'A busy trading district. Hear different concerns; no single group speaks for everyone.' },
  { id: 'court', short: 'COURT', label: 'Election Petition Court', type: 'court', x: 10, z: -3, color: '#8cb9ff', desc: 'Learn about evidence, deadlines, and lawful election petitions.' },
  { id: 'stadium', short: 'STADIUM', label: 'Unity Stadium', type: 'stadium', x: 1, z: 9, color: '#9ef09d', desc: 'A rally venue, sports ground, and public-event space.' },
  { id: 'airport', short: 'AIRPORT', label: 'Airport Terminal', type: 'airport', x: -11, z: -8, color: '#c8b8ff', desc: 'Board fictional state-to-state flights in economy, executive, business, first class or a private jet.' },
  { id: 'assembly', short: 'ASSEMBLY', label: 'Assembly Complex', type: 'assembly', x: 10, z: -9, color: '#8fe2dc', desc: 'Legislation, oversight, caucuses, and public hearings.' },
  { id: 'caucus', short: 'CAUCUS', label: 'Party & Caucus House', type: 'caucus', x: -1, z: 2, color: '#f5a1cc', desc: 'Consult a senior figure. Their demand may be a public-service pledge, not a private favour.' },
  { id: 'home', short: 'MY HOME', label: 'Player Residence', type: 'home', x: 16, z: 17, color: '#d8f36b', desc: 'Your fictional starter residence, garage and upgradeable property. Property ownership is saved in your local game profile.' },
];

export const NPCS = [
  { name: 'Hon. Iniobong Akpan', title: 'Ward Councillor · fictional', initial: 'IA', color: '#e1f08e', ask: 'Before you ask for my endorsement, bring a one-page plan for drainage and safe walking routes. Residents should be able to check the cost.' },
  { name: 'Barr. Amina Danjuma', title: 'Assembly Whip · fictional', initial: 'AD', color: '#ffc58a', ask: 'My caucus wants a clear promise on open committee hearings. Can you defend it when the cameras are off?' },
  { name: 'Chief Nneka Eze', title: 'Community convenor · fictional', initial: 'NE', color: '#b2a7ff', ask: 'Our people are not one voting bloc. Come listen, publish what you heard, and show what changed after the meeting.' },
  { name: 'Musa Garba', title: 'Youth network coordinator · fictional', initial: 'MG', color: '#8fdddb', ask: 'Talk about jobs, skills, and safe public spaces—with a delivery plan and a way for young people to hold you to it.' },
];

export const RESEARCH_NOTES = [
  {
    tag: '2023 GENERAL ELECTIONS',
    title: 'Technology, trust & transparency',
    body: 'The EU Election Observation Mission described the 2023 polls as competitive, while documenting shortcomings in transparency and administration, including the handling of result-transmission expectations and widespread allegations of vote-buying. The scenario turns these into choices about trust, evidence, and accountability—not a claim about every candidate or voter.',
    source: 'EU Election Observation Mission — Nigeria 2023 Final Report',
    url: 'https://www.eeas.europa.eu/eom-nigeria-2023/european-union-election-observation-mission-nigeria-2023-final-report_en'
  },
  {
    tag: 'ELECTORAL INTEGRITY',
    title: 'Inducement has consequences',
    body: 'The Electoral Act 2022 addresses bribery and related conduct. In this fictional sim, illicit inducement is an abstract high-risk choice: it may raise short-term campaign reach but can trigger an investigation, loss of trust, and a court challenge. No real-world tactics are provided.',
    source: 'Electoral Act 2022, Part VII, Section 121 (PLAC copy)',
    url: 'https://placng.org/i/wp-content/uploads/2022/02/Electoral-Act-2022.pdf'
  },
  {
    tag: 'ELECTION ADMINISTRATION',
    title: 'Different levels, different administrators',
    body: 'INEC conducts federal and state elections and the FCT Area Council elections. State Independent Electoral Commissions conduct local-government elections in the states. The prototype labels the local election route accordingly.',
    source: 'INEC — Frequently Asked Questions',
    url: 'https://wp1.inecnigeria.org/?page_id=812'
  },
  {
    tag: 'THE 2027 SCENARIO',
    title: 'A simulation, not a prediction',
    body: 'INEC’s election calendar lists 16 January 2027 for Presidential/National Assembly elections and 6 February 2027 for Governorship/State Assembly elections. The real results are not known. Party names/logos and dated national officer fields use INEC’s register; player characters, local branches, contests, endorsements, and story outcomes are fictional.',
    source: 'INEC — Full Election Calendar',
    url: 'https://inecnigeria.org/elections/calendar'
  },
  {
    tag: 'CULTURE & COALITIONS',
    title: 'Many communities, many voices',
    body: 'Nigerian politics is shaped by layered institutions and lived differences—not one national political culture. Voluntary consultations may involve traditional institutions (titles vary by locality, including Oba, Emir, Igwe, or Obong), faith communities, unions, market associations, youth networks, disability advocates, and civic groups. They are not treated as guaranteed voting blocs or as one national hierarchy.',
    source: 'Design note',
    url: 'https://inecnigeria.org/'
  },
  {
    tag: 'PARTY PRIMARIES',
    title: 'The gate before the ballot',
    body: 'The EU observation mission noted internal party conflicts, opacity, and allegations of vote-buying among delegates during the 2022–23 nomination cycle. In the game, congresses are their own stage: negotiate a public platform, build support, and face an internal vote.',
    source: 'EU Election Observation Mission — Nigeria 2023 Final Report',
    url: 'https://www.eeas.europa.eu/sites/default/files/documents/2023/EU%20EOM%20NGA%202023%20FR.pdf'
  },
  {
    tag: 'COURT CHALLENGES',
    title: 'A result can travel through the courts',
    body: 'After the 2023 presidential poll, petitions were heard by the Presidential Election Petition Court and appeals reached the Supreme Court. On 26 October 2023, the Supreme Court dismissed the appeals by Atiku Abubakar and Peter Obi and affirmed the earlier judgment. The sim treats court action as evidence- and time-bound, never a guaranteed shortcut.',
    source: 'Channels Television — Supreme Court ruling, 26 October 2023',
    url: 'https://www.channelstv.com/2023/10/26/supreme-court-dismisses-atiku-obis-appeals-affirms-tinubu-as-president/'
  },
  {
    tag: 'IDENTITY & RHETORIC',
    title: 'Coalitions without scapegoating',
    body: 'EU observers reported divisive campaign rhetoric exploiting ethnic and religious identities in some places during 2023. The game does not assign political preferences to a real community or offer targeting tactics; it rewards inclusive debate, fact-checking, and policies that can be checked.',
    source: 'EU Election Observation Mission — Nigeria 2023 Final Report',
    url: 'https://www.eeas.europa.eu/eom-nigeria-2023/european-union-election-observation-mission-nigeria-2023-final-report_en'
  },
  {
    tag: 'OFF-CYCLE ELECTIONS',
    title: 'Local contests are not one template',
    body: 'Nigeria’s governorship calendar includes off-cycle polls. Freedom House’s 2025 country report noted allegations of vote-buying and violence disrupting counting in Edo’s 2024 contest. The game varies local priorities and event pressure instead of flattening all states into one scene.',
    source: 'Freedom House — Nigeria: Freedom in the World 2025',
    url: 'https://freedomhouse.org/country/nigeria/freedom-world/2025'
  },
];

export const MAP_POINTS = {
  'Abia': [251, 253], 'Adamawa': [340, 183], 'Akwa Ibom': [274, 281], 'Anambra': [230, 237],
  'Bauchi': [277, 130], 'Bayelsa': [217, 279], 'Benue': [258, 226], 'Borno': [374, 113],
  'Cross River': [297, 262], 'Delta': [190, 255], 'Ebonyi': [269, 242], 'Edo': [173, 231],
  'Ekiti': [145, 199], 'Enugu': [249, 237], 'Gombe': [313, 144], 'Imo': [232, 258],
  'Jigawa': [266, 87], 'Kaduna': [202, 139], 'Kano': [231, 99], 'Katsina': [199, 84],
  'Kebbi': [111, 90], 'Kogi': [205, 207], 'Kwara': [174, 168], 'Lagos': [91, 226],
  'Nasarawa': [238, 195], 'Niger': [183, 130], 'Ogun': [106, 206], 'Ondo': [132, 224],
  'Osun': [147, 180], 'Oyo': [119, 164], 'Plateau': [264, 176], 'Rivers': [237, 275],
  'Sokoto': [103, 63], 'Taraba': [319, 212], 'Yobe': [344, 116], 'Zamfara': [163, 102],
  'Federal Capital Territory': [218, 189],
};

export const PARTY_OPTIONS = PARTY_REGISTRY;
