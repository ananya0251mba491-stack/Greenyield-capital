import React from 'react';

interface BrandMarkProps {
  light?: boolean;
  onClick?: () => void;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ light = false, onClick }) => {
  const inner = (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="26"
        height="26"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="6" fill={light ? '#059669' : '#0B172A'} />
        <path
          d="M8.5 18.5C8.5 13 13 9 19.5 8.5C19 15 15 19.5 9.5 19.5"
          stroke={light ? '#FFFFFF' : '#10B981'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M8.5 19.5L15 13"
          stroke={light ? '#ECFDF5' : '#34D399'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`font-display text-base font-bold tracking-tight whitespace-nowrap shrink-0 ${
          light ? 'text-white' : 'text-slate-900'
        }`}
      >
        GreenYield Capital
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md cursor-pointer"
      >
        {inner}
      </button>
    );
  }
  return inner;
};
