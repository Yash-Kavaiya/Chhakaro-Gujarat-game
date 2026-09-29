import React, { forwardRef } from 'react';
import { LocationData } from '../types';
import {
  ARABIAN_SEA,
  COASTLINE,
  GREAT_RANN,
  GUJARAT_OUTLINE,
  KHADIR_BET,
  LAND_BORDER,
  LITTLE_RANN,
  MAP_LABELS,
  Pt,
} from '../data/gujaratGeography';
import { getResolvedHighwaySegments } from '../data/highwayNetwork';
import { getResolvedRailSegments } from '../data/railwayNetwork';

/**
 * Gujarat drawn straight in world coordinates (x → right, z → down), so every marker, road,
 * rail and the player arrow need no projection math. Shared by the HUD minimap and the full
 * map screen; `detail` controls labels/stroke weights for the two sizes.
 */

/** Frame around the state outline (plus a little sea / neighbour margin). */
export const MAP_VIEW = { minX: -1560, minZ: -1420, width: 3540, height: 2860 };
export const MAP_VIEWBOX = `${MAP_VIEW.minX} ${MAP_VIEW.minZ} ${MAP_VIEW.width} ${MAP_VIEW.height}`;

const pathOf = (pts: Pt[], close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p.x)} ${Math.round(p.z)}`).join(' ') + (close ? ' Z' : '');

const SEA_PATH = pathOf(ARABIAN_SEA);
const LAND_PATH = pathOf(GUJARAT_OUTLINE);
const RANN_PATH = pathOf(GREAT_RANN);
const LITTLE_RANN_PATH = pathOf(LITTLE_RANN);
const KHADIR_PATH = pathOf(KHADIR_BET);
const COAST_PATH = pathOf(COASTLINE, false);
const BORDER_PATH = pathOf([COASTLINE[COASTLINE.length - 1], ...LAND_BORDER, COASTLINE[0]], false);
const ROADS = getResolvedHighwaySegments();
const RAILS = getResolvedRailSegments();

/** Airports shown with a plane glyph (the SVPIA zone and Dholera's new airport). */
const AIRPORT_IDS = new Set(['ahmedabad_airport', 'dholera']);

export interface MapMarkerState {
  visited: Set<string>;
  currentId: string | null;
  selectedId?: string | null;
  navTargetId?: string | null;
  pinIds?: Set<string>;
}

interface GujaratMapSvgProps extends MapMarkerState {
  locations: LocationData[];
  detail: 'mini' | 'full';
  className?: string;
  onSelect?: (loc: LocationData) => void;
  /** Rendered last, on top (e.g. the player arrow). */
  children?: React.ReactNode;
}

export const GujaratMapSvg = forwardRef<SVGSVGElement, GujaratMapSvgProps>(function GujaratMapSvg(
  { locations, detail, className, onSelect, children, visited, currentId, selectedId, navTargetId, pinIds },
  ref,
) {
  const full = detail === 'full';
  const dot = full ? 30 : 42;
  return (
    <svg ref={ref} viewBox={MAP_VIEWBOX} className={className} preserveAspectRatio="xMidYMid meet">
      {/* Neighbouring states, sea, Gujarat, the Rann */}
      {/* Oversized so letterboxing (preserveAspectRatio) never shows a bare edge */}
      <rect x={MAP_VIEW.minX - 4000} y={MAP_VIEW.minZ - 4000} width={MAP_VIEW.width + 8000} height={MAP_VIEW.height + 8000} fill="#3f3b2a" />
      <path d={SEA_PATH} fill="#0c4a6e" />
      <path d={LAND_PATH} fill="#2f5d25" />
      <path d={RANN_PATH} fill="#e2e8f0" opacity={0.85} />
      <path d={LITTLE_RANN_PATH} fill="#d6d0bd" opacity={0.85} />
      <path d={KHADIR_PATH} fill="#a16207" />
      <path d={COAST_PATH} fill="none" stroke="#fcd34d" strokeWidth={full ? 8 : 14} opacity={0.7} />
      <path d={BORDER_PATH} fill="none" stroke="#f97316" strokeWidth={full ? 7 : 12} strokeDasharray={full ? '40 24' : '60 40'} />

      {full &&
        MAP_LABELS.map((l) => (
          <text
            key={l.text}
            x={l.x}
            y={l.z}
            textAnchor="middle"
            fontSize={l.kind === 'sea' ? 64 : l.kind === 'region' ? 56 : 60}
            fontStyle={l.kind === 'sea' ? 'italic' : 'normal'}
            fontWeight={700}
            fill={l.kind === 'sea' ? '#7dd3fc' : l.kind === 'region' ? 'rgba(254,243,199,0.55)' : 'rgba(214,211,209,0.55)'}
          >
            {l.text}
          </text>
        ))}

      {/* Highways (expressways thicker) */}
      {ROADS.map((r) => (
        <line
          key={r.corridor.id}
          x1={r.start.x}
          y1={r.start.z}
          x2={r.end.x}
          y2={r.end.z}
          stroke={r.corridor.type === 'expressway' ? '#fbbf24' : r.corridor.type === 'national' ? '#fde68a' : '#e7e5e4'}
          strokeWidth={(r.corridor.type === 'expressway' ? 18 : 12) * (full ? 1 : 1.5)}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}

      {/* Railways: dark line with white ties */}
      {RAILS.map((r) => (
        <g key={r.line.id}>
          <line x1={r.start.x} y1={r.start.z} x2={r.end.x} y2={r.end.z} stroke="#1f2937" strokeWidth={full ? 12 : 16} />
          <line
            x1={r.start.x}
            y1={r.start.z}
            x2={r.end.x}
            y2={r.end.z}
            stroke="#f8fafc"
            strokeWidth={full ? 6 : 8}
            strokeDasharray="14 14"
          />
        </g>
      ))}

      {/* Places */}
      {locations.map((loc) => {
        const { x, z } = loc.worldPosition;
        const isVisited = visited.has(loc.id);
        const isCurrent = loc.id === currentId;
        const isSelected = loc.id === selectedId;
        const isNav = loc.id === navTargetId;
        const isPin = pinIds?.has(loc.id) ?? false;
        const fill = isNav ? '#34d399' : isCurrent ? '#10b981' : isPin ? '#38bdf8' : isVisited ? '#f59e0b' : '#e2e8f0';
        return (
          <g
            key={loc.id}
            onClick={onSelect ? () => onSelect(loc) : undefined}
            style={onSelect ? { cursor: 'pointer' } : undefined}
          >
            {(isSelected || isCurrent) && (
              <circle cx={x} cy={z} r={dot * 1.9} fill="none" stroke={isSelected ? '#fcd34d' : '#6ee7b7'} strokeWidth={dot * 0.35} />
            )}
            {isNav && <circle cx={x} cy={z} r={dot * 2.4} fill="none" stroke="#34d399" strokeWidth={dot * 0.3} className="animate-ping" />}
            <circle cx={x} cy={z} r={dot} fill={fill} stroke="#0f172a" strokeWidth={dot * 0.3} />
            {AIRPORT_IDS.has(loc.id) && (
              <text x={x} y={z - dot * 1.6} textAnchor="middle" fontSize={dot * 2.2}>
                ✈️
              </text>
            )}
            {full && (
              <text
                x={x}
                y={z + dot * 2.9}
                textAnchor="middle"
                fontSize={46}
                fontWeight={700}
                fill="#fff7ed"
                stroke="#0f172a"
                strokeWidth={10}
                paintOrder="stroke"
              >
                {loc.nameGujarati.split(/[(&]/)[0].trim()}
              </text>
            )}
          </g>
        );
      })}

      {children}
    </svg>
  );
});

/** Map legend chips for the full map screen. */
export const MapLegend: React.FC = () => (
  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
    <span className="flex items-center gap-1"><span className="w-4 h-1.5 rounded bg-amber-400" /> એક્સપ્રેસવે</span>
    <span className="flex items-center gap-1"><span className="w-4 h-1.5 rounded bg-amber-100" /> હાઇવે</span>
    <span className="flex items-center gap-1"><span className="w-4 h-1.5 rounded bg-slate-800 border border-dashed border-white" /> રેલ્વે</span>
    <span className="flex items-center gap-1">✈️ એરપોર્ટ</span>
    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> મુલાકાત લીધેલ</span>
    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> તમે અહીં</span>
    <span className="flex items-center gap-1"><span className="w-4 h-1.5 rounded bg-orange-500" /> રાજ્ય સરહદ</span>
  </div>
);
