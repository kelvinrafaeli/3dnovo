"use client";

import { useMemo } from "react";
import { getDefaultRoomsByObjective, ROOM_CATALOG } from "@/lib/room-definitions";

export function useRoomSuggestions(objective: string) {
  return useMemo(() => {
    const defaultIds = getDefaultRoomsByObjective(objective);
    return {
      suggestedRoomIds: defaultIds,
      catalog: ROOM_CATALOG,
    };
  }, [objective]);
}
