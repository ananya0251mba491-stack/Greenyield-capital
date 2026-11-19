import React, { useState } from 'react';
import { Factory } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col items-center justify-center p-6 text-center text-slate-200 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Factory className="w-8 h-8 text-emerald-400 mb-2" />
        <span className="text-sm font-medium">{fallbackTitle || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
