import { createClient } from '@supabase/supabase-js';
import { getSectionFromUrl, SwissSectionKey } from '../src/app/swissSources';

const SQUID_A_ID = 'db99446c4c6f47518cf2ebdd8f01b500';
const SQUID_B_ID = '3b42144f46e54f9f800ad0380c3740f7';
const LOBSTR_API_KEY = process.env.LOBSTR_API_KEY || '8168cd9de13c5ef76bf7101c45f7dd47de8dc850';

const supabaseUrl = 'https://rhikhvzwhrmqxviucwyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWtodnp3aHJtcXh2aXVjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzAyOTAsImV4cCI6MjEwMzI0NjI5MH0.GbQPxMRTFNH0E1bDh-nkiAzIJAlmdQfrK3I_bry7oGY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function apiRequest(endpoint: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const url = `https://api.lobstr.io/v1/${endpoint}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${LOBSTR_API_KEY}`, 'Content-Type': 'application/json' }
    });
    if (res.status === 429) {
      await sleep(1500);
      continue;
    }
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error(`Exceeded max retries for ${endpoint}`);
}

async function syncLive() {
  console.log('Fetching Squid B active run...');
  const squidB = await apiRequest(`squids/${SQUID_B_ID}`);
  const runId = squidB.last_run;
  console.log(`Squid B Run ID: ${runId}`);

  // Fetch results from run
  let allResults: any[] = [];
  let page = 1;
  while (true) {
    await sleep(400);
    const res = await apiRequest(`results?run=${runId}&page=${page}`);
    const data = res.data || [];
    if (data.length === 0) break;
    allResults = allResults.concat(data);
    console.log(`Retrieved page ${page}/${res.total_pages} (${allResults.length} profiles)...`);
    if (page >= res.total_pages) break;
    page++;
  }
  console.log(`Fetched total ${allResults.length} profiles from Squid B.`);

  // Load section mapping from Squid A S3 CSV
  const squidA = await apiRequest(`squids/${SQUID_A_ID}`);
  const runAId = squidA.last_run;
  const downloadA = await apiRequest(`runs/${runAId}/download`);
  const urlToSectionMap: Record<string, SwissSectionKey> = {};
  if (downloadA.s3) {
    const csvRes = await fetch(downloadA.s3);
    const csvText = await csvRes.text();
    const { parse } = await import('csv-parse/sync');
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
  }

  const uniqueLeadsMap = new Map<string, any>();

  for (const p of allResults) {
    const profileUrl = p['SALES NAVIGATOR PROFILE URL'] || p['LINKEDIN PROFILE URL'] || p.sales_navigator_url || p.public_url || p.url || '';
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

    let currentPos = p.positions || p.current_positions || p.current_position || [];
    if (typeof currentPos === 'string') {
      try { currentPos = JSON.parse(currentPos); } catch (e) { currentPos = []; }
    }

    let pastPos = p.past_positions || p.past_position || [];
    if (typeof pastPos === 'string') {
      try { pastPos = JSON.parse(pastPos); } catch (e) { pastPos = []; }
    }

    let edu = p.educations || p.education || [];
    if (typeof edu === 'string') {
      try { edu = JSON.parse(edu); } catch (e) { edu = []; }
    }

    let shared = p.shared_connections || [];
    if (typeof shared === 'string') {
      try { shared = JSON.parse(shared); } catch (e) { shared = []; }
    }

    const firstPos = Array.isArray(currentPos) && currentPos.length > 0 ? currentPos[0] : null;

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
  console.log(`Upserting ${leadsToUpsert.length} deduplicated leads into Supabase...`);

  // Upsert in batches of 50
  for (let i = 0; i < leadsToUpsert.length; i += 50) {
    const chunk = leadsToUpsert.slice(i, i + 50);
    const { error } = await supabase.from('swiss_leads').upsert(chunk, { onConflict: 'profile_url' });
    if (error) {
      console.error('Upsert chunk error:', error);
      throw error;
    }
  }

  console.log(`✓ Successfully synced ${leadsToUpsert.length} unique profiles to Supabase!`);
  
  await supabase.from('swiss_scraper_status').upsert({
    id: 1,
    section: 'all',
    status: `Genesi in corso: ${leadsToUpsert.length}/384 profili arricchiti e sincronizzati live`,
    updated_at: new Date().toISOString()
  });
}

syncLive().catch(console.error);
