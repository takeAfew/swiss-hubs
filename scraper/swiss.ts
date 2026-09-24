import { createClient } from '@supabase/supabase-js';
import { SWISS_SECTIONS, getSectionFromUrl, isSwissSearchUrl, SwissSectionKey } from '../src/app/swissSources';

// The two official squids on Lobstr - ready and present
const SQUID_A_ID = 'db99446c4c6f47518cf2ebdd8f01b500'; // SN Search Scraper
const SQUID_B_ID = '3b42144f46e54f9f800ad0380c3740f7'; // SN Profile Scraper

const LOBSTR_API_KEY = process.env.LOBSTR_API_KEY || '8168cd9de13c5ef76bf7101c45f7dd47de8dc850';

const supabaseUrl = 'https://rhikhvzwhrmqxviucwyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWtodnp3aHJtcXh2aXVjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzAyOTAsImV4cCI6MjEwMzI0NjI5MH0.GbQPxMRTFNH0E1bDh-nkiAzIJAlmdQfrK3I_bry7oGY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateStatus(status: string, section: string = 'all') {
  console.log(`[Status] ${status}`);
  try {
    await supabase.from('swiss_scraper_status').upsert({
      id: 1,
      section,
      status,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to update status in Supabase:', e);
  }
}

async function apiRequest(endpoint: string, options: any = {}) {
  // Safety rule: never DELETE or wipe Squid A
  if (endpoint.startsWith(`squids/${SQUID_A_ID}`) && options.method === 'DELETE') {
    throw new Error('FATAL SAFETY VIOLATION: CANNOT DELETE SQUID A!');
  }

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
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Lobstr API error [${res.status}] ${endpoint}: ${text}`);
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return res.json();
      }
      return res.text();
    } catch (err: any) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw lastErr || new Error(`Failed to request ${endpoint} after 5 attempts`);
}

async function waitForRunCompletion(runId: string, label: string = 'Run'): Promise<any> {
  console.log(`Waiting for ${label} (${runId}) to finish...`);
  while (true) {
    await new Promise(r => setTimeout(r, 8000));
    try {
      const run = await apiRequest(`runs/${runId}`);
      console.log(`[${label}] Status: ${run.status} | Results: ${run.total_results || 0}`);
      if (['done', 'error', 'stopped', 'aborted', 'warning'].includes(run.status)) {
        return run;
      }
    } catch (e) {
      console.warn(`Transient check error for ${label}, retrying in next cycle...`, e);
    }
  }
}

export async function runSwissScraper(isGenesis: boolean = false) {
  console.log('================================================================');
  console.log(`🇨🇭 SWISS HUBS PIPELINE - MODE: ${isGenesis ? '🌱 GENESI (BASELINE)' : '🌅 DAILY (RECENT)'}`);
  console.log(`Using Squid A: ${SQUID_A_ID} (Search) and Squid B: ${SQUID_B_ID} (Profile)`);
  console.log('================================================================');

  await updateStatus(`Starting Swiss Hubs pipeline with Squid A and B (${isGenesis ? 'Genesis' : 'Daily'})...`);

  // Ensure Squid A & B settings (Zero enrichment credits, adjust skip_collected_leads for Genesis)
  await apiRequest(`squids/${SQUID_A_ID}`, {
    method: 'POST',
    body: JSON.stringify({
      params: {
        skip_collected_leads: !isGenesis,
        max_results: 1000,
        max_unique_results_per_run: 1000,
        functions: {
          email_enrichment: false,
          mobile_enrichment: false,
          get_profile_details: false
        }
      }
    })
  }).catch(() => {});

  await apiRequest(`squids/${SQUID_B_ID}`, {
    method: 'POST',
    body: JSON.stringify({
      params: {
        functions: {
          email_enrichment: false,
          mobile_enrichment: false
        }
      }
    })
  }).catch(() => {});

  // Ensure all 4 Swiss search tasks are present in Squid A
  try {
    const existingTasksRes = await apiRequest(`tasks?squid=${SQUID_A_ID}&limit=100`);
    const existingUrls = new Set((existingTasksRes.data || []).map((t: any) => t.params?.url || t.url));
    const missingTasks = SWISS_SECTIONS.filter(s => !existingUrls.has(s.searchUrl)).map(s => ({ url: s.searchUrl }));
    if (missingTasks.length > 0) {
      console.log(`Adding ${missingTasks.length} missing Swiss search tasks to Squid A...`);
      await apiRequest('tasks', {
        method: 'POST',
        body: JSON.stringify({
          squid: SQUID_A_ID,
          tasks: missingTasks
        })
      });
    }
  } catch (taskErr) {
    console.warn('Note: Could not check/add Swiss tasks to Squid A:', taskErr);
  }

  // 1. Fetch latest or execute Run for Squid A
  console.log('\n[Phase 1] 🔍 Launching Squid A (Search Scraper)...');
  await updateStatus('Running Search Scraper (Squid A)...');
  
  const searchRunRes = await apiRequest('runs', {
    method: 'POST',
    body: JSON.stringify({ squid: SQUID_A_ID })
  });
  const searchRunId = searchRunRes.id;
  console.log(`Squid A run started: ${searchRunId}`);
  await waitForRunCompletion(searchRunId, 'Squid A Search Scraper');

  // 2. Fetch CSV / results from Run A
  console.log('\n[Phase 2] 📥 Fetching search results from Squid A...');
  let s3UrlA = null;
  for (let i = 0; i < 60; i++) {
    const runInfo = await apiRequest(`runs/${searchRunId}`);
    if (runInfo.export_done) {
      const downloadA = await apiRequest(`runs/${searchRunId}/download`);
      s3UrlA = downloadA.s3;
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  let searchResults: any[] = [];
  if (s3UrlA) {
    const csvResponseA = await fetch(s3UrlA);
    const csvTextA = await csvResponseA.text();
    const { parse } = await import('csv-parse/sync');
    searchResults = parse(csvTextA, { columns: true, skip_empty_lines: true }) as any[];
  } else {
    // Fallback: paginated results
    let page = 1;
    while (true) {
      const res = await apiRequest(`results?run=${searchRunId}&limit=100&page=${page}`);
      const list = res.data || [];
      if (list.length === 0) break;
      searchResults = searchResults.concat(list);
      if (list.length < 100) break;
      page++;
    }
  }

  console.log(`✓ Total leads found across searches in Squid A: ${searchResults.length}`);

  if (searchResults.length === 0) {
    console.log('No new leads found in this run. Pipeline finished.');
    await updateStatus('Search complete: no new profiles found.');
    return;
  }

  // 3. Filter for Swiss Hubs searches / relevant leads
  console.log('\n[Phase 3] 🎯 Filtering Swiss Hubs leads and enqueuing to Squid B...');
  const swissLeadsFound: any[] = [];
  const profileUrlsToScrape = new Set<string>();
  const urlToSectionMap: Record<string, SwissSectionKey> = {};

  for (const lead of searchResults) {
    const inputUrl = lead['INPUT URL'] || lead.input_url || '';
    if (!SWISS_SECTIONS.some(s => s.searchUrl === inputUrl) && !isSwissSearchUrl(inputUrl)) {
      continue;
    }

    const section = getSectionFromUrl(inputUrl);
    const profileUrl = lead['SALES NAVIGATOR PROFILE URL'] || lead['LINKEDIN PROFILE URL'] || lead.sales_navigator_profile_url || lead.linkedin_profile_url || lead.profile_url || lead.url;
    
    if (profileUrl) {
      swissLeadsFound.push(lead);
      if (!profileUrlsToScrape.has(profileUrl)) {
        profileUrlsToScrape.add(profileUrl);
        urlToSectionMap[profileUrl] = section;
      }
    }
  }

  console.log(`✓ Found ${profileUrlsToScrape.size} unique profiles to enrich with Squid B.`);
  await updateStatus(`Found ${profileUrlsToScrape.size} profiles. Sending to Squid B for enrichment...`);

  // 4. Clear old tasks from Squid B and enqueue new tasks
  console.log('Clearing old tasks from Squid B...');
  while (true) {
    const tasksList = await apiRequest(`tasks?squid=${SQUID_B_ID}&limit=50`);
    if (!tasksList.data || tasksList.data.length === 0) break;
    for (const task of tasksList.data) {
      await apiRequest(`tasks/${task.id}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  // Add tasks to Squid B
  const tasksB = Array.from(profileUrlsToScrape).map(url => ({
    url
  }));
  
  await apiRequest('tasks', {
    method: 'POST',
    body: JSON.stringify({
      squid: SQUID_B_ID,
      tasks: tasksB
    })
  });
  console.log(`✓ Enqueued ${tasksB.length} tasks to Squid B.`);

  // 5. Start Squid B Run
  console.log('\n[Phase 4] 🚀 Launching Squid B (Profile Scraper)...');
  await updateStatus(`Deep scrape in progress with Squid B (${tasksB.length} profiles)...`);
  const profileRunRes = await apiRequest('runs', {
    method: 'POST',
    body: JSON.stringify({ squid: SQUID_B_ID })
  });
  const profileRunId = profileRunRes.id;
  await waitForRunCompletion(profileRunId, 'Squid B Profile Scraper');

  // 6. Fetch enriched profiles from Squid B
  console.log('\n[Phase 5] 💾 Ingesting enriched profiles into Supabase swiss_leads...');
  let s3UrlB = null;
  for (let i = 0; i < 60; i++) {
    const runInfo = await apiRequest(`runs/${profileRunId}`);
    if (runInfo.export_done) {
      const downloadB = await apiRequest(`runs/${profileRunId}/download`);
      s3UrlB = downloadB.s3;
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  let profileResults: any[] = [];
  if (s3UrlB) {
    const csvResponseB = await fetch(s3UrlB);
    const csvTextB = await csvResponseB.text();
    const { parse } = await import('csv-parse/sync');
    profileResults = parse(csvTextB, { columns: true, skip_empty_lines: true }) as any[];
  } else {
    let profPage = 1;
    while (true) {
      const res = await apiRequest(`results?run=${profileRunId}&limit=100&page=${profPage}`);
      const list = res.data || [];
      if (list.length === 0) break;
      profileResults = profileResults.concat(list);
      if (list.length < 100) break;
      profPage++;
    }
  }

  console.log(`✓ Fetched ${profileResults.length} deep profiles from Squid B.`);

  const leadsToUpsert = profileResults.map((p: any) => {
    const profileUrl = p['SALES NAVIGATOR PROFILE URL'] || p['LINKEDIN PROFILE URL'] || p.sales_navigator_profile_url || p.linkedin_profile_url || p.profile_url || p.url || '';
    let section = urlToSectionMap[profileUrl] || getSectionFromUrl(p['INPUT URL'] || p.input_url || '');

    let allPos = p.positions || p['POSITIONS'] || p.jobs || p.experiences || [];
    if (typeof allPos === 'string') {
      try { allPos = JSON.parse(allPos); } catch (e) { allPos = []; }
    }

    let currentPos: any[] = [];
    let pastPos: any[] = [];

    if (Array.isArray(allPos) && allPos.length > 0) {
      currentPos = allPos.filter((pos: any) => pos.current === true);
      pastPos = allPos.filter((pos: any) => pos.current === false);
      if (currentPos.length === 0 && allPos.length > 0) {
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

    // Smart tenure classification for 1 to 2 years
    if (section !== 'stealth') {
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

    let edu = p.education || [];
    if (typeof edu === 'string') {
      try { edu = JSON.parse(edu); } catch (e) { edu = []; }
    }

    let shared = p.shared_connections || [];
    if (typeof shared === 'string') {
      try { shared = JSON.parse(shared); } catch (e) { shared = []; }
    }

    return {
      profile_url: profileUrl,
      full_name: p.full_name || p['FULL NAME'] || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      job_title: p.job_title || p['JOB TITLE'] || p.headline || p['POSITION'] || '',
      company: p.company || p['COMPANY NAME'] || (currentPos[0]?.company_name) || '',
      location: p.location || p['LOCATION'] || '',
      avatar_url: p.avatar_url || p.profile_picture || p['PICTURE URL'] || '',
      summary: p.summary || p['ABOUT'] || '',
      current_position: currentPos,
      past_position: pastPos,
      education: edu,
      shared_connections: shared,
      source_url: p['INPUT URL'] || null,
      section,
      is_genesis: isGenesis,
      scraped_at: new Date().toISOString()
    };
  }).filter(l => Boolean(l.profile_url));

  // Deduplicate by profile_url to prevent Postgres 21000 error
  const uniqueMap = new Map<string, any>();
  for (const lead of leadsToUpsert) {
    if (lead.profile_url) {
      uniqueMap.set(lead.profile_url, lead);
    }
  }
  const deduplicatedLeads = Array.from(uniqueMap.values());

  if (deduplicatedLeads.length > 0) {
    for (let i = 0; i < deduplicatedLeads.length; i += 50) {
      const chunk = deduplicatedLeads.slice(i, i + 50);
      const { error: upsertErr } = await supabase
        .from('swiss_leads')
        .upsert(chunk, { onConflict: 'profile_url' });

      if (upsertErr) {
        console.error('Supabase upsert error:', upsertErr);
        throw upsertErr;
      }
    }
  }

  console.log(`✓ Successfully updated ${deduplicatedLeads.length} Swiss Hubs leads in Supabase!`);
  await updateStatus(`Completed: ${deduplicatedLeads.length} profiles enriched with Squid A and B.`);
}

// CLI execution
if (require.main === module) {
  const isGenesis = process.argv.includes('--genesis');
  runSwissScraper(isGenesis)
    .then(() => {
      console.log('Swiss scraping process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Swiss scraper failed:', err);
      process.exit(1);
    });
}
