'use client';

import React, { useState } from 'react';
import { getOptimizedImageUrl } from './imageUtils';

interface AvatarImageProps {
  src?: string | null;
  name?: string | null;
}

export const AvatarImage = React.memo(function AvatarImage({ src, name }: AvatarImageProps) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';

  if (!src || failed) {
    return (
      <div className="w-12 h-12 aspect-square rounded-[22%] bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0 group-hover/avatar:scale-105 transition-transform overflow-hidden">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={getOptimizedImageUrl(src)}
      alt={name || 'avatar'}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-12 h-12 aspect-square rounded-[22%] object-cover flex-shrink-0 group-hover/avatar:scale-105 transition-transform overflow-hidden"
    />
  );
});
