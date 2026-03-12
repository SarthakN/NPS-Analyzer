/**
 * Maps various state name formats to the canonical names used in us-atlas topology.
 * Handles: full names, abbreviations, common variations.
 */
export const STATE_NAME_MAP: Record<string, string> = {
  alabama: 'Alabama', ala: 'Alabama', al: 'Alabama',
  alaska: 'Alaska', ak: 'Alaska',
  arizona: 'Arizona', ariz: 'Arizona', az: 'Arizona',
  arkansas: 'Arkansas', ark: 'Arkansas', ar: 'Arkansas',
  california: 'California', calif: 'California', ca: 'California',
  colorado: 'Colorado', colo: 'Colorado', co: 'Colorado',
  connecticut: 'Connecticut', conn: 'Connecticut', ct: 'Connecticut',
  delaware: 'Delaware', del: 'Delaware', de: 'Delaware',
  'district of columbia': 'District of Columbia', dc: 'District of Columbia', 'washington dc': 'District of Columbia',
  florida: 'Florida', fla: 'Florida', fl: 'Florida',
  georgia: 'Georgia', ga: 'Georgia',
  hawaii: 'Hawaii', hi: 'Hawaii',
  idaho: 'Idaho', id: 'Idaho',
  illinois: 'Illinois', ill: 'Illinois', il: 'Illinois',
  indiana: 'Indiana', ind: 'Indiana', in: 'Indiana',
  iowa: 'Iowa', ia: 'Iowa',
  kansas: 'Kansas', kan: 'Kansas', ks: 'Kansas',
  kentucky: 'Kentucky', ky: 'Kentucky',
  louisiana: 'Louisiana', la: 'Louisiana',
  maine: 'Maine', me: 'Maine',
  maryland: 'Maryland', md: 'Maryland',
  massachusetts: 'Massachusetts', mass: 'Massachusetts', ma: 'Massachusetts',
  michigan: 'Michigan', mich: 'Michigan', mi: 'Michigan',
  minnesota: 'Minnesota', minn: 'Minnesota', mn: 'Minnesota',
  mississippi: 'Mississippi', miss: 'Mississippi', ms: 'Mississippi',
  missouri: 'Missouri', mo: 'Missouri',
  montana: 'Montana', mont: 'Montana', mt: 'Montana',
  nebraska: 'Nebraska', neb: 'Nebraska', ne: 'Nebraska',
  nevada: 'Nevada', nev: 'Nevada', nv: 'Nevada',
  'new hampshire': 'New Hampshire', nh: 'New Hampshire',
  'new jersey': 'New Jersey', nj: 'New Jersey',
  'new mexico': 'New Mexico', nm: 'New Mexico',
  'new york': 'New York', ny: 'New York',
  'north carolina': 'North Carolina', nc: 'North Carolina',
  'north dakota': 'North Dakota', nd: 'North Dakota',
  ohio: 'Ohio', oh: 'Ohio',
  oklahoma: 'Oklahoma', okla: 'Oklahoma', ok: 'Oklahoma',
  oregon: 'Oregon', ore: 'Oregon', or: 'Oregon',
  pennsylvania: 'Pennsylvania', penn: 'Pennsylvania', pa: 'Pennsylvania',
  'rhode island': 'Rhode Island', ri: 'Rhode Island',
  'south carolina': 'South Carolina', sc: 'South Carolina',
  'south dakota': 'South Dakota', sd: 'South Dakota',
  tennessee: 'Tennessee', tenn: 'Tennessee', tn: 'Tennessee',
  texas: 'Texas', tex: 'Texas', tx: 'Texas',
  utah: 'Utah', ut: 'Utah',
  vermont: 'Vermont', vt: 'Vermont',
  virginia: 'Virginia', va: 'Virginia',
  washington: 'Washington', wash: 'Washington', wa: 'Washington',
  'west virginia': 'West Virginia', wv: 'West Virginia',
  wisconsin: 'Wisconsin', wis: 'Wisconsin', wi: 'Wisconsin',
  wyoming: 'Wyoming', wyo: 'Wyoming', wy: 'Wyoming',
};

export function normalizeStateName(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  return STATE_NAME_MAP[key] ?? trimmed;
}
