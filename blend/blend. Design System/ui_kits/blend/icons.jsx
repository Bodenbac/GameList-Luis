/* blend. — Inline SVG icon set. Stroke-based, currentColor, Lucide-adjacent. */
const { createElement: h } = React;

const svgBase = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };

const IconProfile = ({ size = 17 }) =>
  h("svg", { width: size, height: size, viewBox: "0 0 24 24", strokeWidth: 2, ...svgBase },
    h("circle", { cx: 12, cy: 8, r: 4 }),
    h("path", { d: "M4 20c0-4 3.6-7 8-7s8 3 8 7" })
  );

const IconSettings = ({ size = 17 }) =>
  h("svg", { width: size, height: size, viewBox: "0 0 24 24", strokeWidth: 2, ...svgBase },
    h("circle", { cx: 12, cy: 12, r: 3 }),
    h("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" })
  );

const IconCart = ({ size = 19 }) =>
  h("svg", { width: size, height: size, viewBox: "0 0 24 24", strokeWidth: 2, ...svgBase },
    h("path", { d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" }),
    h("line", { x1: 3, y1: 6, x2: 21, y2: 6 }),
    h("path", { d: "M16 10a4 4 0 0 1-8 0" })
  );

const IconChevronDown = ({ size = 16 }) =>
  h("svg", { width: size, height: size, viewBox: "0 0 24 24", strokeWidth: 2.2, ...svgBase },
    h("polyline", { points: "6 9 12 15 18 9" })
  );

const IconShare = ({ size = 15 }) =>
  h("svg", { width: size, height: size, viewBox: "0 0 24 24", strokeWidth: 2.2, ...svgBase },
    h("path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" }),
    h("polyline", { points: "16 6 12 2 8 6" }),
    h("line", { x1: 12, y1: 2, x2: 12, y2: 15 })
  );

const IconLeaf = ({ size = 36 }) =>
  h("svg", { width: size, height: size, viewBox: "0 0 24 24", strokeWidth: 1.5, ...svgBase, stroke: "var(--green-100)" },
    h("path", { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" }),
    h("path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" })
  );

Object.assign(window, { IconProfile, IconSettings, IconCart, IconChevronDown, IconShare, IconLeaf });
