import { requireAuth } from "@/shared/auth-helpers";
import {
  getSightingRepository,
  getGeofenceRepository,
  getSubscriptionRepository,
} from "@/adapters/repositories/repository-factory";
import { jsonOk } from "@/shared/http";

export const runtime = "nodejs";

export const GET = async () => {
  await requireAuth();

  const sightingRepo = getSightingRepository();
  const geofenceRepo = getGeofenceRepository();
  const subscriptionRepo = getSubscriptionRepository();

  const [allSightings, allGeofences, allSubscriptions] = await Promise.all([
    sightingRepo.list({}),
    geofenceRepo.list({}),
    subscriptionRepo.list(),
  ]);

  const metrics = {
    totalSightings: allSightings.length,
    activeSightings: allSightings.filter((s) => s.status === "active").length,
    resolvedSightings: allSightings.filter((s) => s.status === "resolved")
      .length,
    criticalAlerts: allSightings.filter((s) => s.importance === "critical")
      .length,
    geofences: allGeofences.length,
    publicGeofences: allGeofences.filter((g) => g.visibility === "public")
      .length,
    subscriptions: allSubscriptions.length,
  };

  return jsonOk(metrics);
};
