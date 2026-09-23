'use client';

import React, { useState } from 'react';
import { PnpConnectionMatch } from './pnpUtils';

interface PnpConnectionsBadgeProps {
  connections?: PnpConnectionMatch[];
  expanded?: boolean;
  onToggle?: () => void;
}

export function PnpConnectionsBadge({ connections, expanded: controlledExpanded, onToggle }: PnpConnectionsBadgeProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggle = onToggle || (() => setInternalExpanded(v => !v));

  if (!connections || connections.length === 0) return null;

  if (connections.length === 1) {
    const conn = connections[0];
    return (
      <div className="mt-1 flex flex-col items-center">
        <a
          href={conn.profileUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 hover:text-blue-800 transition-all duration-150 ease-out active:scale-95 shadow-sm max-w-[140px] truncate"
          title={`Apri profilo LinkedIn di ${conn.name}`}
        >
          🔗 {conn.name}
        </a>
      </div>
    );
  }

  // Multiple connections
  return (
    <div className="mt-1 flex flex-col items-center gap-1 w-full" data-more-expanded={isExpanded ? "true" : undefined} data-has-more={connections.length > 1 ? "true" : undefined} onClick={e => e.stopPropagation()}>
      {!isExpanded ? (
        <>
          <a
            href={connections[0].profileUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 hover:text-blue-800 transition-all duration-150 ease-out active:scale-95 shadow-sm max-w-[140px] truncate"
            title={`Apri profilo LinkedIn di ${connections[0].name}`}
          >
            🔗 {connections[0].name}
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            className="text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50/70 border border-blue-200/50 rounded px-1.5 py-0.5 transition-all duration-150 active:scale-95 shadow-xs"
          >
            +{connections.length - 1} more
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 w-full bg-blue-50/30 p-1.5 rounded-lg border border-blue-100 animate-in fade-in-50 duration-150">
          {connections.map((conn, idx) => (
            <a
              key={idx}
              href={conn.profileUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 hover:text-blue-800 transition-all duration-150 ease-out active:scale-95 shadow-sm max-w-[140px] truncate"
              title={`Apri profilo LinkedIn di ${conn.name}`}
            >
              🔗 {conn.name}
            </a>
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            className="text-[9px] font-bold text-gray-500 hover:text-gray-800 hover:underline mt-0.5 transition-all duration-150 active:scale-95"
          >
            Show less
          </button>
        </div>
      )}
    </div>
  );
}
