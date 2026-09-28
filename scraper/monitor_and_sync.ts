import { createClient } from '@supabase/supabase-js';
import { getSectionFromUrl, SwissSectionKey } from '../src/app/swissSources';
import { parse } from 'csv-parse/sync';

const SQUID_A_ID = 'db99446c4c6f47518cf2ebdd8f01b500';
const SQUID_B_ID = '3b42144f46e54f9f800ad0380c3740f7';
const LOBSTR_API_KEY = process.env.LOBSTR_API_KEY || '8168cd9de13c5ef76bf7101c45f7dd47de8dc850';

const supabaseUrl = 'https://rhikhvzwhrmqxviucwyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWtodnp3aHJtcXh2aXVjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzAyOTAsImV4cCI6MjEwMzI0NjI5MH0.GbQPxMRTFNH0E1bDh-nkiAzIJAlmdQfrK3I_bry7oGY';
const supabase = createClient(supabaseUrl, supabaseKey);

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function apiRequest(endpoint: string, options: any = {}) {
  const url = `https://api.lobstr.io/v1/${endpoint}`;
  let lastErr = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Token ${LOBSTR_API_KEY}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      if (res.status === 429) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error [${res.status}] ${endpoint}: ${text}`);
      }
      return res.json();
    } catch (e: any) {
      lastErr = e;
      await sleep(2500);
    }
  }
  throw lastErr || new Error(`Failed to request ${endpoint}`);
}

let cachedUrlToSectionMap: Record<string, SwissSectionKey> | null = null;

async function getUrlToSectionMap(): Promise<Record<string, SwissSectionKey>> {
  if (cachedUrlToSectionMap) return cachedUrlToSectionMap;

  const urlToSectionMap: Record<string, SwissSectionKey> = {};

  try {
    console.log('Loading search task section mapping from Squid A baseline run...');
    const baselineRunId = '67f83f5d4bef475b99d2dbe5a8efd496';
    const downloadA = await apiRequest(`runs/${baselineRunId}/download`);
    if (downloadA.s3) {
      const csvRes = await fetch(downloadA.s3);
      const csvText = await csvRes.text();
      const searchRows: any[] = parse(csvText, { columns: true, skip_empty_lines: true });
      for (const row of searchRows) {
        const inputUrl = row['INPUT URL'] || row.input_url || '';
        const section = getSectionFromUrl(inputUrl);
        const pUrl = row['SALES NAVIGATOR PROFILE URL'] || row['LINKEDIN PROFILE URL'] || row.profile_url || row.url;
        if (pUrl) {
          urlToSectionMap[pUrl] = section;
          const cleanMatch = pUrl.match(/ACwAAA[a-zA-Z0-9_-]+/);
          if (cleanMatch) {
            urlToSectionMap[cleanMatch[0]] = section;
          }
        }
      }
      console.log(`Loaded ${Object.keys(urlToSectionMap).length} profile section mappings.`);
    }
  } catch (err) {
    console.warn('Could not load S3 baseline search mapping, falling back to heuristic parsing:', err);
  }

  cachedUrlToSectionMap = urlToSectionMap;
  return urlToSectionMap;
}

export async function syncSquidBRun(runId: string) {
  const urlToSectionMap = await getUrlToSectionMap();

  console.log(`Fetching results from Squid B run ${runId}...`);
  let allResults: any[] = [];
  let page = 1;
  while (true) {
    await sleep(350);
    const res = await apiRequest(`results?run=${runId}&page=${page}&limit=50`);
    const data = res.data || [];
    if (data.length === 0) break;
    allResults = allResults.concat(data);
    if (page >= (res.total_pages || 1)) break;
    page++;
  }

  console.log(`Retrieved ${allResults.length} deep profiles from Squid B.`);
  if (allResults.length === 0) return 0;

  const uniqueLeadsMap = new Map<string, any>();

  for (const p of allResults) {
    const profileUrl = p.sales_navigator_url || p['SALES NAVIGATOR PROFILE URL'] || p.public_url || p['LINKEDIN PROFILE URL'] || p.url || '';
    if (!profileUrl) continue;

    let section: SwissSectionKey = 'stealth';
    if (urlToSectionMap[profileUrl]) {
      section = urlToSectionMap[profileUrl];
    } else {
      const cleanMatch = profileUrl.match(/ACwAAA[a-zA-Z0-9_-]+/);
      if (cleanMatch && urlToSectionMap[cleanMatch[0]]) {
        section = urlToSectionMap[cleanMatch[0]];
      } else if (p.public_url && urlToSectionMap[p.public_url]) {
        section = urlToSectionMap[p.public_url];
      }
    }

    let allPos = p.positions || p['POSITIONS'] || [];
    if (typeof allPos === 'string') {
      try { allPos = JSON.parse(allPos); } catch (e) { allPos = []; }
    }

    let currentPos: any[] = [];
    let pastPos: any[] = [];

    if (Array.isArray(allPos) && allPos.length > 0) {
      currentPos = allPos.filter((pos: any) => pos.current === true);
      pastPos = allPos.filter((pos: any) => pos.current === false);
      if (currentPos.length === 0) {
        currentPos = [allPos[0]];
        pastPos = allPos.slice(1);
      }
    } else {
      currentPos = p.current_positions || p.current_position || [];
      if (typeof currentPos === 'string') {
        try { currentPos = JSON.parse(currentPos); } catch (e) { currentPos = []; }
      }
      pastPos = p.past_positions || p.past_position || [];
      if (typeof pastPos === 'string') {
        try { pastPos = JSON.parse(pastPos); } catch (e) { pastPos = []; }
      }
    }

    // Stealth check heuristic
    const firstCompany = (p.company_name || p.company || (currentPos[0]?.company_name) || '').toLowerCase();
    const firstTitle = (p.job_title || (currentPos[0]?.title) || '').toLowerCase();
    if (firstCompany.includes('stealth') || firstTitle.includes('stealth') || firstCompany === '' || firstCompany.includes('self-employed')) {
      section = 'stealth';
    } else if (section !== 'stealth') {
      // Smart tenure classification
      const s = currentPos[0]?.started_on || currentPos[0]?.startedOn;
      if (s && s.year) {
        const now = new Date();
        const startDate = new Date(s.year, (s.month || 1) - 1);
        const months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        if (months >= 12 && months <= 24) {
          section = '1_to_2_years';
        } else if (months < 12 && section !== 'changed_job') {
          section = 'less_1_year';
        }
      }
    }

    let edu = p.educations || p.education || [];
    if (typeof edu === 'string') {
      try { edu = JSON.parse(edu); } catch (e) { edu = []; }
    }

    let shared = p.shared_connections || [];
    if (typeof shared === 'string') {
      try { shared = JSON.parse(shared); } catch (e) { shared = []; }
    }

    const firstPos = currentPos[0];

    uniqueLeadsMap.set(profileUrl, {
      profile_url: profileUrl,
      full_name: p.full_name || p['FULL NAME'] || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      job_title: p.job_title || p['JOB TITLE'] || p.headline || (firstPos?.title) || '',
      company: p.company_name || p['COMPANY NAME'] || (firstPos?.company_name) || '',
      location: p.location || p['LOCATION'] || '',
      avatar_url: p.profile_picture_url || p.avatar_url || p.profile_picture || '',
      summary: p.summary || p['ABOUT'] || '',
      current_position: currentPos,
      past_position: pastPos,
      education: edu,
      shared_connections: shared,
      source_url: p.sales_navigator_url || profileUrl,
      section,
      is_genesis: true,
      scraped_at: new Date().toISOString()
    });
  }

  const leadsToUpsert = Array.from(uniqueLeadsMap.values());
  console.log(`Upserting ${leadsToUpsert.length} leads into Supabase...`);

  for (let i = 0; i < leadsToUpsert.length; i += 50) {
    const chunk = leadsToUpsert.slice(i, i + 50);
    const { error } = await supabase.from('swiss_leads').upsert(chunk, { onConflict: 'profile_url' });
    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }
  }

  console.log(`✓ Successfully updated ${leadsToUpsert.length} leads in Supabase.`);
  return leadsToUpsert.length;
}

export async function runMonitor() {
  console.log('====================================================');
  console.log('🇨🇭 SWISS HUBS LIVE ENRICHMENT MONITOR & SYNC');
  console.log('====================================================');

  const runBId = 'a7918086dac745f1a1d42a695d43706d';
  const totalTargetTasks = 563;

  while (true) {
    try {
      const runInfo = await apiRequest(`runs/${runBId}`);
      const status = runInfo.status;
      const count = runInfo.total_results || 0;
      const pct = Math.min(100, Math.round((count / totalTargetTasks) * 100));

      console.log(`[${new Date().toISOString()}] Squid B status: "${status}" | Scraped: ${count}/${totalTargetTasks} (${pct}%)`);

      if (count > 0) {
        const synced = await syncSquidBRun(runBId);
        
        const isFinished = ['done', 'stopped', 'aborted', 'error'].includes(status);
        const statusText = isFinished
          ? `Genesis enrichment completed: ${synced} profiles enriched.`
          : `Genesis deep enrichment in progress: ${synced}/${totalTargetTasks} profiles synced live (${pct}%)...`;

        await supabase.from('swiss_scraper_status').upsert({
          id: 1,
          section: 'all',
          status: statusText,
          updated_at: new Date().toISOString()
        });

        if (isFinished) {
          console.log(`✓ Run finished with status "${status}". Final sync complete.`);
          break;
        }
      } else {
        await supabase.from('swiss_scraper_status').upsert({
          id: 1,
          section: 'all',
          status: `Genesis scraper active: processing initial queue (${count}/${totalTargetTasks})...`,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Monitor loop error:', err);
    }

    console.log('Waiting 30 seconds for next sync cycle...');
    await sleep(30000);
  }
}

if (require.main === module) {
  if (process.argv.includes('--once')) {
    syncSquidBRun('a7918086dac745f1a1d42a695d43706d')
      .then(n => {
        console.log(`One-off sync finished. Synced ${n} leads.`);
        process.exit(0);
      })
      .catch(err => {
        console.error('One-off sync failed:', err);
        process.exit(1);
      });
  } else {
    runMonitor()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Monitor fatal error:', err);
        process.exit(1);
      });
  }
}
