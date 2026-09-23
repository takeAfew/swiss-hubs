import TOP_COMPANIES_DATA from './topSignalsCompanies.json';

// Normalize text for flexible matching
export function normalizeEntityName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract numeric URN ID if available
export function extractUrnId(urn?: any): string | null {
  if (!urn || typeof urn !== 'string') return null;
  const match = urn.match(/urn:li:(?:fs_salesCompany|company|fs_miniCompany|fs_salesSchool|school):(\d+)/);
  return match ? match[1] : null;
}

// Clean LinkedIn URL
export function cleanLinkedinUrl(url?: string | null): string {
  if (!url) return '';
  return url.split('?')[0].replace(/\/$/, '').toLowerCase();
}

// Sets for O(1) lookups
const TOP_SIGNAL_NAMES = new Set<string>();
const TOP_SIGNAL_URLS = new Set<string>();
const TOP_SIGNAL_SLUGS = new Set<string>();
const TOP_SIGNAL_IDS = new Set<string>();

// Popular aliases / acronyms for top companies and universities
const KNOWN_ALIASES: Record<string, string[]> = {
  'google': ['google', 'alphabet', 'google llc'],
  'meta': ['meta', 'facebook', 'meta platforms'],
  'microsoft': ['microsoft', 'msft', 'microsoft corporation'],
  'amazon': ['amazon', 'aws', 'amazon web services'],
  'apple': ['apple', 'apple inc'],
  'openai': ['openai'],
  'anthropic': ['anthropic'],
  'deepmind': ['deepmind', 'google deepmind'],
  'hugging face': ['hugging face', 'huggingface'],
  'mckinsey & company': ['mckinsey', 'mckinsey & company', 'mckinsey and company'],
  'the boston consulting group': ['bcg', 'boston consulting group', 'the boston consulting group', 'bcg x', 'bcg gamma'],
  'bain & company': ['bain', 'bain & company', 'bain and company'],
  'goldman sachs': ['goldman sachs', 'goldman', 'the goldman sachs group'],
  'morgan stanley': ['morgan stanley'],
  'j.p. morgan': ['jp morgan', 'j.p. morgan', 'jpmorgan chase', 'jpmorgan'],
  'stanford university': ['stanford university', 'stanford'],
  'harvard university': ['harvard university', 'harvard', 'harvard business school'],
  'massachusetts institute of technology': ['massachusetts institute of technology', 'mit', 'mit sloan'],
  'eth zurich': ['eth zurich', 'eth zürich', 'ethz', 'eidgenössische technische hochschule zürich'],
  'epfl': ['epfl', 'école polytechnique fédérale de lausanne'],
  'university of cambridge': ['university of cambridge', 'cambridge', 'cambridge university'],
  'university of oxford': ['university of oxford', 'oxford', 'oxford university', 'saïd business school'],
  'technical university of munich': ['technical university of munich', 'tum', 'technische universität münchen', 'cdtm'],
  'università bocconi': ['università bocconi', 'bocconi', 'bocconi university', 'sda bocconi'],
  'hec paris': ['hec paris', 'hec'],
  'insead': ['insead'],
  'london school of economics': ['the london school of economics and political science', 'lse', 'london school of economics'],
  'imperial college london': ['imperial college london', 'imperial college', 'imperial'],
  'the wharton school': [
    'the wharton school',
    'wharton school',
    'wharton',
    'wharton school of business',
    'the wharton school of the university of pennsylvania',
    'the wharton school, university of pennsylvania',
    'wharton business school',
    'university of pennsylvania - the wharton school',
    'the wharton school - university of pennsylvania'
  ],
  'university of pennsylvania': [
    'university of pennsylvania',
    'upenn',
    'penn',
    'penn engineering',
    'university of pennsylvania - the wharton school'
  ]
};

// Index all 333 top signal companies from the scraped JSON dataset
if (Array.isArray(TOP_COMPANIES_DATA)) {
  for (const item of TOP_COMPANIES_DATA) {
    const rawName = item.company_name || (item as any).name || '';
    const normName = normalizeEntityName(rawName);
    if (normName) {
      TOP_SIGNAL_NAMES.add(normName);
    }

    const rawUrl = item.company_url || (item as any).url || '';
    const cleanUrl = cleanLinkedinUrl(rawUrl);
    if (cleanUrl) {
      TOP_SIGNAL_URLS.add(cleanUrl);
      const slug = cleanUrl.split('/').pop();
      if (slug) {
        TOP_SIGNAL_SLUGS.add(slug);
      }
    }

    const rawId = item.company_id || (item as any).id;
    if (rawId) {
      TOP_SIGNAL_IDS.add(String(rawId));
    }
  }
}

// Add alias mappings
for (const [_, aliases] of Object.entries(KNOWN_ALIASES)) {
  for (const alias of aliases) {
    TOP_SIGNAL_NAMES.add(normalizeEntityName(alias));
  }
}

// Ensure key school IDs, slugs, and URLs are indexed
const EXTRA_SIGNAL_IDS = ['3165', '5290', '15248686'];
for (const id of EXTRA_SIGNAL_IDS) TOP_SIGNAL_IDS.add(id);

const EXTRA_SIGNAL_SLUGS = ['the-wharton-school', 'wharton', 'university-of-pennsylvania', 'penn-engineering'];
for (const slug of EXTRA_SIGNAL_SLUGS) TOP_SIGNAL_SLUGS.add(slug);

const EXTRA_SIGNAL_URLS = [
  'https://www.linkedin.com/school/the-wharton-school',
  'https://www.linkedin.com/school/the-wharton-school/',
  'https://www.linkedin.com/company/5290',
  'https://www.linkedin.com/company/5290/',
  'https://www.linkedin.com/school/5290',
  'https://www.linkedin.com/school/5290/',
  'https://www.linkedin.com/school/university-of-pennsylvania',
  'https://www.linkedin.com/school/university-of-pennsylvania/',
  'https://www.linkedin.com/company/3165',
  'https://www.linkedin.com/company/3165/'
];
for (const url of EXTRA_SIGNAL_URLS) TOP_SIGNAL_URLS.add(cleanLinkedinUrl(url));

const signalCache = new Map<string, boolean>();

/**
 * Checks whether a given entity (company, school, etc.) is in the 333 Top Signal list.
 * Memoized for 0ms lookups across thousands of table chips.
 */
export function isTopSignal(
  name?: string | null,
  linkedinUrl?: string | null,
  urnOrId?: any
): boolean {
  if (!name && !linkedinUrl && !urnOrId) return false;
  const cacheKey = `${name || ''}|${linkedinUrl || ''}|${urnOrId || ''}`;
  const cached = signalCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = checkIsTopSignal(name, linkedinUrl, urnOrId);
  signalCache.set(cacheKey, result);
  return result;
}

function checkIsTopSignal(
  name?: string | null,
  linkedinUrl?: string | null,
  urnOrId?: any
): boolean {
  // 1. Check by ID / URN
  const urnId = extractUrnId(urnOrId) || (typeof urnOrId === 'string' || typeof urnOrId === 'number' ? String(urnOrId) : null);
  if (urnId && TOP_SIGNAL_IDS.has(urnId)) {
    return true;
  }

  // 2. Check by LinkedIn URL or Slug
  if (linkedinUrl) {
    const cleanUrl = cleanLinkedinUrl(linkedinUrl);
    if (cleanUrl) {
      if (TOP_SIGNAL_URLS.has(cleanUrl)) return true;
      const slug = cleanUrl.split('/').pop();
      if (slug) {
        if (TOP_SIGNAL_SLUGS.has(slug)) return true;
        if (TOP_SIGNAL_IDS.has(slug)) return true;
      }
    }
  }

  // 3. Check by Normalized Name
  if (name) {
    const norm = normalizeEntityName(name);
    if (!norm || norm.length < 2) return false;
    
    // Direct check for Wharton
    if (norm.includes('wharton')) return true;

    // Direct set match
    if (TOP_SIGNAL_NAMES.has(norm)) return true;

    // Word boundary sub-match for universities/companies like "CDTM (Center for Digital Technology...)" or "Stanford University School of..."
    for (const topName of TOP_SIGNAL_NAMES) {
      if (topName.length >= 4) {
        if (norm === topName || norm.startsWith(topName + ' ') || norm.endsWith(' ' + topName) || norm.includes(' ' + topName + ' ')) {
          return true;
        }
      }
    }
  }

  return false;
}
