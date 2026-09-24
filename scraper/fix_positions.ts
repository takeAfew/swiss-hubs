import { createClient } from '@supabase/supabase-js';

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

async function fix() {
  console.log('1. Fetching all results from completed Squid B run...');
  const squidB = await apiRequest(`squids/${SQUID_B_ID}`);
  const runId = squidB.last_run;
  console.log(`Run ID: ${runId}`);

  let allResults: any[] = [];
  let page = 1;
  while (true) {
    await sleep(350);
    const res = await apiRequest(`results?run=${runId}&page=${page}`);
    const data = res.data || [];
    if (data.length === 0) break;
    allResults = allResults.concat(data);
    if (page >= res.total_pages) break;
    page++;
  }
  console.log(`Fetched ${allResults.length} profiles from Squid B.`);

  // Load existing leads from Supabase
  const { data: existingLeads } = await supabase.from('swiss_leads').select('id, profile_url, section');
  const existingMap = new Map<string, any>();
  for (const l of (existingLeads || [])) {
    if (l.profile_url) existingMap.set(l.profile_url, l);
    const clean = l.profile_url?.match(/ACwAAA[a-zA-Z0-9_-]+/);
    if (clean) existingMap.set(clean[0], l);
  }

  const updates: any[] = [];

  for (const p of allResults) {
    const profileUrl = p['SALES NAVIGATOR PROFILE URL'] || p['LINKEDIN PROFILE URL'] || p.sales_navigator_url || p.public_url || p.url || '';
    if (!profileUrl) continue;

    const cleanMatch = profileUrl.match(/ACwAAA[a-zA-Z0-9_-]+/);
    const existing = existingMap.get(profileUrl) || (cleanMatch ? existingMap.get(cleanMatch[0]) : null);
    if (!existing) continue;

    let allPos = p.positions || [];
    if (typeof allPos === 'string') {
      try { allPos = JSON.parse(allPos); } catch (e) { allPos = []; }
    }

    let currentPos: any[] = [];
    let pastPos: any[] = [];

    if (Array.isArray(allPos) && allPos.length > 0) {
      currentPos = allPos.filter((pos: any) => pos.current === true);
      pastPos = allPos.filter((pos: any) => pos.current === false);

      // Fallback if none had current: true
      if (currentPos.length === 0 && allPos.length > 0) {
        currentPos = [allPos[0]];
        pastPos = allPos.slice(1);
      }
    }

    updates.push({
      id: existing.id,
      profile_url: profileUrl,
      current_position: currentPos,
      past_position: pastPos
    });
  }

  console.log(`Updating positions for ${updates.length} leads in Supabase...`);
  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    const { error } = await supabase.from('swiss_leads').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Error updating chunk:', error);
      throw error;
    }
  }

  console.log('✓ Successfully fixed current and past positions for all leads!');
}

fix().catch(console.error);
