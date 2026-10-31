import React from 'react';

interface SaphireLogoProps {
  className?: string;
  size?: number;
  customLogoUrl?: string;
}

export const SaphireLogo: React.FC<SaphireLogoProps> = ({
  className = '',
  size = 96,
  customLogoUrl,
}) => {
  if (customLogoUrl && customLogoUrl.trim() !== '') {
    return (
      <div 
        className={`relative rounded-3xl p-1 bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 shadow-xl shadow-blue-500/20 flex items-center justify-center overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={customLogoUrl}
          alt="Company Logo"
          className="w-full h-full object-contain rounded-2xl bg-[#0b0f19] p-2"
          onError={(e) => {
            // fallback if custom image fails to load
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-3xl p-1 bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-500 shadow-xl shadow-blue-500/25 flex items-center justify-center group ${className}`}
      style={{ width: size, height: size }}
      title="Saphire Company Logo"
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-xl group-hover:bg-blue-400/30 transition-all pointer-events-none" />

      {/* Emblem Container */}
      <div className="relative w-full h-full rounded-[22px] bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#020617] border border-blue-400/30 flex items-center justify-center overflow-hidden shadow-inner">
        {/* Deep Gemstone Background Highlights */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-cyan-400/20 rounded-full blur-md" />
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-blue-600/30 rounded-full blur-md" />

        {/* Faceted Sapphire Gemstone SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-4/5 h-4/5 drop-shadow-[0_4px_12px_rgba(56,189,248,0.45)] transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients for facets */}
            <linearGradient id="sapphireTop" x1="50" y1="14" x2="50" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <linearGradient id="sapphireCenter" x1="50" y1="36" x2="50" y2="86" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>

            <linearGradient id="facetLeft" x1="20" y1="36" x2="50" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="facetRight" x1="80" y1="36" x2="50" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>

            <linearGradient id="bottomFacet" x1="50" y1="58" x2="50" y2="86" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>

          {/* Facet 1: Top Table Facet */}
          <polygon
            points="34,18 66,18 78,36 22,36"
            fill="url(#sapphireTop)"
            opacity="0.95"
          />

          {/* Facet 2: Upper Left Star */}
          <polygon
            points="22,36 34,18 16,36"
            fill="#7dd3fc"
            opacity="0.85"
          />

          {/* Facet 3: Upper Right Star */}
          <polygon
            points="66,18 78,36 84,36"
            fill="#38bdf8"
            opacity="0.75"
          />

          {/* Facet 4: Center Main Body */}
          <polygon
            points="22,36 78,36 50,60"
            fill="url(#facetLeft)"
            opacity="0.9"
          />

          {/* Facet 5: Bottom Center Pavilion */}
          <polygon
            points="50,60 22,36 16,36 50,86"
            fill="url(#sapphireCenter)"
            opacity="0.95"
          />

          {/* Facet 6: Bottom Right Pavilion */}
          <polygon
            points="50,60 78,36 84,36 50,86"
            fill="url(#facetRight)"
            opacity="0.88"
          />

          {/* Facet 7: Center Bottom Brilliant Arrow */}
          <polygon
            points="50,60 40,46 60,46"
            fill="#e0f2fe"
            opacity="0.4"
          />

          {/* Facet 8: Bottom Point Specular */}
          <polygon
            points="50,60 38,72 50,86 62,72"
            fill="url(#bottomFacet)"
            opacity="0.8"
          />

          {/* Outer Edge Polish Rim */}
          <polyline
            points="34,18 66,18 84,36 50,86 16,36 34,18"
            stroke="#e0f2fe"
            strokeWidth="1.2"
            strokeLinejoin="round"
            opacity="0.6"
          />

          {/* Diamond Sparkle Highlight in Top Right */}
          <path
            d="M72 26 L73.5 22 L75 26 L79 27.5 L75 29 L73.5 33 L72 29 L68 27.5 Z"
            fill="#ffffff"
            opacity="0.9"
          />
        </svg>

        {/* Brand Text Banner at bottom of logo emblem */}
        <div className="absolute bottom-1.5 inset-x-0 text-center">
          <span className="text-[9px] font-black tracking-widest text-cyan-300/90 uppercase drop-shadow">
            SAPHIRE
          </span>
        </div>
      </div>
    </div>
  );
};
