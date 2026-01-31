/**
 * Plugin Validator
 *
 * Validates feed items against schema and business rules.
 */

import type {
  FeedItem,
  FeedResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./types";

export class PluginValidator {
  /**
   * Validate an entire feed result
   */
  validateFeedResult(result: FeedResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate source attribution
    if (!result.source) {
      errors.push({
        field: "source",
        message: "Source attribution is required",
      });
    } else {
      if (!result.source.name) {
        errors.push({
          field: "source.name",
          message: "Source name is required",
        });
      }
      if (!result.source.url) {
        errors.push({
          field: "source.url",
          message: "Source URL is required",
        });
      }
      if (!result.source.attribution) {
        errors.push({
          field: "source.attribution",
          message: "Source attribution text is required",
        });
      }
    }

    // Validate items
    if (!Array.isArray(result.items)) {
      errors.push({
        field: "items",
        message: "Items must be an array",
        value: typeof result.items,
      });
    } else {
      result.items.forEach((item, index) => {
        const itemValidation = this.validateFeedItem(item);
        itemValidation.errors.forEach((error) => {
          errors.push({
            ...error,
            field: `items[${index}].${error.field}`,
          });
        });
        itemValidation.warnings.forEach((warning) => {
          warnings.push({
            ...warning,
            field: `items[${index}].${warning.field}`,
          });
        });
      });
    }

    // Check for duplicates
    const externalIds = new Set<string>();
    result.items?.forEach((item, index) => {
      if (externalIds.has(item.externalId)) {
        warnings.push({
          field: `items[${index}].externalId`,
          message: "Duplicate externalId found in feed result",
          suggestion: "Remove duplicates before submitting",
        });
      }
      externalIds.add(item.externalId);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single feed item
   */
  validateFeedItem(item: FeedItem): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!item.type) {
      errors.push({ field: "type", message: "Type is required" });
    } else if (!["sighting", "signal", "geofence"].includes(item.type)) {
      errors.push({
        field: "type",
        message: 'Type must be "sighting", "signal", or "geofence"',
        value: item.type,
      });
    }

    if (!item.externalId) {
      errors.push({ field: "externalId", message: "External ID is required" });
    }

    if (!item.title) {
      errors.push({ field: "title", message: "Title is required" });
    } else if (item.title.length > 200) {
      warnings.push({
        field: "title",
        message: "Title is longer than 200 characters",
        suggestion: "Consider shortening for better display",
      });
    }

    if (!item.timestamp) {
      errors.push({ field: "timestamp", message: "Timestamp is required" });
    } else if (!(item.timestamp instanceof Date)) {
      errors.push({
        field: "timestamp",
        message: "Timestamp must be a Date object",
        value: typeof item.timestamp,
      });
    }

    // Location validation
    if (!item.location) {
      errors.push({ field: "location", message: "Location is required" });
    } else {
      const locErrors = this.validateLocation(item.location);
      errors.push(
        ...locErrors.map((e) => ({ ...e, field: `location.${e.field}` }))
      );
    }

    // Geometry validation (for geofences)
    if (item.type === "geofence") {
      if (!item.geometry) {
        errors.push({
          field: "geometry",
          message: "Geometry is required for geofences",
        });
      } else {
        const geomErrors = this.validateGeometry(item.geometry);
        errors.push(
          ...geomErrors.map((e) => ({ ...e, field: `geometry.${e.field}` }))
        );
      }
    }

    // Category validation
    if (!item.category) {
      errors.push({ field: "category", message: "Category is required" });
    }

    // Severity validation
    if (
      item.severity &&
      !["info", "warning", "critical"].includes(item.severity)
    ) {
      errors.push({
        field: "severity",
        message: 'Severity must be "info", "warning", or "critical"',
        value: item.severity,
      });
    }

    // Metadata validation
    if (!item.metadata) {
      errors.push({ field: "metadata", message: "Metadata is required" });
    } else {
      if (!item.metadata.sourceUrl) {
        errors.push({
          field: "metadata.sourceUrl",
          message: "Source URL is required in metadata",
        });
      }
      if (!item.metadata.sourceType) {
        errors.push({
          field: "metadata.sourceType",
          message: "Source type is required in metadata",
        });
      }

      // Validate confidence if present
      if (
        item.metadata.confidence !== undefined &&
        (item.metadata.confidence < 0 || item.metadata.confidence > 1)
      ) {
        errors.push({
          field: "metadata.confidence",
          message: "Confidence must be between 0 and 1",
          value: item.metadata.confidence,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate location data
   */
  private validateLocation(location: FeedItem["location"]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof location.latitude !== "number") {
      errors.push({
        field: "latitude",
        message: "Latitude must be a number",
        value: typeof location.latitude,
      });
    } else if (location.latitude < -90 || location.latitude > 90) {
      errors.push({
        field: "latitude",
        message: "Latitude must be between -90 and 90",
        value: location.latitude,
      });
    }

    if (typeof location.longitude !== "number") {
      errors.push({
        field: "longitude",
        message: "Longitude must be a number",
        value: typeof location.longitude,
      });
    } else if (location.longitude < -180 || location.longitude > 180) {
      errors.push({
        field: "longitude",
        message: "Longitude must be between -180 and 180",
        value: location.longitude,
      });
    }

    if (location.accuracy !== undefined && location.accuracy < 0) {
      errors.push({
        field: "accuracy",
        message: "Accuracy must be positive",
        value: location.accuracy,
      });
    }

    return errors;
  }

  /**
   * Validate geometry data
   */
  private validateGeometry(geometry: FeedItem["geometry"]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!geometry) return errors;

    if (!["circle", "polygon"].includes(geometry.type)) {
      errors.push({
        field: "type",
        message: 'Geometry type must be "circle" or "polygon"',
        value: geometry.type,
      });
    }

    if (geometry.type === "circle") {
      if (typeof geometry.radius !== "number") {
        errors.push({
          field: "radius",
          message: "Radius is required for circle geometry",
        });
      } else if (geometry.radius <= 0) {
        errors.push({
          field: "radius",
          message: "Radius must be positive",
          value: geometry.radius,
        });
      }
    }

    if (geometry.type === "polygon") {
      if (!Array.isArray(geometry.coordinates)) {
        errors.push({
          field: "coordinates",
          message: "Coordinates are required for polygon geometry",
        });
      } else if (geometry.coordinates.length < 3) {
        errors.push({
          field: "coordinates",
          message: "Polygon must have at least 3 coordinates",
          value: geometry.coordinates.length,
        });
      } else {
        // Validate each coordinate pair
        geometry.coordinates.forEach((coord, index) => {
          if (!Array.isArray(coord) || coord.length !== 2) {
            errors.push({
              field: `coordinates[${index}]`,
              message: "Each coordinate must be [longitude, latitude]",
            });
          } else {
            const [lng, lat] = coord;
            if (typeof lng !== "number" || lng < -180 || lng > 180) {
              errors.push({
                field: `coordinates[${index}][0]`,
                message: "Longitude must be between -180 and 180",
                value: lng,
              });
            }
            if (typeof lat !== "number" || lat < -90 || lat > 90) {
              errors.push({
                field: `coordinates[${index}][1]`,
                message: "Latitude must be between -90 and 90",
                value: lat,
              });
            }
          }
        });
      }
    }

    return errors;
  }
}
