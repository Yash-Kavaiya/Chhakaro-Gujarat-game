import { MissionData } from '../types';

export function isMissionComplete(mission: MissionData | null, arrivedLocationId: string): boolean {
  return mission != null && mission.dropLocationId === arrivedLocationId;
}
