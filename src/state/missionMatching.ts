import { MissionData } from '../types';

export function isMissionComplete(
  mission: MissionData | null,
  arrivedLocationId: string,
): mission is MissionData {
  return mission != null && mission.dropLocationId === arrivedLocationId;
}
