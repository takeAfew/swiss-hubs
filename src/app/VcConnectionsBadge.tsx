'use client';

import React, { useState } from 'react';
import { VcConnectionMatch } from './vcUtils';
import { getOptimizedImageUrl } from './imageUtils';

interface VcConnectionsBadgeProps {
  connections?: VcConnectionMatch[];
}

function VcBadgeItem({ vc }: { vc: VcConnectionMatch }) {
  const [failed, setFailed] = useState(false);
  const tooltip = vc.investorNames.length > 1
    ? `Connessioni: ${vc.investorNames.join(', ')} (${vc.fundName})`
    : `Connesso con ${vc.investorNames[0]} (${vc.fundName})`;

  return (
    <a
      href={vc.profileUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title={tooltip}
      className="inline-flex items-center justify-center hover:scale-110 transition-all duration-150 ease-out active:scale-95 flex-shrink-0"
    >
      {vc.fundLogo && !failed ? (
        <img
          src={getOptimizedImageUrl(vc.fundLogo)}
          alt={vc.fundName}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-[26px] h-[26px] min-w-[26px] max-w-[26px] aspect-square rounded-[22%] object-contain overflow-hidden"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="w-[26px] h-[26px] min-w-[26px] max-w-[26px] aspect-square rounded-[22%] bg-gray-100 text-[10px] font-bold text-gray-700 flex items-center justify-center overflow-hidden">
          {vc.fundName.substring(0, 2).toUpperCase()}
        </span>
      )}
    </a>
  );
}

export const VcConnectionsBadge = React.memo(function VcConnectionsBadge({ connections }: VcConnectionsBadgeProps) {
  if (!connections || connections.length === 0) return null;

  return (
    <div 
      className="mt-1 flex items-center justify-center gap-1.5 flex-wrap max-w-[96px] max-h-[64px] overflow-hidden" 
      onClick={e => e.stopPropagation()}
    >
      {connections.map(vc => (
        <VcBadgeItem key={vc.fundName} vc={vc} />
      ))}
    </div>
  );
});
