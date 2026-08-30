import React, { useEffect, useMemo, useRef } from 'react';
import { GameWorld } from '../world/GameWorld';
import { LocationData, MissionData } from '../types';

interface MiniMapProps {
  worldRef: React.RefObject<GameWorld | null>;
  locations: LocationData[];
  visitedLocations: string[];
  currentLocationId: string;
  navTargetId: string | null;
  activeMission: MissionData | null;
}

const SIZE = 180;
const PAD = 16;

// Facilities: GameWorld.checkFacilityProximity keeps its 6 coordinates private, so the
// minimap deliberately omits facility markers — the in-world HUD prompt already covers them.

/** Project world {x,z} into the SVG box from the bounding box of all points, once. */
function useProjection(locations: LocationData[]) {
  return useMemo(() => {
    const pts = locations.map((l) => l.mapPosition ?? l.worldPosition);
    const xs = pts.map((p) => p.x);
    const zs = pts.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const span = Math.max(maxX - minX, maxZ - minZ) || 1;
    const scale = (SIZE - PAD * 2) / span;
    // Centre the (possibly non-square) content inside the square box.
    const offX = PAD + ((SIZE - PAD * 2) - (maxX - minX) * scale) / 2;
    const offZ = PAD + ((SIZE - PAD * 2) - (maxZ - minZ) * scale) / 2;
    const project = (p: { x: number; z: number }): [number, number] => [
      offX + (p.x - minX) * scale,
      offZ + (p.z - minZ) * scale,
    ];
    return { project, scale };
  }, [locations]);
}

export const MiniMap: React.FC<MiniMapProps> = ({
  worldRef,
  locations,
  visitedLocations,
  currentLocationId,
  navTargetId,
  activeMission,
}) => {
  const { project } = useProjection(locations);
  const playerRef = useRef<SVGGElement>(null);

  // Drive the player marker straight from the world each frame — off React's render path.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const w = worldRef.current;
      const g = playerRef.current;
      if (w && g) {
        const [px, py] = project(w.vehiclePos);
        const deg = (-w.vehicleRotation * 180) / Math.PI;
        g.setAttribute('transform', `translate(${px} ${py}) rotate(${deg})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [worldRef, project]);

  const visited = new Set(visitedLocations);
  const pickupId = activeMission?.pickupLocationId ?? null;
  const dropId = activeMission?.dropLocationId ?? null;

  return (
    <div
      className="pointer-events-none bg-slate-950/80 border-2 border-amber-600/50 rounded-2xl shadow-2xl backdrop-blur-sm p-1.5"
      style={{ width: SIZE + 12 }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="block">
        <rect x={0} y={0} width={SIZE} height={SIZE} rx={10} className="fill-slate-900/60" />

        {locations.map((loc) => {
          const [x, y] = project(loc.mapPosition ?? loc.worldPosition);
          const isVisited = visited.has(loc.id);
          const isCurrent = loc.id === currentLocationId;
          const isNav = loc.id === navTargetId;
          const isPin = loc.id === pickupId || loc.id === dropId;
          return (
            <g key={loc.id}>
              {isCurrent && <circle cx={x} cy={y} r={7} className="fill-none stroke-amber-300" strokeWidth={1.5} />}
              {isNav && <circle cx={x} cy={y} r={9} className="fill-none stroke-emerald-400 animate-ping" strokeWidth={1.5} />}
              <circle
                cx={x}
                cy={y}
                r={isPin ? 4 : 3}
                className={
                  isNav
                    ? 'fill-emerald-400'
                    : isPin
                      ? 'fill-sky-400'
                      : isVisited
                        ? 'fill-amber-400'
                        : 'fill-none stroke-slate-500'
                }
                strokeWidth={isVisited ? 0 : 1.5}
              />
            </g>
          );
        })}

        {/* Player heading triangle — rotate(-vehicleRotation) so its tip follows forward (-z = up). */}
        <g ref={playerRef}>
          <path d="M 0 -6 L 4 5 L 0 2 L -4 5 Z" className="fill-rose-500 stroke-white" strokeWidth={1} />
        </g>
      </svg>
    </div>
  );
};
