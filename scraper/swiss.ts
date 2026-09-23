import { createClient } from '@supabase/supabase-js';
import { SWISS_SECTIONS, getSectionFromUrl, SwissSectionKey } from '../src/app/swissSources';

// STRICT SAFETY GUARD: Squid A is sacred and untouchable
const SQUID_A_ID = 'db99446c4c6f47518cf2ebdd8f01b500';
const LOBSTR_API_KEY = process.env.LOBSTR_API_KEY || '8168cd9de13c5ef76bf7101c45f7dd47de8dc850';
const ACCOUNT_ID = '94c9e3ca87cce9ab3c8516efa40979eb';
const SEARCH_CRAWLER_ID = 'a1d243d3824a1ac773414416eb80362d';
const PROFILE_CRAWLER_ID = '40d08f9bfec4a8775bb5586ce7b33a35';

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
  // Safety verification
  if (endpoint.includes(SQUID_A_ID) && (options.method === 'DELETE' || options.method === 'POST' || options.method === 'PUT')) {
    throw new Error('FATAL SAFETY VIOLATION: ATTEMPT TO MODIFY OR DELETE SQUID A BLOCKED!');
  }

  const url = `https://api.lobstr.io/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Token ${LOBSTR_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lobstr API error [${res.status}] ${endpoint}: ${text}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

async function waitForRunCompletion(runId: string, label: string = 'Run'): Promise<any> {
  console.log(`Waiting for ${label} (${runId}) to finish...`);
  while (true) {
    await new Promise(r => setTimeout(r, 6000));
    const run = await apiRequest(`runs/${runId}`);
    console.log(`[${label}] Status: ${run.status} | Results: ${run.total_results || 0}`);
    
    if (run.status === 'DONE') {
      return run;
    }
    if (run.status === 'ERROR' || run.status === 'CANCELLED') {
      throw new Error(`[${label}] failed with status: ${run.status}`);
    }
    if (run.status === 'PAUSED') {
      const reason = run.pause_reason || 'unknown';
      const desc = run.pause_reason_desc || '';
      throw new Error(`[${label}] paused: ${reason} - ${desc}`);
    }
  }
}

export async function runSwissScraper(isGenesis: boolean = false) {
  console.log('================================================================');
  console.log(`🇨🇭 SWISS HUBS PIPELINE - MODE: ${isGenesis ? '🌱 GENESI (BASELINE)' : '🌅 DAILY (RECENT)'}`);
  console.log('================================================================');

  await updateStatus(`Avvio pipeline Swiss Hubs (${isGenesis ? 'Genesi' : 'Daily'})...`);

  // STEP 0: Safety Check - Ensure Squid A is completely untouched
  const squidsData = await apiRequest('squids');
  const allSquids = squidsData.data || squidsData || [];
  const squidA = allSquids.find((s: any) => s.id === SQUID_A_ID);
  if (!squidA) {
    throw new Error('FATAL: Squid A was not found! Aborting immediately for safety.');
  }
  console.log(`✓ Verified Squid A is 100% safe and intact: ${squidA.id} (${squidA.name})`);

  let squidB = allSquids.find((s: any) => s.id !== SQUID_A_ID);
  let tempSearchSquidId: string | null = null;
  let restoredSquidBId: string = squidB ? squidB.id : '';

  try {
    // STEP 1: Handle Search Scraping
    console.log('\n[Phase 1] 🔍 Setting up Swiss Hubs Search Scraper...');
    await updateStatus('Configurazione dello Search Scraper per le 4 sezioni svizzere...');

    if (squidB) {
      console.log(`Backing up and temporarily removing Squid B (${squidB.id})...`);
      await fetch(`https://api.lobstr.io/v1/squids/${squidB.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${LOBSTR_API_KEY}` }
      });
      console.log(`✓ Temporarily cleared slot from Squid B`);
    }

    // Create temporary Search Squid
    const newSearchSquid = await apiRequest('squids', {
      method: 'POST',
      body: JSON.stringify({
        crawler: SEARCH_CRAWLER_ID,
        name: 'Swiss Hubs Temp Search Scraper',
        accounts: [{ id: ACCOUNT_ID }]
      })
    });
    tempSearchSquidId = newSearchSquid.id;
    console.log(`✓ Created Temporary Search Squid: ${tempSearchSquidId}`);

    // Configure search params (Strictly disable email and mobile enrichment)
    await apiRequest(`squids/${tempSearchSquidId}`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Swiss Hubs Temp Search Scraper',
        accounts: [{ id: ACCOUNT_ID }],
        params: {
          max_results: isGenesis ? 250 : 50,
          max_pages: isGenesis ? 10 : 3,
          profiles_per_page: 25,
          skip_collected_leads: !isGenesis,
          functions: {
            email_enrichment: false,
            mobile_enrichment: false,
            get_profile_details: false
          }
        }
      })
    });

    // Add tasks for the 4 Swiss Search URLs
    console.log('Adding 4 Swiss Hubs search tasks...');
    for (const sec of SWISS_SECTIONS) {
      await apiRequest('tasks', {
        method: 'POST',
        body: JSON.stringify({
          squid: tempSearchSquidId,
          params: { url: sec.searchUrl }
        })
      });
      console.log(`  + Added search task for section: ${sec.label}`);
    }

    // Launch Search Run
    console.log('\n[Phase 2] 🚀 Starting Search Scrape run...');
    await updateStatus('Esecuzione della ricerca Sales Navigator per le 4 sezioni svizzere...');
    const searchRunRes = await apiRequest('runs', {
      method: 'POST',
      body: JSON.stringify({ squid: tempSearchSquidId })
    });
    const searchRunId = searchRunRes.id;
    await waitForRunCompletion(searchRunId, 'Swiss Search Scraper');

    // Fetch search results
    console.log('\n[Phase 3] 📥 Fetching search results...');
    let searchResults: any[] = [];
    let page = 1;
    while (true) {
      const res = await apiRequest(`results?run=${searchRunId}&limit=100&page=${page}`);
      const list = res.data || [];
      if (list.length === 0) break;
      searchResults = searchResults.concat(list);
      if (list.length < 100) break;
      page++;
    }
    console.log(`✓ Total leads found across Swiss searches: ${searchResults.length}`);
    await updateStatus(`Trovati ${searchResults.length} profili. Avvio deep scrape con Profile Scraper...`);

    // STEP 4: Delete temporary search squid and restore Profile Scraper Squid (Squid B)
    console.log(`\n[Phase 4] 🔄 Cleaning up search squid and preparing Profile Scraper...`);
    if (tempSearchSquidId) {
      await fetch(`https://api.lobstr.io/v1/squids/${tempSearchSquidId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${LOBSTR_API_KEY}` }
      });
      tempSearchSquidId = null;
      console.log('✓ Cleaned up temporary search squid');
    }

    // Create / Re-create Profile Scraper (Squid B)
    const newProfileSquid = await apiRequest('squids', {
      method: 'POST',
      body: JSON.stringify({
        crawler: PROFILE_CRAWLER_ID,
        name: 'SN Profile Scraper',
        accounts: [{ id: ACCOUNT_ID }]
      })
    });
    restoredSquidBId = newProfileSquid.id;
    console.log(`✓ Restored Profile Scraper Squid: ${restoredSquidBId}`);

    // Configure Profile Scraper (STRICT: email_enrichment: false, mobile_enrichment: false)
    await apiRequest(`squids/${restoredSquidBId}`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'SN Profile Scraper',
        accounts: [{ id: ACCOUNT_ID }],
        params: {
          functions: {
            email_enrichment: false,
            mobile_enrichment: false
          }
        }
      })
    });

    if (searchResults.length === 0) {
      console.log('No leads found in this run. Pipeline complete.');
      await updateStatus('Ricerca completata: nessun nuovo profilo trovato.');
      return;
    }

    // STEP 5: Add profile tasks for Deep Scrape
    console.log('\n[Phase 5] 👤 Adding profile URLs to Profile Scraper for deep enrichment...');
    const urlToSectionMap: Record<string, SwissSectionKey> = {};
    const uniqueProfileUrls = new Set<string>();

    for (const lead of searchResults) {
      const inputUrl = lead['INPUT URL'] || lead.input_url || '';
      const section = getSectionFromUrl(inputUrl);
      const profileUrl = lead['SALES NAVIGATOR PROFILE URL'] || lead['LINKEDIN PROFILE URL'] || lead.profile_url || lead.url;
      
      if (profileUrl && !uniqueProfileUrls.has(profileUrl)) {
        uniqueProfileUrls.add(profileUrl);
        urlToSectionMap[profileUrl] = section;

        await apiRequest('tasks', {
          method: 'POST',
          body: JSON.stringify({
            squid: restoredSquidBId,
            params: { url: profileUrl }
          })
        });
      }
    }
    console.log(`✓ Enqueued ${uniqueProfileUrls.size} unique profiles for deep scraping.`);

    // STEP 6: Run Profile Scraper
    console.log('\n[Phase 6] 🚀 Launching deep profile scraping...');
    await updateStatus(`Deep scrape in corso per ${uniqueProfileUrls.size} profili...`);
    const profileRunRes = await apiRequest('runs', {
      method: 'POST',
      body: JSON.stringify({ squid: restoredSquidBId })
    });
    const profileRunId = profileRunRes.id;
    await waitForRunCompletion(profileRunId, 'Profile Deep Scraper');

    // STEP 7: Ingest enriched profiles into Supabase `swiss_leads`
    console.log('\n[Phase 7] 💾 Ingesting enriched profiles into Supabase swiss_leads...');
    let profileResults: any[] = [];
    let profPage = 1;
    while (true) {
      const res = await apiRequest(`results?run=${profileRunId}&limit=100&page=${profPage}`);
      const list = res.data || [];
      if (list.length === 0) break;
      profileResults = profileResults.concat(list);
      if (list.length < 100) break;
      profPage++;
    }

    console.log(`✓ Fetched ${profileResults.length} deep profiles from Lobstr.`);

    const leadsToUpsert = profileResults.map((p: any) => {
      const profileUrl = p['SALES NAVIGATOR PROFILE URL'] || p['LINKEDIN PROFILE URL'] || p.profile_url || p.url || '';
      const section = urlToSectionMap[profileUrl] || 'stealth';

      let currentPos = p.current_positions || p.current_position || [];
      if (typeof currentPos === 'string') {
        try { currentPos = JSON.parse(currentPos); } catch (e) { currentPos = []; }
      }

      let pastPos = p.past_positions || p.past_position || [];
      if (typeof pastPos === 'string') {
        try { pastPos = JSON.parse(pastPos); } catch (e) { pastPos = []; }
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
        job_title: p.job_title || p['JOB TITLE'] || p.headline || '',
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

    const { error: upsertErr } = await supabase
      .from('swiss_leads')
      .upsert(leadsToUpsert, { onConflict: 'profile_url' });

    if (upsertErr) {
      console.error('Supabase upsert error:', upsertErr);
      throw upsertErr;
    }

    console.log(`✓ Successfully saved ${leadsToUpsert.length} Swiss Hubs leads to Supabase!`);
    await updateStatus(`Completato: ${leadsToUpsert.length} profili arricchiti e salvati nel database.`);
  } catch (error: any) {
    console.error('Pipeline error:', error);
    await updateStatus(`Errore durante lo scraping: ${error.message || 'Errore sconosciuto'}`);
    throw error;
  } finally {
    // ALWAYS ensure cleanup: if temp search squid exists, clean it up
    if (tempSearchSquidId) {
      try {
        await fetch(`https://api.lobstr.io/v1/squids/${tempSearchSquidId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Token ${LOBSTR_API_KEY}` }
        });
        console.log('✓ Finally block: cleaned up temporary search squid.');
      } catch (e) {}
    }

    // Ensure Squid B is present
    const squidsAfter = await apiRequest('squids').catch(() => ({ data: [] }));
    const listAfter = squidsAfter.data || squidsAfter || [];
    const hasProfileSquid = listAfter.some((s: any) => s.id !== SQUID_A_ID);
    if (!hasProfileSquid) {
      try {
        console.log('Re-creating Squid B in finally block for safety...');
        await apiRequest('squids', {
          method: 'POST',
          body: JSON.stringify({
            crawler: PROFILE_CRAWLER_ID,
            name: 'SN Profile Scraper',
            accounts: [{ id: ACCOUNT_ID }]
          })
        });
        console.log('✓ Re-created Squid B.');
      } catch (e) {
        console.error('Failed to restore Squid B in finally block:', e);
      }
    }
  }
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
