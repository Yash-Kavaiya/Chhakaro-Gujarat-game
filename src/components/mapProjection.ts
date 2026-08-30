import { LocationData } from '../types';

export interface MapProjection {
  /** World {x,z} → SVG [x,y]. Uses mapPosition when set, else worldPosition. */
  project: (p: { x: number; z: number }) => [number, number];
  viewBox: string;
  size: number;
}

/**
 * Build a top-down projection from the bounding box of every location's
 * `mapPosition ?? worldPosition`, scaled to fit a square `size` box with `pad`
 * margin and the (possibly non-square) content centred. Shared by MiniMap and the
 * GujaratMapModal spatial panel so both read the same layout.
 */
export function projectPoints(locations: LocationData[], size: number, pad = 16): MapProjection {
  const pts = locations.map((l) => l.mapPosition ?? l.worldPosition);
  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const minZ = zs.length ? Math.min(...zs) : 0;
  const maxZ = zs.length ? Math.max(...zs) : 1;
  const span = Math.max(maxX - minX, maxZ - minZ) || 1;
  const inner = size - pad * 2;
  const scale = inner / span;
  const offX = pad + (inner - (maxX - minX) * scale) / 2;
  const offZ = pad + (inner - (maxZ - minZ) * scale) / 2;
  return {
    size,
    viewBox: `0 0 ${size} ${size}`,
    project: (p) => [offX + (p.x - minX) * scale, offZ + (p.z - minZ) * scale],
  };
}
