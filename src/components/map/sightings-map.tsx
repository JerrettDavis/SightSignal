"use client";

import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "@/shared/config";
import { loadMaplibre } from "@/shared/maplibre";
import type { SightingCard } from "@/data/mock-sightings";
import { useTheme } from "@/hooks/useTheme";

type SelectedGeofence = {
  id: string;
  name: string;
  polygon: {
    points: Array<{ lat: number; lng: number }>;
  };
};

type SelectedSighting = {
  id: string;
  title: string;
  category: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
};

type Props = {
  sightings: SightingCard[];
  selectedGeofence?: SelectedGeofence | null;
  selectedSighting?: SelectedSighting | null;
};

const toGeoJson = (sightings: SightingCard[]) => ({
  type: "FeatureCollection" as const,
  features: sightings.map((sighting) => ({
    type: "Feature" as const,
    properties: {
      id: sighting.id,
      title: sighting.title,
      category: sighting.category,
      importance: sighting.importance,
      status: sighting.status,
      description: sighting.description,
      score: sighting.score ?? 0,
      hotScore: sighting.hotScore ?? 0,
    },
    geometry: {
      type: "Point" as const,
      coordinates: [sighting.location.lng, sighting.location.lat],
    },
  })),
});

export const SightingsMap = ({
  sightings,
  selectedGeofence,
  selectedSighting,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const { effectiveTheme } = useTheme();
  const [showHeatmap, setShowHeatmap] = useState(false);

  const geoJson = useMemo(() => toGeoJson(sightings), [sightings]);
  const geoJsonRef = useRef(geoJson);

  useEffect(() => {
    geoJsonRef.current = geoJson;
  }, [geoJson]);

  // Toggle heatmap layer
  const toggleHeatmap = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const newShowHeatmap = !showHeatmap;
    setShowHeatmap(newShowHeatmap);

    // Helper to safely set layer visibility
    const setLayerVisibility = (
      layerId: string,
      visibility: "visible" | "none"
    ) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    };

    if (newShowHeatmap) {
      // Hide clustered layers
      setLayerVisibility("clusters", "none");
      setLayerVisibility("cluster-count", "none");
      setLayerVisibility("unclustered-point-glow", "none");
      setLayerVisibility("unclustered-point", "none");
      // Show heatmap
      setLayerVisibility("sightings-heatmap", "visible");
    } else {
      // Show clustered layers
      setLayerVisibility("clusters", "visible");
      setLayerVisibility("cluster-count", "visible");
      setLayerVisibility("unclustered-point-glow", "visible");
      setLayerVisibility("unclustered-point", "visible");
      // Hide heatmap
      setLayerVisibility("sightings-heatmap", "none");
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;

    const init = async () => {
      const maplibre = await loadMaplibre();
      if (cancelled || !containerRef.current) {
        return;
      }

      // Use theme-appropriate map style
      const mapStyleUrl =
        effectiveTheme === "dark" ? "/map-style-dark.json" : config.mapStyleUrl;

      const map = new maplibre.Map({
        container: containerRef.current,
        style: mapStyleUrl,
        center: [-98.5795, 39.8283],
        zoom: 4,
        pitch: 0,
        attributionControl: false,
      });

      map.addControl(
        new maplibre.NavigationControl({ visualizePitch: true }),
        "bottom-right"
      );
      map.addControl(
        new maplibre.AttributionControl({
          compact: true,
          customAttribution: "SightSignal",
        }),
        "bottom-left"
      );

      map.on("load", () => {
        // Add source with clustering enabled
        map.addSource("sightings", {
          type: "geojson",
          data: geoJsonRef.current,
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points on
          clusterRadius: 50, // Radius of each cluster when clustering points (in pixels)
        });

        // Heatmap layer (hidden by default) - very subtle like light clouds
        map.addLayer({
          id: "sightings-heatmap",
          type: "heatmap",
          source: "sightings",
          layout: {
            visibility: "none",
          },
          paint: {
            // Increase weight for higher hotScore
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "hotScore"],
              -10,
              0,
              0,
              0.2,
              10,
              1,
            ],
            // Increase intensity as zoom increases
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.5,
              9,
              1.5,
            ],
            // Color ramp for heatmap - very light opacity like clouds
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33, 102, 172, 0)",
              0.2,
              "rgba(103, 169, 207, 0.15)",
              0.4,
              "rgba(209, 229, 240, 0.2)",
              0.6,
              "rgba(253, 219, 199, 0.25)",
              0.8,
              "rgba(239, 138, 98, 0.3)",
              1,
              "rgba(178, 24, 43, 0.35)",
            ],
            // Adjust radius by zoom level
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              2,
              9,
              20,
              14,
              40,
            ],
            // Fade out at high zoom (transition to point view)
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              7,
              0.8,
              14,
              0.2,
              15,
              0,
            ],
          },
        });

        // Cluster circles
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "sightings",
          filter: ["has", "point_count"],
          layout: {
            visibility: "visible",
          },
          paint: {
            // Size clusters by point count
            "circle-radius": [
              "step",
              ["get", "point_count"],
              20, // radius when count < 10
              10,
              30, // radius when count >= 10
              30,
              40, // radius when count >= 30
              100,
              50, // radius when count >= 100
            ],
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#3a86ff", // color when count < 10
              10,
              "#f2c94c", // color when count >= 10
              30,
              "#f77f00", // color when count >= 30
              100,
              "#f06449", // color when count >= 100
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Cluster count labels
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "sightings",
          filter: ["has", "point_count"],
          layout: {
            visibility: "visible",
            "text-field": "{point_count_abbreviated}",
            "text-font": ["Noto Sans Regular"],
            "text-size": 14,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        // Unclustered points - glow effect
        map.addLayer({
          id: "unclustered-point-glow",
          type: "circle",
          source: "sightings",
          filter: ["!", ["has", "point_count"]],
          layout: {
            visibility: "visible",
          },
          paint: {
            "circle-radius": 16,
            "circle-color": "#f2c94c",
            "circle-opacity": 0.2,
          },
        });

        // Unclustered points (individual sightings)
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "sightings",
          filter: ["!", ["has", "point_count"]],
          layout: {
            visibility: "visible",
          },
          paint: {
            "circle-radius": 7,
            "circle-color": [
              "match",
              ["get", "importance"],
              "critical",
              "#f06449",
              "high",
              "#f2c94c",
              "low",
              "#1f6f5b",
              "#3a86ff",
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Click handler for clusters - zoom in
        map.on("click", "clusters", async (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["clusters"],
          });
          const clusterId = features[0]?.properties?.cluster_id;
          if (
            !clusterId ||
            !features[0]?.geometry ||
            features[0].geometry.type !== "Point"
          )
            return;

          const source = map.getSource("sightings") as GeoJSONSource;
          try {
            const zoom = await source.getClusterExpansionZoom(clusterId);
            map.easeTo({
              center: features[0].geometry.coordinates as [number, number],
              zoom: zoom ?? map.getZoom() + 2,
              duration: 500,
            });
          } catch (err) {
            console.error("Failed to get cluster expansion zoom:", err);
          }
        });

        // Click handler for individual points (replaced old handler)
        map.on("click", "unclustered-point", (event) => {
          const feature = event.features?.[0];
          if (!feature || !event.lngLat) {
            return;
          }
          const properties = feature.properties as Record<string, string>;

          // Save lngLat before setTimeout
          const lngLat = { lng: event.lngLat.lng, lat: event.lngLat.lat };

          // Zoom to the sighting with smooth animation
          map.flyTo({
            center: [lngLat.lng, lngLat.lat],
            zoom: 15,
            duration: 1000,
            essential: true,
          });

          // Show popup after a brief delay to let the zoom settle
          setTimeout(async () => {
            const maplibreModule = await loadMaplibre();
            popupRef.current?.remove();
            popupRef.current = new maplibreModule.Popup({
              closeButton: false,
              offset: 12,
            })
              .setLngLat([lngLat.lng, lngLat.lat])
              .setHTML(
                `<div style="font-family: var(--font-body); color: #0c1a24;">
                  <div style="font-weight: 600; margin-bottom: 6px;">${properties.title}</div>
                  <div style="font-size: 12px; opacity: 0.75;">${properties.category}</div>
                  <div style="font-size: 12px; margin-top: 6px;">${properties.description}</div>
                </div>`
              )
              .addTo(map);
          }, 500);
        });

        // Cursor handlers for clusters
        map.on("mouseenter", "clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "clusters", () => {
          map.getCanvas().style.cursor = "";
        });

        // Cursor handlers for points
        map.on("mouseenter", "unclustered-point", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "unclustered-point", () => {
          map.getCanvas().style.cursor = "";
        });

        map.resize();

        map.on("error", (event) => {
          if (event.error) {
            console.error("Map error:", event.error);
          }
        });
      });

      mapRef.current = map;
      mapInstance = map;
    };

    void init();

    return () => {
      cancelled = true;
      mapInstance?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapStyleUrl =
      effectiveTheme === "dark" ? "/map-style-dark.json" : config.mapStyleUrl;

    // Get current center and zoom to preserve view
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();

    map.setStyle(mapStyleUrl);

    // Re-add layers after style loads
    map.once("styledata", () => {
      // Restore view
      map.setCenter(center);
      map.setZoom(zoom);
      map.setPitch(pitch);

      // Re-add sightings source with clustering
      if (!map.getSource("sightings")) {
        map.addSource("sightings", {
          type: "geojson",
          data: geoJsonRef.current,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Add all layers (heatmap, clusters, unclustered points)
        map.addLayer({
          id: "sightings-heatmap",
          type: "heatmap",
          source: "sightings",
          layout: { visibility: showHeatmap ? "visible" : "none" },
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "hotScore"],
              -10,
              0,
              0,
              0.2,
              10,
              1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.5,
              9,
              1.5,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33, 102, 172, 0)",
              0.2,
              "rgba(103, 169, 207, 0.15)",
              0.4,
              "rgba(209, 229, 240, 0.2)",
              0.6,
              "rgba(253, 219, 199, 0.25)",
              0.8,
              "rgba(239, 138, 98, 0.3)",
              1,
              "rgba(178, 24, 43, 0.35)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              2,
              9,
              20,
              14,
              40,
            ],
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              7,
              0.8,
              14,
              0.2,
              15,
              0,
            ],
          },
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "sightings",
          filter: ["has", "point_count"],
          layout: { visibility: showHeatmap ? "none" : "visible" },
          paint: {
            "circle-radius": [
              "step",
              ["get", "point_count"],
              20,
              10,
              30,
              30,
              40,
              100,
              50,
            ],
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#3a86ff",
              10,
              "#f2c94c",
              30,
              "#f77f00",
              100,
              "#f06449",
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "sightings",
          filter: ["has", "point_count"],
          layout: {
            visibility: showHeatmap ? "none" : "visible",
            "text-field": "{point_count_abbreviated}",
            "text-font": ["Noto Sans Regular"],
            "text-size": 14,
          },
          paint: { "text-color": "#ffffff" },
        });

        map.addLayer({
          id: "unclustered-point-glow",
          type: "circle",
          source: "sightings",
          filter: ["!", ["has", "point_count"]],
          layout: { visibility: showHeatmap ? "none" : "visible" },
          paint: {
            "circle-radius": 16,
            "circle-color": "#f2c94c",
            "circle-opacity": 0.2,
          },
        });

        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "sightings",
          filter: ["!", ["has", "point_count"]],
          layout: { visibility: showHeatmap ? "none" : "visible" },
          paint: {
            "circle-radius": 7,
            "circle-color": [
              "match",
              ["get", "importance"],
              "critical",
              "#f06449",
              "high",
              "#f2c94c",
              "low",
              "#1f6f5b",
              "#3a86ff",
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Re-add click handlers for clusters
        map.on("click", "clusters", async (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["clusters"],
          });
          const clusterId = features[0]?.properties?.cluster_id;
          if (
            !clusterId ||
            !features[0]?.geometry ||
            features[0].geometry.type !== "Point"
          )
            return;

          const source = map.getSource("sightings") as GeoJSONSource;
          try {
            const zoom = await source.getClusterExpansionZoom(clusterId);
            map.easeTo({
              center: features[0].geometry.coordinates as [number, number],
              zoom: zoom ?? map.getZoom() + 2,
              duration: 500,
            });
          } catch (err) {
            console.error("Failed to get cluster expansion zoom:", err);
          }
        });

        // Re-add click handlers for individual points
        map.on("click", "unclustered-point", async (event) => {
          const feature = event.features?.[0];
          if (!feature || !event.lngLat) return;

          const properties = feature.properties as Record<string, string>;
          const lngLat = { lng: event.lngLat.lng, lat: event.lngLat.lat };

          map.flyTo({
            center: [lngLat.lng, lngLat.lat],
            zoom: 15,
            duration: 1000,
            essential: true,
          });

          setTimeout(async () => {
            const maplibreModule = await loadMaplibre();
            popupRef.current?.remove();
            popupRef.current = new maplibreModule.Popup({
              closeButton: false,
              offset: 12,
            })
              .setLngLat([lngLat.lng, lngLat.lat])
              .setHTML(
                `<div style="font-family: var(--font-body); color: #0c1a24;">
                  <div style="font-weight: 600; margin-bottom: 6px;">${properties.title}</div>
                  <div style="font-size: 12px; opacity: 0.75;">${properties.category}</div>
                  <div style="font-size: 12px; margin-top: 6px;">${properties.description}</div>
                </div>`
              )
              .addTo(map);
          }, 500);
        });

        // Re-add cursor handlers
        map.on(
          "mouseenter",
          "clusters",
          () => (map.getCanvas().style.cursor = "pointer")
        );
        map.on(
          "mouseleave",
          "clusters",
          () => (map.getCanvas().style.cursor = "")
        );
        map.on(
          "mouseenter",
          "unclustered-point",
          () => (map.getCanvas().style.cursor = "pointer")
        );
        map.on(
          "mouseleave",
          "unclustered-point",
          () => (map.getCanvas().style.cursor = "")
        );
      }
    });
  }, [effectiveTheme, showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const source = map.getSource("sightings") as GeoJSONSource | undefined;
    if (source) {
      source.setData(geoJson);
    }
  }, [geoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedGeofence) {
      return;
    }

    // Ensure style is loaded before manipulating layers
    if (!map.isStyleLoaded()) {
      console.warn("Map style not loaded, deferring geofence display");
      return;
    }

    const points = selectedGeofence.polygon.points;
    if (points.length === 0) {
      return;
    }

    // Calculate bounds
    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // Fly to the geofence bounds
    try {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: 80,
          maxZoom: 14,
          duration: 1000,
        }
      );
    } catch (error) {
      console.error("Error fitting bounds to geofence:", error);
      return;
    }

    // Add or update the geofence highlight layer
    const geofenceGeoJson = {
      type: "Feature" as const,
      properties: {
        name: selectedGeofence.name,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            ...points.map((p) => [p.lng, p.lat]),
            [points[0].lng, points[0].lat],
          ],
        ],
      },
    };

    try {
      const source = map.getSource("selected-geofence") as
        | GeoJSONSource
        | undefined;
      if (source) {
        source.setData(geofenceGeoJson);
      } else {
        map.addSource("selected-geofence", {
          type: "geojson",
          data: geofenceGeoJson,
        });

        map.addLayer({
          id: "selected-geofence-fill",
          type: "fill",
          source: "selected-geofence",
          paint: {
            "fill-color": "#f2c94c",
            "fill-opacity": 0.15,
          },
        });

        map.addLayer({
          id: "selected-geofence-outline",
          type: "line",
          source: "selected-geofence",
          paint: {
            "line-color": "#f2c94c",
            "line-width": 3,
          },
        });
      }
    } catch (error) {
      console.error("Error adding geofence layers:", error);
    }
  }, [selectedGeofence]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSighting) {
      return;
    }

    // Ensure style is loaded before flying to location
    if (!map.isStyleLoaded()) {
      console.warn("Map style not loaded, deferring sighting display");
      return;
    }

    const { lat, lng } = selectedSighting.location;

    // Zoom to the sighting with smooth animation
    try {
      map.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1000,
        essential: true,
      });
    } catch (error) {
      console.error("Error flying to sighting:", error);
      return;
    }

    // Import maplibre dynamically to show popup
    void loadMaplibre().then((maplibre) => {
      setTimeout(() => {
        popupRef.current?.remove();
        popupRef.current = new maplibre.Popup({
          closeButton: false,
          offset: 12,
        })
          .setLngLat([lng, lat])
          .setHTML(
            `<div style="font-family: var(--font-body); color: #0c1a24;">
              <div style="font-weight: 600; margin-bottom: 6px;">${selectedSighting.title}</div>
              <div style="font-size: 12px; opacity: 0.75;">${selectedSighting.category}</div>
              <div style="font-size: 12px; margin-top: 6px;">${selectedSighting.description}</div>
            </div>`
          )
          .addTo(map);
      }, 500);
    });
  }, [selectedSighting]);

  return (
    <div
      data-testid="sightings-map"
      className="absolute inset-0 overflow-hidden"
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};
