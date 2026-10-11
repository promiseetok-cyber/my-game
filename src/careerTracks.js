import { CHAPTERS } from './data.js';

// One continuous player progression: youth/community organising → elected,
// internal and appointed political roles → the fictional presidential run.
export const CAREER_TRACKS = [
  {
    id: 'politics',
    label: 'Political leadership',
    shortLabel: 'POLITICAL LADDER',
    classification: 'ELECTED + INTERNAL + APPOINTED ROLES',
    description: 'One continuous political career. The judiciary, election administrators, and central bank appear as independent institutions and character storylines around that ladder—not as replacement player careers.',
    stages: CHAPTERS.map((chapter, index) => ({
      ...chapter,
      number: String(index + 1).padStart(2, '0'),
      shared: index === 0,
      resolution: chapter.kind === 'race' ? 'public ballot' : chapter.kind === 'primary' ? 'internal selection' : chapter.kind === 'appointment' ? 'appointment / review' : 'public story',
    })),
  },
];

export const CAREER_TRACK_BY_ID = Object.fromEntries(CAREER_TRACKS.map((track) => [track.id, track]));
export const DEFAULT_CAREER_TRACK = 'politics';
export const getCareerTrack = (id) => CAREER_TRACK_BY_ID[id] || CAREER_TRACK_BY_ID[DEFAULT_CAREER_TRACK];

// These are the institution-side storylines running alongside the player's
// political ladder. The roles and legal routes are explicit; they are not
// portrayed as elected campaign offices or player promotions.
export const INSTITUTIONAL_STORY_ARCS = [
  {
    id: 'judiciary', label: 'The independent bench', shortLabel: 'JUDICIARY', venueId: 'court',
    lead: 'Barr. Amina Danjuma · fictional counsel',
    rolePath: 'Law degree & Bar training → years of legal practice → judicial appointment under the Constitution → appellate service.',
    pathwayNote: 'Judges are not elected. Recommendation, appointment, confirmation (where specified), and minimum years-at-the-Bar vary by court and jurisdiction.',
    source: 'Federal Ministry of Justice — Constitution of the Federal Republic of Nigeria, 1999 (as altered), Chapter VII',
    sourceUrl: 'https://justice.gov.ng/wp-content/uploads/2020/09/Nigerian-Constitution.pdf',
    episodeTitle: 'The petition file',
    scenario: 'A legal team asks your campaign to submit only verifiable public records in a fictional election petition. The court—not a politician—controls its independent process.',
    prompt: 'How will you respond while respecting due process and judicial independence?',
    choices: [
      { id: 'full-record', label: 'Provide a complete, auditable record', effects: { trust: 2, integrity: 4, influence: 0 }, outcome: 'The team receives a complete index and chain-of-custody note. The court remains free to decide.' },
      { id: 'public-brief', label: 'Publish a factual public briefing, then defer', effects: { trust: 3, integrity: 3, influence: 1 }, outcome: 'You explain the public record and leave legal conclusions to the court.' },
      { id: 'respect-process', label: 'Ask counsel to use formal channels only', effects: { trust: 1, integrity: 4, influence: 0 }, outcome: 'All contact is routed through formal filings; no private approach is made to a judge.' },
    ],
  },
  {
    id: 'inec', label: 'The federal election desk', shortLabel: 'INEC', venueId: 'assembly',
    lead: 'Musa Garba · fictional field officer',
    rolePath: 'Electoral operations → Resident Electoral Commissioner (REC) / National Electoral Commissioner → INEC Chairperson (appointment route).',
    pathwayNote: 'INEC is an independent constitutional commission. Its chair and members are appointed through constitutional processes; these are not partisan or elected campaign titles.',
    source: 'Federal Ministry of Justice — Constitution of the Federal Republic of Nigeria, 1999 (as altered), sections 153–158 and Third Schedule',
    sourceUrl: 'https://justice.gov.ng/wp-content/uploads/2020/09/Nigerian-Constitution.pdf',
    episodeTitle: 'A collation-centre query',
    scenario: 'An INEC field team flags a documentation gap at a fictional collation centre. Your campaign wants clarity, but officials must remain impartial and follow the rules.',
    prompt: 'Write a brief public response and choose a lawful way to ask for clarification.',
    choices: [
      { id: 'formal-query', label: 'Submit a documented query through the official channel', effects: { trust: 2, integrity: 4, influence: 0 }, outcome: 'The concern is logged through the official process; officials are not pressured or targeted.' },
      { id: 'publish-facts', label: 'Share verified facts and avoid speculation', effects: { trust: 4, integrity: 3, influence: 1 }, outcome: 'The campaign publishes only confirmed information and asks supporters to wait for the process.' },
      { id: 'observe', label: 'Request accredited observation and preserve records', effects: { trust: 3, integrity: 4, influence: 0 }, outcome: 'The request stays within lawful observation and evidence-preservation channels.' },
    ],
  },
  {
    id: 'siec', label: 'The state local-election desk', shortLabel: 'SIEC', venueId: 'ward',
    lead: 'Chief Nneka Eze · fictional civic observer',
    rolePath: 'Local-election operations → SIEC commissioner / chairperson under the relevant state’s rules.',
    pathwayNote: 'A State Independent Electoral Commission is separate from INEC and administers local-government elections in its state. State laws govern commission arrangements; INEC conducts FCT Area Council elections.',
    source: 'Federal Ministry of Justice — Constitution 1999, official 2020 compilation (First–Third Alterations), Third Schedule Part II (SIECs)',
    sourceUrl: 'https://justice.gov.ng/wp-content/uploads/2020/09/Nigerian-Constitution.pdf',
    episodeTitle: 'Who runs the local poll?',
    scenario: 'Residents ask whether a local-government election is being administered by INEC or the state commission. Your team must correct a mistaken campaign flyer without blurring the institutions.',
    prompt: 'Type a short correction, then choose how to make the explanation accessible.',
    choices: [
      { id: 'clear-correction', label: 'Correct the flyer and name the responsible commission', effects: { trust: 3, integrity: 3, influence: 1 }, outcome: 'The correction distinguishes a state SIEC local-government poll from INEC’s federal/state and FCT Area Council roles.' },
      { id: 'local-rules', label: 'Link to the state-specific law and ask for review', effects: { trust: 2, integrity: 4, influence: 0 }, outcome: 'The team avoids assuming one rule across all states and directs readers to the relevant law.' },
      { id: 'accessibility', label: 'Publish the correction in accessible formats', effects: { trust: 4, integrity: 3, influence: 0 }, outcome: 'A plain-language, accessible correction is circulated without implying a guaranteed result.' },
    ],
  },
  {
    id: 'cbn', label: 'The central-bank briefing', shortLabel: 'CBN', venueId: 'assembly',
    lead: 'Dr. Tunde Okafor · fictional economist',
    rolePath: 'Economic analyst / CBN professional service → Deputy Governor → Governor (statutory presidential appointment and Senate confirmation).',
    pathwayNote: 'The CBN is not a campaign office. The CBN Act provides for presidential appointment of the Governor and Deputy Governors, subject to Senate confirmation and recognized financial experience.',
    source: 'Central Bank of Nigeria Act 2007, section 8',
    sourceUrl: 'https://www.cbn.gov.ng/OUT/PUBLICATIONS/BSD/2007/CBNACT.PDF',
    episodeTitle: 'A stability briefing',
    scenario: 'A fictional CBN analyst briefs legislators on price stability, financial-system resilience, and the trade-offs of a proposed intervention. The bank’s statutory independence must be respected.',
    prompt: 'Write one question for the briefing and choose a response that respects evidence and institutional boundaries.',
    choices: [
      { id: 'evidence', label: 'Ask for the evidence, risks and review date', effects: { trust: 3, integrity: 4, influence: 0 }, outcome: 'The question asks for evidence and review criteria without directing an independent monetary decision.' },
      { id: 'public-impact', label: 'Ask how households and small firms are affected', effects: { trust: 4, integrity: 3, influence: 1 }, outcome: 'The briefing records distributional effects while keeping policy judgment with the institution.' },
      { id: 'transparency', label: 'Request a clear public explanation of trade-offs', effects: { trust: 3, integrity: 4, influence: 0 }, outcome: 'The request focuses on transparent communication, not partisan control of the central bank.' },
    ],
  },
];
