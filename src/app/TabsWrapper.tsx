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
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇨🇭</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                Swiss Hubs
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  Public Platform
                </span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Targeting founders and early talent from <strong className="text-gray-700">EPFL</strong>, <strong className="text-gray-700">ETH Zürich</strong> & <strong className="text-gray-700">University of St.Gallen</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Status & Automated scheduler info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-gray-700">Scraper Status:</span>
            <span className="text-gray-500 truncate max-w-[260px]" title={scraperStatus}>
              {scraperStatus}
            </span>
            {lastUpdated && (
              <span className="text-gray-400 text-[10px] ml-1" suppressHydrationWarning>
                ({new Date(lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Navigation: The 4 Swiss Sections */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/80">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {SWISS_SECTIONS.map(sec => {
            const counts = getSectionCounts(sec.key);
            const isActive = activeSection === sec.key;

            return (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-xs ring-1 ring-black/5'
                    : 'text-gray-600 hover:text-black hover:bg-white/50'
                }`}
              >
                <span>{sec.badge}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {counts.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-view Toggle: Genesi vs Daily */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setViewMode('genesis')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'genesis'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span>🌱 Genesi</span>
            <span className="text-[10px] font-semibold opacity-75">
              ({currentCounts.genesis})
            </span>
          </button>

          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'daily'
                ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span>🌅 Daily</span>
            <span className="text-[10px] font-semibold opacity-75">
              ({currentCounts.daily})
            </span>
          </button>
        </div>
      </div>

      {/* Active Section Banner */}
      <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-gray-900">
            {SWISS_SECTIONS.find(s => s.key === activeSection)?.label}:
          </span>
          <span className="text-xs text-gray-600">
            {SWISS_SECTIONS.find(s => s.key === activeSection)?.description}
          </span>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Viewing: <strong className="text-gray-800">{viewMode === 'genesis' ? '🌱 Baseline Genesi' : '🌅 Nuovi Daily'}</strong>
        </div>
      </div>

      {/* Table Content */}
      <SwissTable
        leads={displayedLeads}
        sectionName={activeSection}
        viewMode={viewMode}
      />
    </div>
  );
}
