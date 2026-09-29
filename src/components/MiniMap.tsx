import React, { useEffect, useMemo, useRef } from 'react';
import { GameWorld } from '../world/GameWorld';
import { LocationData, MissionData } from '../types';
import { GujaratMapSvg } from './GujaratMapSvg';

interface MiniMapProps {
  worldRef: React.RefObject<GameWorld | null>;
  locations: LocationData[];
  visitedLocations: string[];
  currentLocationId: string;
  navTargetId: string | null;
  activeMission: MissionData | null;
}

const SIZE = 190;

/** HUD minimap: the whole of Gujarat (coast, Rann, highways, railways) with a live player arrow. */
export const MiniMap: React.FC<MiniMapProps> = ({
  worldRef,
  locations,
  visitedLocations,
  currentLocationId,
  navTargetId,
  activeMission,
}) => {
  const playerRef = useRef<SVGGElement>(null);

  // Drive the player marker straight from the world each frame — off React's render path.
  // The map is drawn in world coordinates, so the vehicle position is used as-is.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const w = worldRef.current;
      const g = playerRef.current;
      if (w && g) {
        const deg = (-w.vehicleRotation * 180) / Math.PI;
        g.setAttribute('transform', `translate(${w.vehiclePos.x} ${w.vehiclePos.z}) rotate(${deg})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [worldRef]);

  const visited = useMemo(() => new Set(visitedLocations), [visitedLocations]);
  const pinIds = useMemo(
    () => new Set([activeMission?.pickupLocationId, activeMission?.dropLocationId].filter((x): x is string => !!x)),
    [activeMission],
  );

  return (
    <div
      className="pointer-events-none bg-slate-950/80 border-2 border-amber-600/50 rounded-2xl shadow-2xl backdrop-blur-sm p-1.5"
      style={{ width: SIZE + 12 }}
    >
      <GujaratMapSvg
        locations={locations}
        detail="mini"
        className="block rounded-xl"
        visited={visited}
        currentId={currentLocationId}
        navTargetId={navTargetId}
        pinIds={pinIds}
      >
        {/* Player heading arrow — rotate(-vehicleRotation) so its tip follows forward (-z = up). */}
        <g ref={playerRef}>
          <path d="M 0 -95 L 62 75 L 0 32 L -62 75 Z" fill="#f43f5e" stroke="#ffffff" strokeWidth={16} />
        </g>
      </GujaratMapSvg>
    </div>
  );
};
