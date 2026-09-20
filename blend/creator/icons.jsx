/* blend. Creator — main app */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ──────────────────────────────────────────────────────────
   Icons (stroke-based, currentColor — matches design system)
   ────────────────────────────────────────────────────────── */
const Svg = (props) => React.createElement("svg", {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 2,
  ...props
});

const IconProfile = ({ size = 17 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </Svg>
);
const IconSettings = ({ size = 17 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);
const IconCart = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Svg>
);
const IconSparkle = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5 18 6" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
const IconShuffle = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="M15 15l6 6" />
    <path d="M4 4l5 5" />
  </Svg>
);
const IconClose = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Svg>
);

/* Blade SVG — internal */
const BladeSvg = () => (
  <svg viewBox="0 0 100 30">
    <defs>
      <linearGradient id="bladeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D8DFE2" />
        <stop offset="50%" stopColor="#8C9296" />
        <stop offset="100%" stopColor="#4A5054" />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="15" rx="6" ry="6" fill="#15281f" />
    <path d="M50 15 L18 8 L48 14 Z" fill="url(#bladeGrad)" stroke="#3a3f42" strokeWidth=".5" />
    <path d="M50 15 L82 8 L52 14 Z" fill="url(#bladeGrad)" stroke="#3a3f42" strokeWidth=".5" />
    <path d="M50 15 L20 24 L48 16 Z" fill="url(#bladeGrad)" stroke="#3a3f42" strokeWidth=".5" />
    <path d="M50 15 L80 24 L52 16 Z" fill="url(#bladeGrad)" stroke="#3a3f42" strokeWidth=".5" />
    <circle cx="50" cy="15" r="2.5" fill="#0a1410" />
  </svg>
);

Object.assign(window, {
  IconProfile, IconSettings, IconCart, IconSparkle, IconShuffle, IconClose, BladeSvg
});
