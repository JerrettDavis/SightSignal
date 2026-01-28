import { buildCreateSighting } from "@/application/use-cases/create-sighting";
import { buildListSightings } from "@/application/use-cases/list-sightings";
import { getSightingRepository } from "@/adapters/repositories/repository-factory";
import { systemClock } from "@/adapters/clock/system-clock";
import { ulidGenerator } from "@/adapters/id/ulid-generator";
import { PolygonSchema } from "@/contracts/geo";
import {
  CreateSightingRequestSchema,
  SightingStatusSchema,
} from "@/contracts/sighting";
import { jsonBadRequest, jsonCreated, jsonOk } from "@/shared/http";
import type { SightingFilters } from "@/ports/sighting-repository";
import {
  checkRateLimit,
  getRateLimitHeaders,
  RATE_LIMITS,
} from "@/shared/rate-limit";
import {
  getCachedResponse,
  setCachedResponse,
  getCacheHeaders,
  checkETag,
  CACHE_TTL,
} from "@/shared/cache";

export const runtime = "nodejs";

const repository = getSightingRepository();
const createSighting = buildCreateSighting({
  repository,
  idGenerator: ulidGenerator,
  clock: systemClock,
});
const listSightings = buildListSightings(repository);

const parseFilters = (
  searchParams: URLSearchParams
): SightingFilters | { error: string } => {
  const typeIds = searchParams.getAll("typeId");
  const categoryIds = searchParams.getAll("categoryId");
  const statusRaw = searchParams.get("status");
  const boundsRaw = searchParams.get("bounds");
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const minHotScoreRaw = searchParams.get("minHotScore");

  if (statusRaw && !SightingStatusSchema.safeParse(statusRaw).success) {
    return { error: "Invalid status filter." };
  }

  let bounds: SightingFilters["bounds"];
  if (boundsRaw) {
    try {
      const parsed = PolygonSchema.safeParse(JSON.parse(boundsRaw));
      if (!parsed.success) {
        return { error: "Invalid bounds polygon." };
      }
      bounds = parsed.data;
    } catch {
      return { error: "Bounds must be JSON." };
    }
  }

  let limit: number | undefined;
  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (isNaN(parsed) || parsed < 1) {
      return { error: "Invalid limit value." };
    }
    limit = parsed;
  }

  let offset: number | undefined;
  if (offsetRaw) {
    const parsed = parseInt(offsetRaw, 10);
    if (isNaN(parsed) || parsed < 0) {
      return { error: "Invalid offset value." };
    }
    offset = parsed;
  }

  let minHotScore: number | undefined;
  if (minHotScoreRaw) {
    const parsed = parseFloat(minHotScoreRaw);
    if (isNaN(parsed)) {
      return { error: "Invalid minHotScore value." };
    }
    minHotScore = parsed;
  }

  return {
    typeIds: typeIds.length
      ? (typeIds as SightingFilters["typeIds"])
      : undefined,
    categoryIds: categoryIds.length
      ? (categoryIds as SightingFilters["categoryIds"])
      : undefined,
    status: statusRaw ? (statusRaw as SightingFilters["status"]) : undefined,
    bounds,
    limit,
    offset,
    minHotScore,
  };
};

export const GET = async (request: Request) => {
  // Apply rate limiting
  const rateLimit = checkRateLimit(request, {
    ...RATE_LIMITS.READ,
    keyPrefix: "sightings:list",
  });

  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders,
          "Retry-After": (
            rateLimit.reset - Math.floor(Date.now() / 1000)
          ).toString(),
        },
      }
    );
  }

  const url = new URL(request.url);
  const filters = parseFilters(url.searchParams);
  if ("error" in filters) {
    return jsonBadRequest({ message: filters.error });
  }

  // Generate cache key from URL (includes all query params)
  const cacheKey = `sightings:${url.pathname}${url.search}`;

  // Check cache
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    // Check ETag for conditional request
    if (checkETag(request, cached.etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          ...rateLimitHeaders,
          ETag: cached.etag,
        },
      });
    }

    // Return cached response
    return new Response(JSON.stringify({ data: cached.data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders,
        ...getCacheHeaders(CACHE_TTL.SHORT, cached.etag),
      },
    });
  }

  // Fetch fresh data
  const sightings = await listSightings(filters);

  // Cache the response
  const etag = setCachedResponse(sightings, {
    key: cacheKey,
    ttlSeconds: CACHE_TTL.SHORT,
    useETag: true,
  });

  return new Response(JSON.stringify({ data: sightings }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...rateLimitHeaders,
      ...getCacheHeaders(CACHE_TTL.SHORT, etag),
    },
  });
};

export const POST = async (request: Request) => {
  // Apply strict rate limiting for write operations
  const rateLimit = checkRateLimit(request, {
    ...RATE_LIMITS.WRITE,
    keyPrefix: "sightings:create",
  });

  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders,
          "Retry-After": (
            rateLimit.reset - Math.floor(Date.now() / 1000)
          ).toString(),
        },
      }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonBadRequest({ message: "Invalid JSON payload." });
  }
  const parsed = CreateSightingRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest({
      message: "Invalid payload.",
      details: parsed.error.flatten(),
    });
  }

  const result = await createSighting(parsed.data);
  if (!result.ok) {
    return jsonBadRequest({
      message: result.error.message,
      details: result.error,
    });
  }

  // Invalidate all sightings caches on creation
  const { invalidateCache } = await import("@/shared/cache");
  invalidateCache("sightings:*");

  return new Response(JSON.stringify({ data: result.value }), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      ...rateLimitHeaders,
    },
  });
};
