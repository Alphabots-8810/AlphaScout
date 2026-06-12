import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Everything in the app is scoped to the single active event.
// Returns undefined while loading, null when no event is configured.
export function useActiveEvent() {
  return useQuery(api.events.activeEvent);
}
