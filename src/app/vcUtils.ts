import { FOLLOWER_SOURCES } from './followerSources';
import { normalizeName, formatLinkedinUrl } from './pnpUtils';

export interface VcConnectionMatch {
  fundName: string;
  investorNames: string[];
  fundLogo?: string;
  profileUrl?: string;
}

const KNOWN_ALIASES: Record<string, string> = {
  'victor huerbe': 'victor h',
  'naseem moumene': 'naseem m',
  'maximilian ochs': 'dr maximilian ochs',
  'dr maximilian ochs': 'maximilian ochs',
  'madison lenormand': 'madison lenormand phd',
  'madison lenormand phd': 'madison lenormand',
  'thomas fernandez debets': 'thomas fernandez debets dphil',
  'thomas fernandez debets dphil': 'thomas fernandez debets',
  'federico de ponte fede': 'federico de ponte',
};

function cleanPersonName(name: string): string {
  if (!name) return '';
  let str = name.replace(/\([^)]*\)/g, ' '); // remove (Fede), etc.
  str = str.replace(/\b(dr|phd|dphil|mba|md|msc|bsc|esq)\b/gi, ' ');
  return normalizeName(str);
}

export function getMatchingVcConnections(
  sharedConnections: any[],
  excludeFundName?: string | null
): VcConnectionMatch[] {
  if (!Array.isArray(sharedConnections) || sharedConnections.length === 0) return [];

  const fundMap = new Map<string, VcConnectionMatch>();
  const excludeNorm = excludeFundName ? normalizeName(excludeFundName) : null;

  for (const conn of sharedConnections) {
    const rawName = conn?.fullName || `${conn?.firstName || ''} ${conn?.lastName || ''}`.trim();
    if (!rawName) continue;
    const norm = normalizeName(rawName);
    if (!norm) continue;
    const clean = cleanPersonName(rawName);

    for (const source of FOLLOWER_SOURCES) {
      const sourceNorm = normalizeName(source.investorName);
      const sourceClean = cleanPersonName(source.investorName);

      const isMatch =
        norm === sourceNorm ||
        clean === sourceClean ||
        KNOWN_ALIASES[norm] === sourceNorm ||
        KNOWN_ALIASES[clean] === sourceClean ||
        KNOWN_ALIASES[norm] === sourceClean ||
        norm.startsWith(sourceNorm + ' ') ||
        norm.endsWith(' ' + sourceNorm) ||
        norm.includes(' ' + sourceNorm + ' ') ||
        clean.startsWith(sourceClean + ' ') ||
        clean.endsWith(' ' + sourceClean) ||
        clean.includes(' ' + sourceClean + ' ');

      if (isMatch) {
        // Exclude current fund if specified
        if (excludeNorm && normalizeName(source.fundName) === excludeNorm) {
          continue;
        }

        const fundKey = source.fundName.toLowerCase();
        const rawUrl = conn?.profileUrl || conn?.profile_url || conn?.url || undefined;
        const profileUrl = rawUrl ? formatLinkedinUrl(rawUrl) : undefined;

        if (!fundMap.has(fundKey)) {
          fundMap.set(fundKey, {
            fundName: source.fundName,
            investorNames: [source.investorName],
            fundLogo: source.fundLogo,
            profileUrl: profileUrl,
          });
        } else {
          const existing = fundMap.get(fundKey)!;
          if (!existing.investorNames.includes(source.investorName)) {
            existing.investorNames.push(source.investorName);
          }
          if (!existing.profileUrl && profileUrl) {
            existing.profileUrl = profileUrl;
          }
          if (!existing.fundLogo && source.fundLogo) {
            existing.fundLogo = source.fundLogo;
          }
        }
      }
    }
  }

  return Array.from(fundMap.values());
}

