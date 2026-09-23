import { createClient } from '@supabase/supabase-js';
import { getSectionFromUrl, SwissSectionKey } from '../src/app/swissSources';
import { parse } from 'csv-parse/sync';

const SQUID_A_ID = 'db99446c4c6f47518cf2ebdd8f01b500';
const SQUID_B_ID = '3b42144f46e54f9f800ad0380c3740f7';
const LOBSTR_API_KEY = process.env.LOBSTR_API_KEY || '8168cd9de13c5ef76bf7101c45f7dd47de8dc850';

const supabaseUrl = 'https://rhikhvzwhrmqxviucwyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWtodnp3aHJtcXh2aXVjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzAyOTAsImV4cCI6MjEwMzI0NjI5MH0.GbQPxMRTFNH0E1bDh-nkiAzIJAlmdQfrK3I_bry7oGY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function apiRequest(endpoint: string) {
  const url = `https://api.lobstr.io/v1/${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Token ${LOBSTR_API_KEY}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function run() {
  console.log('1. Fetching Squid A S3 CSV for all 384 Swiss search leads...');
  const squidA = await apiRequest(`squids/${SQUID_A_ID}`);
  const runAId = squidA.last_run;
  const dlA = await apiRequest(`runs/${runAId}/download`);
  const csvRes = await fetch(dlA.s3);
  const csvText = await csvRes.text();
  const searchRows: any[] = parse(csvText, { columns: true, skip_empty_lines: true });
  console.log(`Found ${searchRows.length} rows in Squid A export.`);

  // Load existing leads in Supabase to preserve any already-enriched deep fields
  const { data: existingLeads } = await supabase.from('swiss_leads').select('*');
  const existingMap = new Map<string, any>();
  for (const el of (existingLeads || [])) {
    if (el.profile_url) existingMap.set(el.profile_url, el);
    const clean = el.profile_url?.match(/ACwAAA[a-zA-Z0-9_-]+/);
    if (clean) existingMap.set(clean[0], el);
  }
  console.log(`Existing leads in Supabase: ${existingMap.size}`);

  const uniqueLeadsMap = new Map<string, any>();

  for (const row of searchRows) {
    const profileUrl = row['SALES NAVIGATOR PROFILE URL'] || row['LINKEDIN PROFILE URL'] || '';
    if (!profileUrl) continue;

    const inputUrl = row['INPUT URL'] || '';
    const section = getSectionFromUrl(inputUrl);

    const cleanMatch = profileUrl.match(/ACwAAA[a-zA-Z0-9_-]+/);
    const cleanKey = cleanMatch ? cleanMatch[0] : profileUrl;

    const existing = existingMap.get(profileUrl) || (cleanMatch ? existingMap.get(cleanMatch[0]) : null);

    // Format current position from Squid A data if not already enriched
    let currentPositions = existing?.current_position || [];
    if (!Array.isArray(currentPositions) || currentPositions.length === 0) {
      if (row['COMPANY NAME'] || row['POSITION']) {
        let startedOn = null;
        if (row['STARTED ON']) {
          const d = new Date(row['STARTED ON']);
          if (!isNaN(d.getTime())) {
            startedOn = { year: d.getFullYear(), month: d.getMonth() + 1 };
          }
        }
        currentPositions = [{
          company_name: row['COMPANY NAME'] || '',
          title: row['POSITION'] || row['HEADLINE'] || '',
          company_linkedin_url: row['COMPANY LINKEDIN URL'] || '',
          company_logo: row['COMPANY PROFILE PICTURE'] || null,
          started_on: startedOn,
          location: row['COMPANY LOCATION'] || row['LOCATION'] || ''
        }];
      }
    }

    // Infer Swiss education if not already enriched
    let education = existing?.education || [];
    if (!Array.isArray(education) || education.length === 0) {
      const textToCheck = `${row['HEADLINE'] || ''} ${row['SUMMARY'] || ''} ${row['CURRENT ROLE DESCRIPTION'] || ''}`.toLowerCase();
      const detectedSchools: any[] = [];
      if (textToCheck.includes('epfl')) detectedSchools.push({ school_name: 'EPFL' });
      if (textToCheck.includes('eth') || textToCheck.includes('zürich') || textToCheck.includes('zurich')) detectedSchools.push({ school_name: 'ETH Zürich' });
      if (textToCheck.includes('st.gallen') || textToCheck.includes('st. gallen') || textToCheck.includes('hsg')) detectedSchools.push({ school_name: 'University of St.Gallen' });
      education = detectedSchools;
    }

    const leadObj = {
      profile_url: profileUrl,
      full_name: row['FULL NAME'] || `${row['FIRST NAME'] || ''} ${row['LAST NAME'] || ''}`.trim() || existing?.full_name || '',
      job_title: row['POSITION'] || row['HEADLINE'] || existing?.job_title || '',
      company: row['COMPANY NAME'] || existing?.company || '',
      location: row['LOCATION'] || existing?.location || '',
      avatar_url: row['PICTURE URL'] || existing?.avatar_url || '',
      summary: row['SUMMARY'] || existing?.summary || '',
      current_position: currentPositions,
      past_position: existing?.past_position || [],
      education: education,
      shared_connections: existing?.shared_connections || [],
      source_url: inputUrl || existing?.source_url || profileUrl,
      section: section || existing?.section || 'stealth',
      is_genesis: true,
      scraped_at: existing?.scraped_at || new Date().toISOString()
    };

    uniqueLeadsMap.set(profileUrl, leadObj);
  }

  const allToUpsert = Array.from(uniqueLeadsMap.values());
  console.log(`Upserting all ${allToUpsert.length} Swiss Hubs leads into Supabase...`);

  for (let i = 0; i < allToUpsert.length; i += 50) {
    const chunk = allToUpsert.slice(i, i + 50);
    const { error } = await supabase.from('swiss_leads').upsert(chunk, { onConflict: 'profile_url' });
    if (error) {
      console.error('Upsert error:', error);
      throw error;
    }
  }

  console.log(`✓ All ${allToUpsert.length} leads successfully populated in Supabase!`);
}

run().catch(console.error);
