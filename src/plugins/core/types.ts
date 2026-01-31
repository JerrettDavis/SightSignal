/**
 * SignalFeed Plugin System - Core Types
 *
 * Defines the standard interfaces for all plugins (server and client-side).
 * Plugins can create sightings, signals, or geofences from external data sources.
 */

// ============================================================================
// Plugin Metadata
// ============================================================================

export interface PluginMeta {
  /** Unique identifier (e.g., "noaa-weather") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semantic version */
  version: string;
  /** What this plugin does */
  description: string;
  /** Plugin creator */
  author: string;
  /** SPDX license identifier */
  license: string;
  /** Documentation/homepage URL */
  homepage?: string;
  /** Icon URL or emoji */
  icon?: string;
}

export interface PluginCapabilities {
  /** Types of entities this plugin can create */
  entityTypes: ("sighting" | "signal" | "geofence")[];
  /** Requires API keys or authentication */
  requiresAuth: boolean;
  /** Can stream real-time updates */
  supportsRealtime: boolean;
  /** Can poll periodically */
  supportsPolling: boolean;
  /** Recommended poll interval in milliseconds */
  pollInterval?: number;
}

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface PluginConfig {
  /** User-provided configuration */
  settings: Record<string, unknown>;
  /** Execution environment */
  environment: "server" | "client";
  /** User ID (for client-side plugins) */
  userId?: string;
  /** API keys (encrypted at rest) */
  apiKeys?: Record<string, string>;
}

export interface FetchContext {
  /** Time range to fetch */
  since?: Date;
  until?: Date;
  /** Geographic bounds (optional) */
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** Pagination */
  limit?: number;
  offset?: number;
  cursor?: string;
}

// ============================================================================
// Feed Data Structures
// ============================================================================

export interface FeedResult {
  /** Data items fetched */
  items: FeedItem[];
  /** Pagination cursor */
  nextCursor?: string;
  /** More data available */
  hasMore: boolean;
  /** When this data was fetched */
  fetchedAt: Date;
  /** Source attribution */
  source: SourceAttribution;
  /** Non-fatal warnings */
  warnings?: string[];
  /** Errors encountered */
  errors?: Error[];
}

export interface SourceAttribution {
  /** Source name */
  name: string;
  /** Link to original source */
  url: string;
  /** Required attribution text */
  attribution: string;
  /** Data license */
  license?: string;
}

export interface FeedItem {
  /** Type of entity to create */
  type: "sighting" | "signal" | "geofence";
  /** Unique identifier from source (for deduplication) */
  externalId: string;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Timestamp of event */
  timestamp: Date;
  /** Geographic location */
  location: LocationData;
  /** Geometry (for geofences) */
  geometry?: GeometryData;
  /** Categorization */
  category: string;
  subcategory?: string;
  tags?: string[];
  /** Severity level */
  severity?: "info" | "warning" | "critical";
  /** Rich metadata */
  metadata: FeedItemMetadata;
  /** Visibility setting */
  visibility?: "public" | "private" | "followers";
}

export interface LocationData {
  latitude: number;
  longitude: number;
  /** Accuracy in meters */
  accuracy?: number;
  /** Human-readable address */
  address?: string;
}

export interface GeometryData {
  type: "circle" | "polygon";
  /** For circles: radius in meters */
  radius?: number;
  /** For polygons: [[lng, lat], ...] */
  coordinates?: number[][];
}

export interface FeedItemMetadata {
  /** Deep link to original data */
  sourceUrl: string;
  /** Source type identifier (e.g., "noaa-alert") */
  sourceType: string;
  /** Confidence score 0-1 */
  confidence?: number;
  /** When data becomes stale */
  expiresAt?: Date;
  /** Media URLs (images, videos, etc.) */
  mediaUrls?: string[];
  /** Plugin-specific metadata */
  [key: string]: unknown;
}

// ============================================================================
// Plugin Interface
// ============================================================================

export interface FeedPlugin {
  /** Plugin metadata */
  meta: PluginMeta;
  /** Plugin capabilities */
  capabilities: PluginCapabilities;
  /** Configuration schema (JSON Schema) */
  configSchema?: object;

  /** Initialize plugin with configuration */
  initialize(config: PluginConfig): Promise<void>;
  /** Fetch data from source */
  fetch(context: FetchContext): Promise<FeedResult>;
  /** Cleanup resources */
  shutdown(): Promise<void>;
  /** Health check */
  healthCheck?(): Promise<HealthStatus>;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  lastSuccessfulFetch?: Date;
  consecutiveFailures?: number;
}

// ============================================================================
// Plugin Registry
// ============================================================================

export interface RegisteredPlugin {
  plugin: FeedPlugin;
  config: PluginConfig;
  metrics: PluginMetrics;
  status: PluginStatus;
}

export type PluginStatus = "active" | "paused" | "error" | "disabled";

export interface PluginMetrics {
  pluginId: string;
  lastFetchAt?: Date;
  successRate: number;
  avgFetchDuration: number;
  itemsCreated: number;
  consecutiveFailures: number;
  status: "healthy" | "degraded" | "failing" | "disabled";
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class PluginError extends Error {
  constructor(
    message: string,
    public pluginId: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "PluginError";
  }
}

export class PluginTimeoutError extends PluginError {
  constructor(pluginId: string, timeoutMs: number) {
    super(
      `Plugin execution timed out after ${timeoutMs}ms`,
      pluginId,
      "TIMEOUT"
    );
    this.name = "PluginTimeoutError";
  }
}

export class PluginValidationError extends PluginError {
  constructor(pluginId: string, errors: ValidationError[]) {
    super(
      `Plugin validation failed with ${errors.length} error(s)`,
      pluginId,
      "VALIDATION_FAILED",
      errors
    );
    this.name = "PluginValidationError";
  }
}
