export const PNP_NETWORK_NAMES = [
  "Salim Laouiti",
  "Carolin Wais",
  "Thomas Bigagli",
  "Tim Solle",
  "Philipp Hodl Hofheinz",
  "Guillaume Blondin-Walter",
  "Arthur Jamon",
  "Arthur Perissich",
  "Arthur Bessières",
  "Theodora Preda",
  "Luis Llorens Gonzalez",
  "Michele Luperini",
  "Rita Belarbi",
  "Gaspard Durand",
  "Katya Rozhkova",
  "Santiago Vivas",
  "Davide Rizzo",
  "Camilla Rizzi",
  "Valerio Mennone",
  "Tommaso Maschera",
  "Liam Kersbergen"
];

export function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents / diacritics
    .replace(/[^\p{L}\s]/gu, '') // remove emojis, symbols, numbers, punctuation
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const NORMALIZED_PNP_NAMES = PNP_NETWORK_NAMES.map(n => normalizeName(n));

export interface PnpConnectionMatch {
  name: string;
  profileUrl?: string;
}

export function formatLinkedinUrl(url?: string): string {
  if (!url) return '#';
  const match = url.match(/\/sales\/(people|lead)\/([^,/?]+)/);
  if (match && match[2]) return `https://www.linkedin.com/in/${match[2]}`;
  return url;
}

export function getMatchingPnpConnections(sharedConnections: any[]): PnpConnectionMatch[] {
  if (!Array.isArray(sharedConnections) || sharedConnections.length === 0) return [];
  const matches: PnpConnectionMatch[] = [];
  const seenNames = new Set<string>();
  
  for (const conn of sharedConnections) {
    const rawName = conn?.fullName || `${conn?.firstName || ''} ${conn?.lastName || ''}`.trim();
    if (!rawName) continue;
    const norm = normalizeName(rawName);
    if (!norm) continue;
    
    for (let i = 0; i < NORMALIZED_PNP_NAMES.length; i++) {
      const pnpNorm = NORMALIZED_PNP_NAMES[i];
      if (norm === pnpNorm || norm.startsWith(pnpNorm + ' ') || norm.endsWith(' ' + pnpNorm) || norm.includes(' ' + pnpNorm + ' ')) {
        const canonicalName = PNP_NETWORK_NAMES[i];
        if (!seenNames.has(canonicalName)) {
          seenNames.add(canonicalName);
          const rawUrl = conn?.profileUrl || conn?.profile_url || conn?.url || undefined;
          matches.push({
            name: canonicalName,
            profileUrl: rawUrl ? formatLinkedinUrl(rawUrl) : undefined
          });
        }
      }
    }
  }
  return matches;
}
