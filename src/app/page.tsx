import { createClient } from '@supabase/supabase-js';
import TabsWrapper from './TabsWrapper';

export const dynamic = 'force-dynamic';

const supabaseUrl = 'https://rhikhvzwhrmqxviucwyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWtodnp3aHJtcXh2aXVjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzAyOTAsImV4cCI6MjEwMzI0NjI5MH0.GbQPxMRTFNH0E1bDh-nkiAzIJAlmdQfrK3I_bry7oGY';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function Home() {
  const [leadsRes, profilesRes, statusRes] = await Promise.all([
    supabase
      .from('swiss_leads')
      .select('*')
      .order('scraped_at', { ascending: false }),
    supabase
      .from('entity_profiles')
      .select('name, linkedin_url, logo_url')
      .not('logo_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(400),
    supabase
      .from('swiss_scraper_status')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
  ]);

  const leads = leadsRes.data || [];
  const initialProfiles = profilesRes.data || [];
  const statusRow = statusRes.data?.[0];
  const scraperStatus = statusRow?.status || 'In attesa del primo scrape';
  const lastUpdated = statusRow?.updated_at || '';

  return (
    <TabsWrapper
      leads={leads}
      initialProfiles={initialProfiles}
      scraperStatus={scraperStatus}
      lastUpdated={lastUpdated}
    />
  );
}
