import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

const SQUID_B_ID = '3b42144f46e54f9f800ad0380c3740f7';
const LOBSTR_API_KEY = process.env.LOBSTR_API_KEY || '8168cd9de13c5ef76bf7101c45f7dd47de8dc850';

const supabaseUrl = 'https://rhikhvzwhrmqxviucwyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWtodnp3aHJtcXh2aXVjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzAyOTAsImV4cCI6MjEwMzI0NjI5MH0.GbQPxMRTFNH0E1bDh-nkiAzIJAlmdQfrK3I_bry7oGY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Downloading S3 CSV from completed Squid B run...');
  const res = await fetch(`https://api.lobstr.io/v1/squids/${SQUID_B_ID}`, {
    headers: { 'Authorization': `Token ${LOBSTR_API_KEY}` }
  });
  const squidB = await res.json();
  const dlRes = await fetch(`https://api.lobstr.io/v1/runs/${squidB.last_run}/download`, {
    headers: { 'Authorization': `Token ${LOBSTR_API_KEY}` }
  });
  const dl = await dlRes.json();
  const csvRes = await fetch(dl.s3);
  const csvText = await csvRes.text();
  const rows = parse(csvText, { columns: true, skip_empty_lines: true });
  console.log(`Parsed ${rows.length} rows from CSV.`);

  // Load existing leads from Supabase
  const { data: existingLeads } = await supabase.from('swiss_leads').select('id, profile_url, section');
  const existingMap = new Map<string, any>();
  for (const l of (existingLeads || [])) {
    if (l.profile_url) existingMap.set(l.profile_url, l);
    const clean = l.profile_url?.match(/ACwAAA[a-zA-Z0-9_-]+/);
    if (clean) existingMap.set(clean[0], l);
  }

  const updates: any[] = [];
  const now = new Date();

  for (const row of rows) {
    const profileUrl = row['SALES NAVIGATOR URL'] || row['PUBLIC URL'] || row['INPUT URL'] || '';
    if (!profileUrl) continue;

    const cleanMatch = profileUrl.match(/ACwAAA[a-zA-Z0-9_-]+/);
    const existing = existingMap.get(profileUrl) || (cleanMatch ? existingMap.get(cleanMatch[0]) : null);
    if (!existing) continue;

    let allPos: any[] = [];
    if (row['POSITIONS']) {
      try { allPos = JSON.parse(row['POSITIONS']); } catch (e) { allPos = []; }
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
    }

    let edu: any[] = [];
    if (row['EDUCATIONS']) {
      try { edu = JSON.parse(row['EDUCATIONS']); } catch (e) { edu = []; }
    }

    let shared: any[] = [];
    if (row['SHARED CONNECTIONS']) {
      try { shared = JSON.parse(row['SHARED CONNECTIONS']); } catch (e) { shared = []; }
    }

    // Smart section determination
    let section = existing.section;
    if (section !== 'stealth') {
      const s = currentPos[0]?.started_on || currentPos[0]?.startedOn;
      if (s && s.year) {
        const startDate = new Date(s.year, (s.month || 1) - 1);
        const months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        if (months >= 12 && months <= 24) {
          section = '1_to_2_years';
        } else if (months < 12 && section !== 'changed_job') {
          section = 'less_1_year';
        }
      }
    }

    updates.push({
      id: existing.id,
      profile_url: existing.profile_url,
      current_position: currentPos,
      past_position: pastPos,
      education: edu,
      shared_connections: shared,
      section
    });
  }

  console.log(`Updating ${updates.length} leads in Supabase...`);
  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    const { error } = await supabase.from('swiss_leads').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Error updating chunk:', error);
      throw error;
    }
  }

  console.log('✓ Successfully updated all leads with correct Current and Past positions, Education, and Connections!');
}

main().catch(console.error);
