import {
  matchesConditions,
  type Signal,
  type SightingMatchData,
} from "@/domain/signals/signal";
import { getReputationTier, type UserId } from "@/domain/reputation/reputation";
import type { SightingId } from "@/domain/sightings/sighting";
import type { GeofenceRepository } from "@/ports/geofence-repository";
import type { ReputationRepository } from "@/ports/reputation-repository";
import type { SignalRepository } from "@/ports/signal-repository";
import type { SightingRepository } from "@/ports/sighting-repository";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type EvaluateSignalForSighting = (
  sightingId: string
) => Promise<Result<Signal[], DomainError>>;

type Dependencies = {
  signalRepository: SignalRepository;
  sightingRepository: SightingRepository;
  geofenceRepository: GeofenceRepository;
  reputationRepository: ReputationRepository;
};

// Helper function to check if a point is inside a polygon
const isPointInPolygon = (
  point: { lat: number; lng: number },
  polygon: { points: { lat: number; lng: number }[] }
): boolean => {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (
    let i = 0, j = polygon.points.length - 1;
    i < polygon.points.length;
    j = i++
  ) {
    const xi = polygon.points[i].lng;
    const yi = polygon.points[i].lat;
    const xj = polygon.points[j].lng;
    const yj = polygon.points[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

export const buildEvaluateSignalForSighting = ({
  signalRepository,
  sightingRepository,
  geofenceRepository,
  reputationRepository,
}: Dependencies): EvaluateSignalForSighting => {
  return async (sightingId) => {
    // Get the sighting
    const sighting = await sightingRepository.getById(sightingId as SightingId);
    if (!sighting) {
      return err({
        code: "sighting.not_found",
        message: "Sighting not found.",
      });
    }

    // Get reporter's reputation tier
    let reporterTrustLevel = getReputationTier(0); // Default to unverified
    if (sighting.reporterId) {
      const reputation = await reputationRepository.getByUserId(
        sighting.reporterId as UserId
      );
      if (reputation) {
        reporterTrustLevel = getReputationTier(reputation.score);
      }
    }

    // Build sighting match data
    const sightingMatchData: SightingMatchData = {
      categoryId: sighting.categoryId,
      typeId: sighting.typeId,
      tags: [], // TODO: Add tags support to sighting model
      importance: sighting.importance,
      score: sighting.score,
      reporterTrustLevel,
    };

    // Get all active signals
    const activeSignals = await signalRepository.list({ isActive: true });

    // Filter signals that match this sighting
    const matchingSignals: Signal[] = [];

    for (const signal of activeSignals) {
      // Check geographic targeting
      let geoMatch = false;

      if (signal.target.kind === "global") {
        geoMatch = true;
      } else if (signal.target.kind === "polygon") {
        geoMatch = isPointInPolygon(sighting.location, signal.target.polygon);
      } else if (signal.target.kind === "geofence") {
        const geofence = await geofenceRepository.getById(
          signal.target.geofenceId
        );
        if (geofence) {
          geoMatch = isPointInPolygon(sighting.location, geofence.polygon);
        }
      }

      // If geographic match, check conditions
      if (geoMatch && matchesConditions(signal.conditions, sightingMatchData)) {
        matchingSignals.push(signal);
      }
    }

    // TODO: In the future, trigger notifications here
    // For now, just return the matching signals as a stub
    // await notificationService.queueNotifications(matchingSignals, sighting);

    return ok(matchingSignals);
  };
};
