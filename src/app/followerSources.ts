import followerSourcesData from './followerSources.json';
import vcLogosData from './vcLogos.json';

export interface FollowerSource {
  fundName: string;
  investorName: string;
  searchUrl: string;
  fundLogo: string;
  role?: string;
  country?: string;
}

export interface VcCatalogItem {
  fundName: string;
  country: string;
  allowCount: number;
  fundLogo: string;
}

export const FOLLOWER_SOURCES: FollowerSource[] = followerSourcesData as FollowerSource[];
export const VC_LOGOS: Record<string, VcCatalogItem> = vcLogosData as Record<string, VcCatalogItem>;

// Fast normalized map for VC lookups
const normalizedVcLogos = new Map<string, string>();
Object.values(VC_LOGOS).forEach(v => {
  if (v.fundName && v.fundLogo) {
    const raw = v.fundName.toLowerCase().trim();
    normalizedVcLogos.set(raw, v.fundLogo);
    const norm = raw.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    normalizedVcLogos.set(norm, v.fundLogo);
  }
});

export function getFundLogo(fundName?: string | null, sourceUrl?: string | null): string | null {
  if (sourceUrl) {
    const found = FOLLOWER_SOURCES.find(s => s.searchUrl === sourceUrl);
    if (found?.fundLogo) return found.fundLogo;
  }
  if (fundName) {
    const raw = fundName.toLowerCase().trim();
    if (normalizedVcLogos.has(raw)) return normalizedVcLogos.get(raw)!;
    const norm = raw.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalizedVcLogos.has(norm)) return normalizedVcLogos.get(norm)!;

    const found = FOLLOWER_SOURCES.find(s => s.fundName.toLowerCase() === raw);
    if (found?.fundLogo) return found.fundLogo;
  }
  return null;
}

export function isRunnableFollowerSource(source: FollowerSource): boolean {
  return Boolean(source && source.searchUrl && source.searchUrl.startsWith('http'));
}

export const RUNNABLE_FOLLOWER_INDICES: number[] = FOLLOWER_SOURCES
  .map((s, i) => (isRunnableFollowerSource(s) ? i : -1))
  .filter(i => i !== -1);


