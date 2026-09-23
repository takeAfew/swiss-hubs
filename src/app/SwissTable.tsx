'use client';

import React, { useState, useMemo, useRef } from 'react';
import { CompanyLogo } from './CompanyLogo';
import { createClient } from '@supabase/supabase-js';
import { isTopSignal } from './topSignalUtils';
import { getMatchingPnpConnections } from './pnpUtils';
import { PnpConnectionsBadge } from './PnpConnectionsBadge';
import { getMatchingVcConnections } from './vcUtils';
import { VcConnectionsBadge } from './VcConnectionsBadge';
import { AvatarImage } from './AvatarImage';

const supabase = createClient(
  'https://rhikhvzwhrmqxviucwyy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWtodnp3aHJtcXh2aXVjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzAyOTAsImV4cCI6MjEwMzI0NjI5MH0.GbQPxMRTFNH0E1bDh-nkiAzIJAlmdQfrK3I_bry7oGY'
);

function formatDuration(start: any, end: any) {
  if (!start || !start.year) return '';
  const startDate = new Date(start.year, (start.month || 1) - 1);
  const endDate = (end && end.year) ? new Date(end.year, (end.month || 1) - 1) : new Date();
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  if (months < 1) return '< 1 mo';
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const m = months % 12;
    const yStr = `${years} ${years === 1 ? 'yr' : 'yrs'}`;
    const mStr = m > 0 ? ` ${m} ${m === 1 ? 'mo' : 'mos'}` : '';
    return `${yStr}${mStr}`;
  }
  return `${months} ${months === 1 ? 'mo' : 'mos'}`;
}

function groupJobsByCompany(jobs: any[]) {
  if (!Array.isArray(jobs)) return [];
  const grouped: Record<string, any> = {};
  jobs.forEach(job => {
    const cName = job.company_name || job.companyName || 'Unknown Company';
    const s = job.started_on || job.startedOn;
    const e = job.ended_on || job.endedOn;
    const startVal = s && s.year ? s.year * 12 + (s.month || 1) : 2099 * 12;
    const endVal = e && e.year ? e.year * 12 + (e.month || 12) : 2099 * 12 + 12;
    if (!grouped[cName]) {
      grouped[cName] = { ...job, company_name: cName, title: job.title, latest_start: startVal, min_start_val: startVal, max_end_val: endVal, started_on: s, ended_on: e };
    } else {
      if (startVal > grouped[cName].latest_start) { grouped[cName].title = job.title; grouped[cName].latest_start = startVal; }
      if (startVal < grouped[cName].min_start_val) { grouped[cName].min_start_val = startVal; grouped[cName].started_on = s; }
      if (endVal > grouped[cName].max_end_val) { grouped[cName].max_end_val = endVal; grouped[cName].ended_on = e; }
    }
  });
  return Object.values(grouped).sort((a: any, b: any) => b.latest_start - a.latest_start);
}

function getCountryFlags(profileLocation: string) {
  if (!profileLocation) return '🇨🇭';
  const l = profileLocation.toLowerCase();
  if (l.includes('switzerland') || l.includes('suisse') || l.includes('schweiz') || l.includes('zurich') || l.includes('geneva') || l.includes('lausanne') || l.includes('basel')) return '🇨🇭';
  if (l.includes('united kingdom') || l.includes('uk') || l.includes('london')) return '🇬🇧';
  if (l.includes('united states') || l.includes('usa') || l.includes('san francisco') || l.includes('new york')) return '🇺🇸';
  if (l.includes('germany') || l.includes('deutschland') || l.includes('berlin') || l.includes('munich')) return '🇩🇪';
  if (l.includes('france') || l.includes('paris')) return '🇫🇷';
  if (l.includes('italy') || l.includes('milan') || l.includes('rome')) return '🇮🇹';
  if (l.includes('netherlands') || l.includes('amsterdam')) return '🇳🇱';
  if (l.includes('spain') || l.includes('madrid') || l.includes('barcelona')) return '🇪🇸';
  if (l.includes('sweden') || l.includes('stockholm')) return '🇸🇪';
  return '🌍';
}

function extractSwissSchools(education: any[]): string[] {
  if (!Array.isArray(education)) return [];
  const schools = new Set<string>();
  for (const edu of education) {
    const sName = (edu.school_name || edu.schoolName || '').toLowerCase();
    if (sName.includes('epfl') || sName.includes('lausanne')) schools.add('EPFL');
    if (sName.includes('eth') || sName.includes('zürich') || sName.includes('zurich')) schools.add('ETH Zürich');
    if (sName.includes('st.gallen') || sName.includes('st. gallen') || sName.includes('hsg')) schools.add('St.Gallen');
  }
  return Array.from(schools);
}

function getNormalLinkedinUrl(url?: string): string {
  if (!url) return '#';
  const match = url.match(/\/sales\/(people|lead)\/([^,/?]+)/);
  if (match && match[2]) return `https://www.linkedin.com/in/${match[2]}`;
  return url;
}

export function SwissTable({
  leads,
  sectionName,
  viewMode = 'genesis'
}: {
  leads: any[];
  sectionName: string;
  viewMode?: 'genesis' | 'daily';
}) {
  const [localFeedback, setLocalFeedback] = useState<Record<string, string | null>>({});
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set(['all']));
  const [expandedMore, setExpandedMore] = useState<Set<string>>(new Set());
  
  // Filters
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<boolean>(false);
  const [investorFilter, setInvestorFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const toggleMore = (key: string) => {
    setExpandedMore(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const processedLeads = useMemo(() => {
    return leads.map(l => {
      const currentJobs = groupJobsByCompany(l.current_position || []);
      const pastJobs = groupJobsByCompany(l.past_position || []);
      const education = Array.isArray(l.education) ? l.education : [];
      const swissSchools = extractSwissSchools(education);
      const pnpConnections = getMatchingPnpConnections(l.shared_connections || []);
      const vcConnections = getMatchingVcConnections(l.shared_connections || []);
      const flags = getCountryFlags(l.location || '');
      const dateStr = l.scraped_at ? new Date(l.scraped_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Recent';

      return {
        ...l,
        currentJobs,
        pastJobs,
        education,
        swissSchools,
        pnpConnections,
        hasPnp: pnpConnections.length > 0,
        vcConnections,
        hasVc: vcConnections.length > 0,
        flags,
        dateStr
      };
    });
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return processedLeads.filter(lead => {
      if (schoolFilter !== 'all' && !lead.swissSchools.includes(schoolFilter)) return false;
      if (networkFilter && !lead.hasPnp) return false;
      if (investorFilter && !lead.hasVc) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (lead.full_name || '').toLowerCase().includes(q);
        const matchesCompany = (lead.company || '').toLowerCase().includes(q);
        const matchesTitle = (lead.job_title || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesTitle) return false;
      }
      return true;
    });
  }, [processedLeads, schoolFilter, networkFilter, investorFilter, searchQuery]);

  const renderJobCard = (job: any, variant: 'current' | 'past') => {
    const cName = job.company_name || job.company || "Unknown Company";
    const isCurrent = variant === 'current';

    const extractUrnId = (urn: any) => {
      if (!urn || typeof urn !== 'string') return null;
      const m = urn.match(/urn:li:(?:fs_salesCompany|company|fs_miniCompany):(\d+)/);
      return m ? m[1] : null;
    };
    const cUrnId = extractUrnId(job.company_urn) || extractUrnId(job.companyUrn) || extractUrnId(job.company);
    let linkedinUrl = job.company_url || job.companyUrl || job.company_linkedin_url || job.linkedin_url || null;
    if (!linkedinUrl && cUrnId) {
      linkedinUrl = `https://www.linkedin.com/company/${cUrnId}/`;
    }

    const isSignal = isTopSignal(cName, linkedinUrl, job.company_urn || job.companyUrn || job.company);
    
    let cardStyle = '';
    if (isSignal) {
      cardStyle = isCurrent
        ? 'bg-emerald-50/70 border-[1.5px] border-black shadow-xs hover:bg-emerald-50/90'
        : 'bg-white border-[1.5px] border-black shadow-xs hover:bg-gray-50/80';
    } else {
      cardStyle = isCurrent 
        ? 'bg-emerald-50/60 border border-emerald-200/90 ring-1 ring-emerald-500/10 hover:bg-emerald-50/90 hover:border-emerald-300' 
        : 'bg-white border border-gray-200/90 ring-1 ring-black/[0.04] hover:border-gray-300 hover:bg-gray-50/60';
    }

    const titleColor = isCurrent ? 'text-emerald-950 font-semibold' : 'text-gray-900 font-semibold';
    const subColor = isCurrent ? 'text-emerald-800/80 font-normal' : 'text-gray-600 font-normal';

    return (
      <div className={`${cardStyle} rounded-xl p-2 text-[11px] flex items-center gap-2.5 w-[205px] min-w-[205px] max-w-[205px] min-h-[54px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:shadow-sm`}>
        <div className="flex-shrink-0">
          {linkedinUrl ? (
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={cName} className="hover:opacity-80 transition-opacity block hover:scale-105 active:scale-95">
              <CompanyLogo name={cName} linkedinUrl={linkedinUrl} />
            </a>
          ) : (
            <CompanyLogo name={cName} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${titleColor} truncate text-[11px] font-semibold`} title={cName}>{cName}</div>
          <div className={`${subColor} truncate text-[10px] mt-0.5`} title={job.title}>{job.title}</div>
          <div className="text-gray-500 truncate text-[9px] mt-0.5" suppressHydrationWarning>{formatDuration(job.started_on, job.ended_on)}</div>
        </div>
      </div>
    );
  };

  const renderEduCard = (edu: any) => {
    const sName = edu.school_name || edu.schoolName || 'Unknown University';
    let linkedinUrl = edu.school_url || edu.schoolUrl || null;
    const isSignal = isTopSignal(sName, linkedinUrl, edu.school_urn || edu.schoolUrn);
    
    let cardStyle = '';
    if (isSignal) {
      cardStyle = 'bg-indigo-50/70 border-[1.5px] border-black shadow-xs hover:bg-indigo-50/90';
    } else {
      cardStyle = 'bg-indigo-50/50 border border-indigo-200/80 ring-1 ring-indigo-500/10 hover:border-indigo-300 hover:bg-indigo-50/80';
    }

    return (
      <div className={`${cardStyle} rounded-xl p-2 text-[11px] flex items-center gap-2.5 w-[205px] min-w-[205px] max-w-[205px] min-h-[54px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:shadow-sm`}>
        <div className="flex-shrink-0">
          {linkedinUrl ? (
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={sName} className="hover:opacity-80 transition-opacity block hover:scale-105 active:scale-95">
              <CompanyLogo name={sName} linkedinUrl={linkedinUrl} />
            </a>
          ) : (
            <CompanyLogo name={sName} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-indigo-950 font-semibold truncate text-[11px]" title={sName}>{sName}</div>
          <div className="text-indigo-800/80 font-normal truncate text-[10px] mt-0.5" title={edu.degree_name || edu.degree || edu.field_of_study}>
            {edu.degree_name || edu.degree || edu.field_of_study || 'Student'}
          </div>
          <div className="text-indigo-600/70 truncate text-[9px] mt-0.5" suppressHydrationWarning>{formatDuration(edu.started_on, edu.ended_on)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Search & Swiss Hub Filter Bar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-gray-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Swiss Hub:</span>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setSchoolFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200 ease-out active:scale-[0.97] ${schoolFilter === 'all' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              All Hubs
            </button>
            <button
              onClick={() => setSchoolFilter('EPFL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200 ease-out active:scale-[0.97] ${schoolFilter === 'EPFL' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              🔴 EPFL
            </button>
            <button
              onClick={() => setSchoolFilter('ETH Zürich')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200 ease-out active:scale-[0.97] ${schoolFilter === 'ETH Zürich' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              🔵 ETH Zürich
            </button>
            <button
              onClick={() => setSchoolFilter('St.Gallen')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200 ease-out active:scale-[0.97] ${schoolFilter === 'St.Gallen' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              🟢 HSG St.Gallen
            </button>
          </div>

          {/* Quick Filter: Colleague / Network connected */}
          <button
            onClick={() => setNetworkFilter(!networkFilter)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 ease-out active:scale-[0.97] flex items-center gap-1.5 ${networkFilter ? 'bg-black text-white border-black shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            <span>🤝</span> Colleagues Connected
          </button>

          {/* Quick Filter: Investor connected */}
          <button
            onClick={() => setInvestorFilter(!investorFilter)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 ease-out active:scale-[0.97] flex items-center gap-1.5 ${investorFilter ? 'bg-black text-white border-black shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            <span>💼</span> Investors Connected
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Text search */}
          <input
            type="text"
            placeholder="Search founders, company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black w-[200px]"
          />

          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
            {filteredLeads.length} / {leads.length} leads
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto overflow-y-visible relative rounded-lg border border-gray-200">
        <table className="w-full text-left border-collapse table-auto">
          <thead className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs shadow-xs">
            <tr className="border-b border-gray-300 text-xs font-bold text-gray-700 bg-white">
              <th className="sticky left-0 z-40 bg-white py-2.5 px-1.5 text-center font-bold w-[45px] min-w-[45px] max-w-[45px]">N.</th>
              <th className="sticky left-[45px] z-40 bg-white py-2.5 px-1.5 text-center w-[55px] min-w-[55px] max-w-[55px]">Hub</th>
              <th className="sticky left-[100px] z-40 bg-white py-2.5 px-1.5 text-center w-[140px] min-w-[140px] max-w-[140px] border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Founders</th>
              <th className="py-2.5 px-3 border-l border-gray-200 w-[229px] min-w-[229px]">
                <span className="font-bold text-gray-800 text-xs">Now</span>
              </th>
              <th className="py-2.5 px-3 border-l border-gray-200 w-[445px] min-w-[445px]">
                <span className="font-bold text-gray-700 text-xs">Past</span>
              </th>
              <th className="py-2.5 px-3 border-l border-gray-200 w-[229px] min-w-[229px]">
                <span className="font-bold text-gray-800 text-xs">University</span>
              </th>
              <th className="py-2.5 px-3 text-center border-l border-gray-200 w-[140px] min-w-[140px] max-w-[140px]">Network & Feedback</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                  Nessun profilo trovato con i filtri attuali.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead, i) => {
                const nowKey = `${lead.id}_now`;
                const pastKey = `${lead.id}_past`;
                const uniKey = `${lead.id}_uni`;
                const pnpKey = `${lead.id}_pnp`;
                const nowExp = expandedMore.has(nowKey);
                const pastExp = expandedMore.has(pastKey);
                const uniExp = expandedMore.has(uniKey);
                const pnpExp = expandedMore.has(pnpKey);

                return (
                  <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50/80 transition-colors duration-150 ease-out text-xs group">
                    <td className="sticky left-0 z-20 bg-white group-hover:bg-gray-50 py-2.5 px-1.5 text-center text-xs font-semibold text-gray-400 align-middle w-[45px] min-w-[45px] max-w-[45px]">{i + 1}</td>
                    
                    {/* Swiss Hub Badges & Flag */}
                    <td className="sticky left-[45px] z-20 bg-white group-hover:bg-gray-50 py-2.5 px-1 text-center align-middle w-[55px] min-w-[55px] max-w-[55px]">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-sm">{lead.flags}</span>
                        {lead.swissSchools.map((s: string) => {
                          if (s === 'EPFL') return <span key={s} className="text-[9px] px-1 py-0.2 bg-red-100 text-red-800 rounded font-bold">EPFL</span>;
                          if (s === 'ETH Zürich') return <span key={s} className="text-[9px] px-1 py-0.2 bg-blue-100 text-blue-800 rounded font-bold">ETH</span>;
                          if (s === 'St.Gallen') return <span key={s} className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">HSG</span>;
                          return null;
                        })}
                      </div>
                    </td>

                    {/* Founder name & Avatar */}
                    <td className="sticky left-[100px] z-20 bg-white group-hover:bg-gray-50 py-2.5 px-1.5 align-middle w-[140px] min-w-[140px] max-w-[140px] border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <a href={getNormalLinkedinUrl(lead.profile_url)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center text-center gap-1 group/avatar">
                        <AvatarImage src={lead.avatar_url} name={lead.full_name} />
                        <span className="text-xs font-bold text-blue-700 group-hover/avatar:underline leading-tight text-center break-words max-w-[130px]">{lead.full_name || 'N/A'}</span>
                      </a>
                    </td>

                    {/* Now Position */}
                    <td className="py-2.5 px-3 align-middle border-l border-gray-200 w-[229px] min-w-[229px]">
                      <div className="flex flex-col gap-1.5">
                        {lead.currentJobs.slice(0, nowExp ? undefined : 2).map((j: any, idx: number) => (
                          <div key={idx}>{renderJobCard(j, 'current')}</div>
                        ))}
                        {lead.currentJobs.length > 2 && (
                          <button onClick={() => toggleMore(nowKey)} className="text-[10px] text-gray-500 hover:text-black font-semibold text-left">
                            {nowExp ? 'Show less' : `+${lead.currentJobs.length - 2} more`}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Past Position */}
                    <td className="py-2.5 px-3 align-middle border-l border-gray-200 w-[445px] min-w-[445px]">
                      <div className="grid grid-cols-2 gap-1.5">
                        {lead.pastJobs.slice(0, pastExp ? undefined : 4).map((j: any, idx: number) => (
                          <div key={idx}>{renderJobCard(j, 'past')}</div>
                        ))}
                      </div>
                      {lead.pastJobs.length > 4 && (
                        <button onClick={() => toggleMore(pastKey)} className="text-[10px] text-gray-500 hover:text-black font-semibold mt-1">
                          {pastExp ? 'Show less' : `+${lead.pastJobs.length - 4} more`}
                        </button>
                      )}
                    </td>

                    {/* Education */}
                    <td className="py-2.5 px-3 align-middle border-l border-gray-200 w-[229px] min-w-[229px]">
                      <div className="flex flex-col gap-1.5">
                        {lead.education.slice(0, uniExp ? undefined : 2).map((e: any, idx: number) => (
                          <div key={idx}>{renderEduCard(e)}</div>
                        ))}
                        {lead.education.length > 2 && (
                          <button onClick={() => toggleMore(uniKey)} className="text-[10px] text-indigo-600 hover:text-indigo-900 font-semibold text-left">
                            {uniExp ? 'Show less' : `+${lead.education.length - 2} more`}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Network & Feedback */}
                    <td className="py-2.5 px-3 text-center align-middle border-l border-gray-200 w-[140px] min-w-[140px] max-w-[140px]">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => {
                              const current = localFeedback[lead.id] || lead.feedback;
                              const next = current === 'yes' ? null : 'yes';
                              setLocalFeedback(p => ({...p, [lead.id]: next}));
                              supabase.from('swiss_leads').update({ feedback: next }).eq('id', lead.id).then();
                            }}
                            className={`p-1 rounded transition-colors ${(localFeedback[lead.id] || lead.feedback) === 'yes' ? 'bg-black text-white shadow-xs scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                          >
                            👍
                          </button>
                          <button 
                            onClick={() => {
                              const current = localFeedback[lead.id] || lead.feedback;
                              const next = current === 'no' ? null : 'no';
                              setLocalFeedback(p => ({...p, [lead.id]: next}));
                              supabase.from('swiss_leads').update({ feedback: next }).eq('id', lead.id).then();
                            }}
                            className={`p-1 rounded transition-colors ${(localFeedback[lead.id] || lead.feedback) === 'no' ? 'bg-black text-white shadow-xs scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                          >
                            👎
                          </button>
                        </div>

                        {/* PNP Colleagues Badge */}
                        <PnpConnectionsBadge connections={lead.pnpConnections} expanded={pnpExp} onToggle={() => toggleMore(pnpKey)} />
                        
                        {/* VC Investors Badge */}
                        <VcConnectionsBadge connections={lead.vcConnections} />

                        <div className="text-[9px] text-gray-400 font-medium tracking-tight whitespace-nowrap mt-0.5" suppressHydrationWarning>
                          {lead.dateStr}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
