'use client';

import { useState } from 'react';
import { SwissTable } from './SwissTable';
import { SWISS_SECTIONS, SwissSectionKey } from './swissSources';
import { seedLogoCache } from './CompanyLogo';

export default function TabsWrapper({
  leads = [],
  initialProfiles = [],
  scraperStatus = 'In attesa del primo scrape',
  lastUpdated = ''
}: {
  leads: any[];
  initialProfiles?: any[];
  scraperStatus?: string;
  lastUpdated?: string;
}) {
  if (initialProfiles && initialProfiles.length > 0) {
    seedLogoCache(initialProfiles);
  }

  const [activeSection, setActiveSection] = useState<SwissSectionKey>('stealth');
  const [viewMode, setViewMode] = useState<'genesis' | 'daily'>('genesis');

  // Group leads by section
  const sectionLeads = leads.filter(l => (l.section || 'stealth') === activeSection);
  const genesisLeads = sectionLeads.filter(l => l.is_genesis);
  const dailyLeads = sectionLeads.filter(l => !l.is_genesis);

  const displayedLeads = viewMode === 'genesis' ? genesisLeads : dailyLeads;

  // Compute counts for all sections
  const getSectionCounts = (key: SwissSectionKey) => {
    const list = leads.filter(l => (l.section || 'stealth') === key);
    return {
      total: list.length,
      genesis: list.filter(l => l.is_genesis).length,
      daily: list.filter(l => !l.is_genesis).length,
    };
  };

  const currentCounts = getSectionCounts(activeSection);

  return (
    <>
      {/* Top Header: Title + Section Tabs + Genesi/Daily Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Swiss Hubs</h1>
          
          {/* The 4 Swiss Section Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
            {SWISS_SECTIONS.map(sec => {
              const counts = getSectionCounts(sec.key);
              const isActive = activeSection === sec.key;
              const count = viewMode === 'genesis' ? counts.genesis : counts.daily;

              return (
                <button
                  key={sec.key}
                  onClick={() => setActiveSection(sec.key)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all duration-200 ease-out active:scale-[0.97] whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <span>{sec.badge}</span> <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View mode toggle (Genesi vs Daily) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('genesis')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all duration-200 ease-out active:scale-[0.97] ${
                viewMode === 'genesis'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              🌱 Genesi ({currentCounts.genesis})
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all duration-200 ease-out active:scale-[0.97] ${
                viewMode === 'daily'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              🌅 Daily ({currentCounts.daily})
            </button>
          </div>
        </div>
      </div>

      {/* Scraper Management / Status card */}
      <div className="mb-4 bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs transition-all">
        <div className="flex items-center justify-between cursor-default">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-black">Swiss Scraper Management</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Auto: Nightly at 02:30 UTC
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Targeting founders and early talent from <strong className="text-gray-700">EPFL</strong>, <strong className="text-gray-700">ETH Zürich</strong> & <strong className="text-gray-700">University of St.Gallen</strong>.
            </p>
            {scraperStatus && (
              <p className="text-xs text-gray-700 font-medium mt-1.5 flex items-center gap-1.5">
                <span>⚡ Status:</span> {scraperStatus}
                {lastUpdated && (
                  <span className="text-gray-400 font-normal" suppressHydrationWarning>
                    ({new Date(lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <SwissTable
        leads={displayedLeads}
        sectionName={activeSection}
        viewMode={viewMode}
      />
    </>
  );
}
