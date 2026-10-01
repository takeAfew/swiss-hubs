import React, { useState } from 'react';
import topSignalsData from './topSignalsCompanies.json';
import followerSourcesData from './followerSources.json';
import entityProfilesData from './entityProfilesLogos.json';
import vcLogosData from './vcLogos.json';
import knownDomainsData from './knownDomains.json';
import localEntityLogosData from './localEntityLogos.json';
import localDomainLogosData from './localDomainLogos.json';
import { getOptimizedImageUrl } from './imageUtils';

// Clear any previously saved dynamic domains from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('known_entity_domains');
  } catch (e) {}
}

// Global in-memory cache to avoid duplicate queries across components
const logoCache = new Map<string, string | null>();
const knownDomainsMap = new Map<string, string>();

function isTokenExpired(url?: string | null): boolean {
  if (!url) return true;
  const match = url.match(/[?&]e=(\d+)/);
  if (!match) return false;
  return parseInt(match[1], 10) <= Math.floor(Date.now() / 1000);
}

function normalizeStr(str: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSuffixes(str: string): string {
  return str
    .replace(/\b(ag|gmbh|se|plc|ltd|inc|llc|corp|corporation|group|co|spa|sa|nv)\b/gi, '')
    .replace(/\b(switzerland|deutschland|germany|uk|united kingdom|france|italy|italia|spain|espana|netherlands|sweden|austria|europe|global|emea|apac|latam|us|usa|nordics)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pre-seed knownDomainsMap synchronously from verified catalog
if (knownDomainsData && typeof knownDomainsData === 'object') {
  Object.entries(knownDomainsData).forEach(([k, v]) => {
    const clean = k.trim().toLowerCase();
    knownDomainsMap.set(clean, v as string);
    knownDomainsMap.set(normalizeStr(clean), v as string);
    const withoutParen = clean.replace(/\([^)]*\)/g, '').trim();
    if (withoutParen) {
      knownDomainsMap.set(withoutParen, v as string);
      knownDomainsMap.set(normalizeStr(withoutParen), v as string);
    }
  });
}

// Pre-seed logoCache synchronously with top signals and follower sources
if (Array.isArray(topSignalsData)) {
  topSignalsData.forEach((item: any) => {
    if (item.company_name && item.company_picture && !isTokenExpired(item.company_picture)) {
      const name = item.company_name.trim().toLowerCase();
      logoCache.set(name, item.company_picture);
      logoCache.set(normalizeStr(name), item.company_picture);
    }
    if (item.company_url && item.company_picture && !isTokenExpired(item.company_picture)) {
      const clean = item.company_url.split('?')[0].replace(/\/$/, '').toLowerCase();
      logoCache.set(clean, item.company_picture);
      const slug = clean.split('/').pop();
      if (slug) logoCache.set(slug, item.company_picture);
    }
  });
}

// Pre-seed logoCache synchronously with all 40 official VC fund logos
if (vcLogosData && typeof vcLogosData === 'object') {
  Object.values(vcLogosData).forEach((item: any) => {
    if (item.fundName && item.fundLogo) {
      const name = item.fundName.trim().toLowerCase();
      const logo = item.fundLogo;
      logoCache.set(name, logo);
      logoCache.set(normalizeStr(name), logo);

      // Also register common acronyms/variations
      if (name.includes('(')) {
        const withoutParen = name.replace(/\([^)]*\)/g, '').trim();
        logoCache.set(withoutParen, logo);
        logoCache.set(normalizeStr(withoutParen), logo);
        const match = name.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          const acronym = match[1].toLowerCase().trim();
          logoCache.set(acronym, logo);
          logoCache.set(normalizeStr(acronym), logo);
        }
      }
      if (name === 'a16z') {
        logoCache.set('andreessen horowitz', logo);
      }
      if (name === 'htgf') {
        logoCache.set('high-tech grunderfonds', logo);
        logoCache.set('high-tech gründerfonds', logo);
      }
      if (name === '20vc') {
        logoCache.set('the twenty vc', logo);
      }
    }
  });
}

if (Array.isArray(followerSourcesData)) {
  followerSourcesData.forEach((item: any) => {
    if (item.fundName && item.fundLogo) {
      const name = item.fundName.trim().toLowerCase();
      logoCache.set(name, item.fundLogo);
      logoCache.set(normalizeStr(name), item.fundLogo);
    }
  });
}

// Pre-seed logoCache synchronously with permanent local LinkedIn-derived entity logos
if (localEntityLogosData && typeof localEntityLogosData === 'object') {
  Object.entries(localEntityLogosData).forEach(([k, path]) => {
    logoCache.set(k.toLowerCase().trim(), path as string);
    logoCache.set(normalizeStr(k), path as string);
  });
}

// Pre-seed knownDomainsMap with permanent local domain logos
if (localDomainLogosData && typeof localDomainLogosData === 'object') {
  Object.entries(localDomainLogosData).forEach(([k, path]) => {
    knownDomainsMap.set(k.toLowerCase().trim(), path as string);
    knownDomainsMap.set(normalizeStr(k), path as string);
  });
}



// Hand-verified domains for well-known corporate giants and institutions only
const KNOWN_DOMAINS: Record<string, string> = {
  'microsoft': 'microsoft.com',
  'mckinsey & company': 'mckinsey.com',
  'mckinsey': 'mckinsey.com',
  'university of cambridge': 'cam.ac.uk',
  'cambridge': 'cam.ac.uk',
  'university of oxford': 'ox.ac.uk',
  'oxford': 'ox.ac.uk',
  'the london school of economics and political science (lse)': 'lse.ac.uk',
  'london school of economics': 'lse.ac.uk',
  'lse': 'lse.ac.uk',
  'ucl': 'ucl.ac.uk',
  'university college london': 'ucl.ac.uk',
  'london business school': 'london.edu',
  'lbs': 'london.edu',
  'stanford university': 'stanford.edu',
  'stanford': 'stanford.edu',
  'harvard university': 'harvard.edu',
  'harvard': 'harvard.edu',
  'massachusetts institute of technology': 'mit.edu',
  'mit': 'mit.edu',
  'eth zurich': 'ethz.ch',
  'eth zürich': 'ethz.ch',
  'epfl': 'epfl.ch',
  'école polytechnique fédérale de lausanne': 'epfl.ch',
  'ecole polytechnique federale de lausanne': 'epfl.ch',
  'aalto university': 'aalto.fi',
  'aalto': 'aalto.fi',
  'escp': 'escp.eu',
  'escp business school': 'escp.eu',
  'center for digital technology and management (cdtm)': 'cdtm.de',
  'center for digital technology and management': 'cdtm.de',
  'cdtm': 'cdtm.de',
  'university of st gallen': 'unisg.ch',
  'university of st. gallen': 'unisg.ch',
  'universität st. gallen': 'unisg.ch',
  'st gallen': 'unisg.ch',
  'st. gallen': 'unisg.ch',
  'hsg': 'unisg.ch',
  'pwc': 'pwc.com',
  'pricewaterhousecoopers': 'pwc.com',
  'deloitte': 'deloitte.com',
  'ey': 'ey.com',
  'ernst & young': 'ey.com',
  'kpmg': 'kpmg.com',
  'kpmg deutschland': 'kpmg.de',
  'boston consulting group': 'bcg.com',
  'bcg': 'bcg.com',
  'bain & company': 'bain.com',
  'bain': 'bain.com',
  'klarna': 'klarna.com',
  'google': 'google.com',
  'apple': 'apple.com',
  'amazon': 'amazon.com',
  'meta': 'meta.com',
  'facebook': 'meta.com',
  'goldman sachs': 'goldmansachs.com',
  'morgan stanley': 'morganstanley.com',
  'j.p. morgan': 'jpmorgan.com',
  'jp morgan': 'jpmorgan.com',
  'jpmorgan chase': 'jpmorganchase.com',
  'jpmorgan chase & co.': 'jpmorganchase.com',
  'bocconi university': 'unibocconi.it',
  'università bocconi': 'unibocconi.it',
  'bocconi': 'unibocconi.it',
  'hec paris': 'hec.edu',
  'insead': 'insead.edu',
  'university of california, berkeley': 'berkeley.edu',
  'uc berkeley': 'berkeley.edu',
  'columbia university': 'columbia.edu',
  'yale university': 'yale.edu',
  'princeton university': 'princeton.edu',
  'imperial college london': 'imperial.ac.uk',
  'imperial college': 'imperial.ac.uk',
  'imperial college business school': 'imperial.ac.uk',
  'ludwig-maximilians-universität münchen': 'lmu.de',
  'lmu munich': 'lmu.de',
  'the wharton school': 'wharton.upenn.edu',
  'wharton school': 'wharton.upenn.edu',
  'wharton': 'wharton.upenn.edu',
  'university of pennsylvania': 'upenn.edu',
  'upenn': 'upenn.edu',
  'penn': 'upenn.edu',
  'max planck institute for physics': 'mpp.mpg.de',
  'max planck institute': 'mpg.de',
  'max planck': 'mpg.de',
  'innofactor': 'innofactor.com',
  'stripe': 'stripe.com',
  'uber': 'uber.com',
  'revolut': 'revolut.com',
  'spotify': 'spotify.com',
  'accenture': 'accenture.com',
  'reply': 'reply.com',
  'reply spa': 'reply.com',
  'reply s.p.a.': 'reply.com',
  'dff ventures': 'dff.vc',
  'cherry ventures': 'cherry.vc',
  'seedcamp': 'seedcamp.com',
  'elaia': 'elaia.com',
  'htgf': 'htgf.de',
  'high-tech gründerfonds': 'htgf.de',
  'high-tech grunderfonds': 'htgf.de',
  'mercedes-benz': 'mercedes-benz.com',
  'mercedes-benz ag': 'mercedes-benz.com',
  'hsbc': 'hsbc.com',
  'l\'oréal': 'loreal.com',
  'l\'oreal': 'loreal.com',
  'l.e.k. consulting': 'lek.com',
  'thoughtworks': 'thoughtworks.com',
  'luxoft': 'luxoft.com',
  'credit suisse': 'credit-suisse.com',
  'unilever': 'unilever.com',
  'nokia': 'nokia.com',
  'casavo': 'casavo.com',
  'sensirion': 'sensirion.com',
  'astrazeneca': 'astrazeneca.com',
  'dassault systèmes': '3ds.com',
  'dassault systemes': '3ds.com',
  'philips': 'philips.com',
  'airbus': 'airbus.com',
  'king\'s college london': 'kcl.ac.uk',
  'kcl': 'kcl.ac.uk',
  'the university of edinburgh': 'ed.ac.uk',
  'university of edinburgh': 'ed.ac.uk',
  'university of amsterdam': 'uva.nl',
  'stockholm school of economics': 'hhs.se',
  'handelshögskolan i stockholm': 'hhs.se',
  'sciences po': 'sciencespo.fr',
  'university of nottingham': 'nottingham.ac.uk',
  'university of mannheim': 'uni-mannheim.de',
  'università di padova': 'unipd.it',
  'università degli studi di padova': 'unipd.it',
  'politecnico di milano': 'polimi.it',
  'politecnico di torino': 'polito.it',
  'delft university of technology': 'tudelft.nl',
  'technische universiteit delft': 'tudelft.nl',
  'eindhoven university of technology': 'tue.nl',
  'technische universiteit eindhoven': 'tue.nl',
  'the hong kong university of science and technology': 'hkust.edu.hk',
  'hkust': 'hkust.edu.hk',
  'tongji university': 'tongji.edu.cn',
  '同济大学': 'tongji.edu.cn',
  'plug and play tech center': 'plugandplaytechcenter.com',
  'world economic forum': 'weforum.org',
  'world health organization': 'who.int'
};

export function seedLogoCache(profiles: Array<any>) {
  if (!profiles || !Array.isArray(profiles)) return;
  profiles.forEach(p => {
    const logo = p.logo_url || p.l;
    const name = p.name || p.n;
    const url = p.linkedin_url || p.u;
    if (name && logo) {
      const clean = name.trim().toLowerCase();
      const norm = normalizeStr(clean);
      if (!logoCache.get(clean)?.startsWith('/logos/') && !(localEntityLogosData as Record<string, string>)[clean]) {
        logoCache.set(clean, logo);
      }
      if (!logoCache.get(norm)?.startsWith('/logos/') && !(localEntityLogosData as Record<string, string>)[norm]) {
        logoCache.set(norm, logo);
      }
    }
    if (url && logo) {
      const clean = url.split('?')[0].replace(/\/$/, '').toLowerCase();
      const slug = clean.split('/').pop();
      if (!logoCache.get(clean)?.startsWith('/logos/') && !(localEntityLogosData as Record<string, string>)[clean]) {
        logoCache.set(clean, logo);
      }
      if (slug && !logoCache.get(slug)?.startsWith('/logos/') && !(localEntityLogosData as Record<string, string>)[slug]) {
        logoCache.set(slug, logo);
      }
    }
  });
}

export const STEALTH_LOGO = '/logos/stealth.png';

const TUM_LOGO = 'https://media.licdn.com/dms/image/v2/D4D0BAQGYm_x_LuZ84g/company-logo_400_400/B4DZhWqognGsAY-/0/1753800673663/technische_universitat_munchen_logo?e=1790812800&v=beta&t=NTaQp-XliqCJN66GV9Er6af9QuM6934c2Wk1-E-Cnxg';

const STATIC_LOGO_OVERRIDES: Record<string, string> = {
  // TUM & Munich
  'technische universität münchen': TUM_LOGO,
  'technische universitat munchen': TUM_LOGO,
  'technical university of munich': TUM_LOGO,
  'technical university munich': TUM_LOGO,
  'tum school of management': TUM_LOGO,
  'tum venture labs': TUM_LOGO,
  'tum': TUM_LOGO,
  'https://www.linkedin.com/school/technische-universitat-munchen': TUM_LOGO,
  'https://www.linkedin.com/school/technische-universitat-munchen/': TUM_LOGO,
  'technische-universitat-munchen': TUM_LOGO,
  '166283': TUM_LOGO,
  'https://www.linkedin.com/company/166283': TUM_LOGO,
  'https://www.linkedin.com/company/166283/': TUM_LOGO,
  // Ecole Polytechnique
  'école polytechnique': 'https://media.licdn.com/dms/image/v2/C4D0BAQFVles59ko4gg/company-logo_200_200/company-logo_200_200/0/1631303602527?e=1790812800&v=beta&t=HKq409KtW6TWS04x1MtLjModCzkAEL1eVDE7utZEFgU',
  'ecole polytechnique': 'https://media.licdn.com/dms/image/v2/C4D0BAQFVles59ko4gg/company-logo_200_200/company-logo_200_200/0/1631303602527?e=1790812800&v=beta&t=HKq409KtW6TWS04x1MtLjModCzkAEL1eVDE7utZEFgU',
  'ecole polytechnique (x2018)': 'https://media.licdn.com/dms/image/v2/C4D0BAQFVles59ko4gg/company-logo_200_200/company-logo_200_200/0/1631303602527?e=1790812800&v=beta&t=HKq409KtW6TWS04x1MtLjModCzkAEL1eVDE7utZEFgU',
  'https://www.linkedin.com/school/ecole-polytechnique': 'https://media.licdn.com/dms/image/v2/C4D0BAQFVles59ko4gg/company-logo_200_200/company-logo_200_200/0/1631303602527?e=1790812800&v=beta&t=HKq409KtW6TWS04x1MtLjModCzkAEL1eVDE7utZEFgU',
  'https://www.linkedin.com/company/14034': 'https://media.licdn.com/dms/image/v2/C4D0BAQFVles59ko4gg/company-logo_200_200/company-logo_200_200/0/1631303602527?e=1790812800&v=beta&t=HKq409KtW6TWS04x1MtLjModCzkAEL1eVDE7utZEFgU',
  '14034': 'https://media.licdn.com/dms/image/v2/C4D0BAQFVles59ko4gg/company-logo_200_200/company-logo_200_200/0/1631303602527?e=1790812800&v=beta&t=HKq409KtW6TWS04x1MtLjModCzkAEL1eVDE7utZEFgU',
  // Wharton
  'the wharton school': 'https://media.licdn.com/dms/image/v2/C4E0BAQFQu7wZniptpA/company-logo_400_400/company-logo_400_400/0/1677690194092/the_wharton_school_logo?e=1790208000&v=beta&t=6ZR0xlzdLPCV58rFMPYGkrMnlRxIqrY2LkXD1Wv1cl8',
  'wharton school': 'https://media.licdn.com/dms/image/v2/C4E0BAQFQu7wZniptpA/company-logo_400_400/company-logo_400_400/0/1677690194092/the_wharton_school_logo?e=1790208000&v=beta&t=6ZR0xlzdLPCV58rFMPYGkrMnlRxIqrY2LkXD1Wv1cl8',
  'wharton': 'https://media.licdn.com/dms/image/v2/C4E0BAQFQu7wZniptpA/company-logo_400_400/company-logo_400_400/0/1677690194092/the_wharton_school_logo?e=1790208000&v=beta&t=6ZR0xlzdLPCV58rFMPYGkrMnlRxIqrY2LkXD1Wv1cl8',
  'https://www.linkedin.com/school/the-wharton-school': 'https://media.licdn.com/dms/image/v2/C4E0BAQFQu7wZniptpA/company-logo_400_400/company-logo_400_400/0/1677690194092/the_wharton_school_logo?e=1790208000&v=beta&t=6ZR0xlzdLPCV58rFMPYGkrMnlRxIqrY2LkXD1Wv1cl8',
  'https://www.linkedin.com/company/5290': 'https://media.licdn.com/dms/image/v2/C4E0BAQFQu7wZniptpA/company-logo_400_400/company-logo_400_400/0/1677690194092/the_wharton_school_logo?e=1790208000&v=beta&t=6ZR0xlzdLPCV58rFMPYGkrMnlRxIqrY2LkXD1Wv1cl8',
  '5290': 'https://media.licdn.com/dms/image/v2/C4E0BAQFQu7wZniptpA/company-logo_400_400/company-logo_400_400/0/1677690194092/the_wharton_school_logo?e=1790208000&v=beta&t=6ZR0xlzdLPCV58rFMPYGkrMnlRxIqrY2LkXD1Wv1cl8',
  // A16z
  'a16z': 'https://media.licdn.com/dms/image/v2/D560BAQFs3wvS2NM10g/company-logo_200_200/B56ZaiHxu.GoAU-/0/1746476670161/a16z_logo?e=1790812800&v=beta&t=wepklqGo85-aJ-8tzT3N1aBtB6IsOUlcXcxjAJFX_94',
  'andreessen horowitz': 'https://media.licdn.com/dms/image/v2/D560BAQFs3wvS2NM10g/company-logo_200_200/B56ZaiHxu.GoAU-/0/1746476670161/a16z_logo?e=1790812800&v=beta&t=wepklqGo85-aJ-8tzT3N1aBtB6IsOUlcXcxjAJFX_94'
};

function getInstitutionalLogo(cleanName: string): string | null {
  if (cleanName.includes('tum') || cleanName.includes('münchen') || cleanName.includes('munchen')) {
    if (cleanName.includes('technische') || cleanName.includes('technical') || cleanName.includes('tum')) {
      return TUM_LOGO;
    }
  }
  if (cleanName.includes('wharton')) return STATIC_LOGO_OVERRIDES['wharton'];
  if (cleanName.includes('polytechnique')) return STATIC_LOGO_OVERRIDES['ecole polytechnique'];
  if (cleanName.includes('oxford') || cleanName.includes('oxonian')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://ox.ac.uk&size=64';
  if (cleanName.includes('cambridge')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://cam.ac.uk&size=64';
  if (cleanName.includes('imperial college') || cleanName.includes('imperial business')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://imperial.ac.uk&size=64';
  if (cleanName.includes('stanford')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://stanford.edu&size=64';
  if (cleanName.includes('harvard')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://harvard.edu&size=64';
  if (cleanName.includes('mit') || cleanName.includes('massachusetts institute of technology')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://mit.edu&size=64';
  if (cleanName.includes('eth zurich') || cleanName.includes('eth zürich')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://ethz.ch&size=64';
  if (cleanName.includes('epfl')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://epfl.ch&size=64';
  if (cleanName.includes('bocconi')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://unibocconi.it&size=64';
  if (cleanName.includes('st. gallen') || cleanName.includes('st gallen')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://unisg.ch&size=64';
  if (cleanName.includes('lse') || cleanName.includes('london school of economics')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://lse.ac.uk&size=64';
  if (cleanName.includes('kcl') || cleanName.includes("king's college")) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://kcl.ac.uk&size=64';
  if (cleanName.includes('ucl') || cleanName.includes('university college london')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://ucl.ac.uk&size=64';
  if (cleanName.includes('london business school') || cleanName.includes('lbs')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://london.edu&size=64';
  if (cleanName.includes('hec paris')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://hec.edu&size=64';
  if (cleanName.includes('insead')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://insead.edu&size=64';
  if (cleanName.includes('stockholm school of economics') || cleanName.includes('handelshögskolan')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://hhs.se&size=64';
  if (cleanName.includes('escp')) return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://escp.eu&size=64';
  return null;
}

export function getDomainLogo(name: string, linkedinUrl?: string | null): string | null {
  if (!name && !linkedinUrl) return null;
  const cleanName = (name || '').trim().toLowerCase();
  const normName = normalizeStr(name);
  const withoutParen = cleanName.replace(/\([^)]*\)/g, '').trim();
  const normWithoutParen = normalizeStr(withoutParen);
  const strippedName = stripSuffixes(normName);
  const cleanUrl = linkedinUrl ? linkedinUrl.split('?')[0].replace(/\/$/, '').toLowerCase() : '';
  const urlSlug = cleanUrl ? cleanUrl.split('/').pop() : '';

  let acronym = '';
  const match = (name || '').match(/\(([^)]+)\)/);
  if (match && match[1]) acronym = match[1].toLowerCase().trim();

  const domain = knownDomainsMap.get(cleanName)
    || knownDomainsMap.get(normName)
    || knownDomainsMap.get(withoutParen)
    || knownDomainsMap.get(normWithoutParen)
    || knownDomainsMap.get(strippedName)
    || (acronym ? knownDomainsMap.get(acronym) : null)
    || (urlSlug ? knownDomainsMap.get(urlSlug) : null)
    || KNOWN_DOMAINS[cleanName]
    || KNOWN_DOMAINS[normName]
    || KNOWN_DOMAINS[withoutParen]
    || KNOWN_DOMAINS[strippedName];

  if (domain) {
    if (domain.startsWith('/logos/')) return domain;
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=64`;
  }

  const inst = getInstitutionalLogo(cleanName) || getInstitutionalLogo(normName) || getInstitutionalLogo(withoutParen);
  if (inst) return inst;

  return null;
}

function getCachedLogo(name: string, linkedinUrl?: string | null): string | null {
  const cleanName = (name || '').trim().toLowerCase();
  const normName = normalizeStr(name);
  const withoutParen = cleanName.replace(/\([^)]*\)/g, '').trim();
  const normWithoutParen = normalizeStr(withoutParen);
  const strippedName = stripSuffixes(normName);
  const cleanUrl = linkedinUrl ? linkedinUrl.split('?')[0].replace(/\/$/, '').toLowerCase() : '';
  const urlSlug = cleanUrl ? cleanUrl.split('/').pop() : '';

  // 1. Static high-fidelity overrides
  if (cleanName && STATIC_LOGO_OVERRIDES[cleanName]) return STATIC_LOGO_OVERRIDES[cleanName];
  if (normName && STATIC_LOGO_OVERRIDES[normName]) return STATIC_LOGO_OVERRIDES[normName];
  if (withoutParen && STATIC_LOGO_OVERRIDES[withoutParen]) return STATIC_LOGO_OVERRIDES[withoutParen];
  if (cleanUrl && STATIC_LOGO_OVERRIDES[cleanUrl]) return STATIC_LOGO_OVERRIDES[cleanUrl];
  if (urlSlug && STATIC_LOGO_OVERRIDES[urlSlug]) return STATIC_LOGO_OVERRIDES[urlSlug];

  // 2. Stealth badge
  if (cleanName.includes('stealth') || cleanUrl.includes('stealth') || (urlSlug && urlSlug.includes('stealth'))) {
    return STEALTH_LOGO;
  }

  // 3. PRIORITY 1 (GOLDEN RULE): Logos derived from LinkedIn
  // 3a. Direct check in local physical catalog (localEntityLogos.json)
  const localDirect =
    (localEntityLogosData as Record<string, string>)[cleanName] ||
    (localEntityLogosData as Record<string, string>)[normName] ||
    (localEntityLogosData as Record<string, string>)[withoutParen] ||
    (localEntityLogosData as Record<string, string>)[normWithoutParen] ||
    (localEntityLogosData as Record<string, string>)[strippedName] ||
    (cleanUrl && (localEntityLogosData as Record<string, string>)[cleanUrl]) ||
    (urlSlug && (localEntityLogosData as Record<string, string>)[urlSlug]);

  if (localDirect) {
    return localDirect;
  }

  // 3a-sub. Automatic resolution for major enterprise divisions
  if (cleanName.startsWith('accenture')) {
    return '/logos/entities/accenture.png';
  }
  if (cleanName === 'reply' || cleanName.startsWith('reply ') || cleanName.endsWith(' reply')) {
    return '/logos/entities/reply.png';
  }

  // 3b. Local permanent assets in /logos/ (VCs and dynamic in-memory cache)
  const localLogo =
    logoCache.get(cleanName) ||
    logoCache.get(normName) ||
    logoCache.get(withoutParen) ||
    logoCache.get(normWithoutParen) ||
    logoCache.get(strippedName) ||
    (cleanUrl && logoCache.get(cleanUrl)) ||
    (urlSlug && logoCache.get(urlSlug));

  if (localLogo && localLogo.startsWith('/logos/')) {
    return localLogo;
  }

  // 3c. Active unexpired LinkedIn CDN logo
  if (localLogo && !isTokenExpired(localLogo)) {
    return localLogo;
  }

  // 4. PRIORITY 2 (GOLDEN RULE): Google Option (Favicon CDN / Local Domain Logo)
  const domainLogo = getDomainLogo(name, linkedinUrl);
  if (domainLogo) return domainLogo;

  // 5. PRIORITY 3: Fallback null -> Monogram badge with initial
  return null;
}

interface CompanyLogoProps {
  name: string;
  linkedinUrl?: string | null;
  customLogo?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

// In-memory set of failed image URLs to avoid repeated 404 network attempts
const failedUrls = new Set<string>();

export const CompanyLogo = React.memo(function CompanyLogo({ name, linkedinUrl, customLogo, size = 'md' }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const primaryLogo = customLogo || getCachedLogo(name, linkedinUrl);
  const domainFallback = getDomainLogo(name, linkedinUrl);
  const activeLogo = useFallback ? domainFallback : (primaryLogo || domainFallback);

  const sizeClasses = {
    sm: 'w-[18px] h-[18px] min-w-[18px] max-w-[18px] rounded-[22%] text-[9px]',
    md: 'w-[26px] h-[26px] min-w-[26px] max-w-[26px] rounded-[22%] text-[11px]',
    lg: 'w-[32px] h-[32px] min-w-[32px] max-w-[32px] rounded-[22%] text-xs',
  }[size] || 'w-[26px] h-[26px] min-w-[26px] max-w-[26px] rounded-[22%] text-[11px]';

  if (failed || !activeLogo || failedUrls.has(activeLogo)) {
    const initial = name ? name.substring(0, 1).toUpperCase() : '?';
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    const charCode = name ? name.charCodeAt(0) : 0;
    const colorClass = colors[charCode % colors.length];

    return (
      <div className={`${sizeClasses} aspect-square flex items-center justify-center text-white font-bold ${colorClass} flex-shrink-0 rounded-[22%] overflow-hidden`}>
        {initial}
      </div>
    );
  }

  const optimizedSrc = getOptimizedImageUrl(activeLogo);

  return (
    <img 
      src={optimizedSrc} 
      alt={name} 
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`${sizeClasses} aspect-square object-contain flex-shrink-0 rounded-[22%] overflow-hidden transition-opacity duration-200`}
      onError={() => {
        if (activeLogo) failedUrls.add(activeLogo);
        if (!useFallback && domainFallback && domainFallback !== activeLogo && !failedUrls.has(domainFallback)) {
          setUseFallback(true);
        } else {
          setFailed(true);
        }
      }}
    />
  );
});
