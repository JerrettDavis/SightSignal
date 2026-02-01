import { requireAuth } from "@/shared/auth-helpers";
import {
  getSightingRepository,
  getGeofenceRepository,
  getSubscriptionRepository,
} from "@/adapters/repositories/repository-factory";
import { jsonOk } from "@/shared/http";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    await requireAuth();

    const sightingRepo = getSightingRepository();
    const geofenceRepo = getGeofenceRepository();
    const subscriptionRepo = getSubscriptionRepository();

    console.log("[Admin Metrics] Fetching data...");

    const [allSightings, allGeofences, allSubscriptions] = await Promise.all([
      sightingRepo.list({}).catch((err) => {
        console.error("[Admin Metrics] Sightings error:", err);
        return [];
      }),
      geofenceRepo.list({}).catch((err) => {
        console.error("[Admin Metrics] Geofences error:", err);
        return [];
      }),
      subscriptionRepo.list().catch((err) => {
        console.error("[Admin Metrics] Subscriptions error:", err);
        return [];
      }),
    ]);

    console.log("[Admin Metrics] Data fetched:", {
      sightings: allSightings.length,
      geofences: allGeofences.length,
      subscriptions: allSubscriptions.length,
    });

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
  } catch (error) {
    console.error("[Admin Metrics] Fatal error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch metrics",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
