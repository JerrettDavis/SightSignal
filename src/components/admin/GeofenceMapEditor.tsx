"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Point {
  lat: number;
  lng: number;
}

interface GeofenceMapEditorProps {
  points: Point[];
  onChange: (points: Point[]) => void;
  onClose: () => void;
}

export function GeofenceMapEditor({
  points,
  onChange,
  onClose,
}: GeofenceMapEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [editMode, setEditMode] = useState<
    "add" | "move" | "delete" | "moveAll"
  >("move");
  const [localPoints, setLocalPoints] = useState<Point[]>(points);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  // Helper functions defined before useEffects
  const updateMapLayers = (map: maplibregl.Map, mapPoints: Point[]) => {
    if (mapPoints.length === 0) return;

    // Create polygon GeoJSON
    const polygonCoords = mapPoints.map((p) => [p.lng, p.lat]);
    polygonCoords.push(polygonCoords[0]); // Close the polygon

    const polygonGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [polygonCoords],
          },
        },
      ],
    };

    // Create points GeoJSON
    const pointsGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: mapPoints.map((p, idx) => ({
        type: "Feature",
        properties: { index: idx },
        geometry: {
          type: "Point",
          coordinates: [p.lng, p.lat],
        },
      })),
    };

    // Update or add polygon source/layer
    const polygonSource = map.getSource(
      "geofence-polygon"
    ) as maplibregl.GeoJSONSource;
    if (polygonSource) {
      polygonSource.setData(polygonGeoJson);
    } else {
      map.addSource("geofence-polygon", {
        type: "geojson",
        data: polygonGeoJson,
      });

      map.addLayer({
        id: "geofence-fill",
        type: "fill",
        source: "geofence-polygon",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.2,
        },
      });

      map.addLayer({
        id: "geofence-outline",
        type: "line",
        source: "geofence-polygon",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
        },
      });
    }

    // Update or add points source/layer
    const pointsSource = map.getSource(
      "geofence-points"
    ) as maplibregl.GeoJSONSource;
    if (pointsSource) {
      pointsSource.setData(pointsGeoJson);
    } else {
      map.addSource("geofence-points", {
        type: "geojson",
        data: pointsGeoJson,
      });

      map.addLayer({
        id: "geofence-points-layer",
        type: "circle",
        source: "geofence-points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    // Fit bounds to show all points
    if (mapPoints.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      mapPoints.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  };

  const findNearestPoint = (
    lngLat: maplibregl.LngLat,
    mapPoints: Point[],
    map: maplibregl.Map
  ): number => {
    const threshold = 30; // pixels - increased for easier selection
    const point = map.project(lngLat);

    let nearestIndex = -1;
    let nearestDistance = Infinity;

    mapPoints.forEach((p, idx) => {
      const pointPixel = map.project([p.lng, p.lat]);
      const distance = Math.sqrt(
        Math.pow(point.x - pointPixel.x, 2) +
          Math.pow(point.y - pointPixel.y, 2)
      );

      if (distance < threshold && distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = idx;
      }
    });

    return nearestIndex;
  };

  // Track Ctrl key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap Contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center:
        localPoints.length > 0
          ? [localPoints[0].lng, localPoints[0].lat]
          : [-122.4194, 37.7749],
      zoom: 13,
    });

    mapRef.current = map;

    map.on("load", () => {
      updateMapLayers(map, localPoints);
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map layers when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateMapLayers(map, localPoints);
  }, [localPoints]);

  // Handle map clicks based on edit mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (editMode === "add") {
        const newPoint = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        setLocalPoints([...localPoints, newPoint]);
      } else if (editMode === "delete") {
        // Find nearest point and remove it
        const clickedPoint = findNearestPoint(e.lngLat, localPoints, map);
        if (clickedPoint !== -1) {
          const newPoints = localPoints.filter(
            (_, idx) => idx !== clickedPoint
          );
          setLocalPoints(newPoints);
        }
      }
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [editMode, localPoints]);

  // Handle point dragging in move mode with Ctrl key - using DOM events
  useEffect(() => {
    const map = mapRef.current;
    if (!map || editMode !== "move") return;

    const canvas = map.getCanvas();
    let draggedPointIndex: number | null = null;
    let isDragging = false;

    const handleMouseDown = (e: MouseEvent) => {
      // Only drag if Ctrl/Cmd is pressed
      if (!e.ctrlKey && !e.metaKey) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const lngLat = map.unproject([x, y]);

      // Use functional update to get current points without dependency
      setLocalPoints((currentPoints) => {
        const pointIndex = findNearestPoint(lngLat, currentPoints, map);
        if (pointIndex !== -1) {
          draggedPointIndex = pointIndex;
          isDragging = true;

          // Completely disable all map interactions
          map.dragPan.disable();
          map.scrollZoom.disable();
          map.boxZoom.disable();
          map.dragRotate.disable();
          map.keyboard.disable();
          map.doubleClickZoom.disable();
          map.touchZoomRotate.disable();

          canvas.style.cursor = "grabbing";
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return currentPoints; // Don't update state here
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && draggedPointIndex !== null) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const lngLat = map.unproject([x, y]);

        // Use functional update to avoid dependency on localPoints
        setLocalPoints((currentPoints) => {
          const newPoints = [...currentPoints];
          newPoints[draggedPointIndex!] = { lat: lngLat.lat, lng: lngLat.lng };
          return newPoints;
        });
      } else {
        // Show pointer cursor when near a point AND Ctrl is pressed
        if (e.ctrlKey || e.metaKey) {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const lngLat = map.unproject([x, y]);

          // Use functional update to check points
          setLocalPoints((currentPoints) => {
            const pointIndex = findNearestPoint(lngLat, currentPoints, map);
            canvas.style.cursor = pointIndex !== -1 ? "grab" : "crosshair";
            return currentPoints; // Don't update state
          });
        } else {
          canvas.style.cursor = "default";
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        draggedPointIndex = null;
        isDragging = false;

        // Re-enable all map interactions
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.dragRotate.enable();
        map.keyboard.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable();

        canvas.style.cursor = "default";
      }
    };

    const handleMouseLeave = () => {
      if (isDragging) {
        draggedPointIndex = null;
        isDragging = false;

        // Re-enable all map interactions
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.dragRotate.enable();
        map.keyboard.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable();

        canvas.style.cursor = "default";
      }
    };

    // Use capture phase to intercept events before MapLibre
    canvas.addEventListener("mousedown", handleMouseDown, true);
    canvas.addEventListener("mousemove", handleMouseMove, true);
    canvas.addEventListener("mouseup", handleMouseUp, true);
    canvas.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown, true);
      canvas.removeEventListener("mousemove", handleMouseMove, true);
      canvas.removeEventListener("mouseup", handleMouseUp, true);
      canvas.removeEventListener("mouseleave", handleMouseLeave, true);

      // Ensure all interactions are re-enabled on cleanup
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.dragRotate.enable();
      map.keyboard.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
    };
  }, [editMode]); // Removed localPoints from dependency array

  // Handle move all mode with Ctrl key - using DOM events
  useEffect(() => {
    const map = mapRef.current;
    if (!map || editMode !== "moveAll") return;

    const canvas = map.getCanvas();
    let isDragging = false;
    let startLngLat: maplibregl.LngLat | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      // Only drag if Ctrl/Cmd is pressed
      if (!e.ctrlKey && !e.metaKey) return;

      isDragging = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      startLngLat = map.unproject([x, y]);

      // Completely disable all map interactions
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.dragRotate.disable();
      map.keyboard.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();

      canvas.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && startLngLat) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const currentLngLat = map.unproject([x, y]);

        const deltaLat = currentLngLat.lat - startLngLat.lat;
        const deltaLng = currentLngLat.lng - startLngLat.lng;

        // Use functional update to avoid dependency on localPoints
        setLocalPoints((currentPoints) => {
          const newPoints = currentPoints.map((p) => ({
            lat: p.lat + deltaLat,
            lng: p.lng + deltaLng,
          }));
          return newPoints;
        });

        startLngLat = currentLngLat;
      } else {
        // Show appropriate cursor based on Ctrl key state
        if (e.ctrlKey || e.metaKey) {
          canvas.style.cursor = "grab";
        } else {
          canvas.style.cursor = "default";
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        isDragging = false;
        startLngLat = null;

        // Re-enable all map interactions
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.dragRotate.enable();
        map.keyboard.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable();

        canvas.style.cursor = "default";
      }
    };

    const handleMouseLeave = () => {
      if (isDragging) {
        isDragging = false;
        startLngLat = null;

        // Re-enable all map interactions
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.dragRotate.enable();
        map.keyboard.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable();

        canvas.style.cursor = "default";
      }
    };

    // Use capture phase to intercept events before MapLibre
    canvas.addEventListener("mousedown", handleMouseDown, true);
    canvas.addEventListener("mousemove", handleMouseMove, true);
    canvas.addEventListener("mouseup", handleMouseUp, true);
    canvas.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown, true);
      canvas.removeEventListener("mousemove", handleMouseMove, true);
      canvas.removeEventListener("mouseup", handleMouseUp, true);
      canvas.removeEventListener("mouseleave", handleMouseLeave, true);

      // Ensure all interactions are re-enabled on cleanup
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.dragRotate.enable();
      map.keyboard.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();

      canvas.style.cursor = "default";
    };
  }, [editMode]); // Removed localPoints from dependency array

  const handleSave = () => {
    onChange(localPoints);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[90vw] max-w-6xl h-[80vh] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] shadow-[var(--shadow-lg)] flex flex-col">
        {/* Header */}
        <div className="border-b border-[color:var(--border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
              Edit Geofence Shape
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--text-secondary)]">
                {localPoints.length} points
              </span>
            </div>
          </div>

          {/* Edit Mode Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode("move")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                editMode === "move"
                  ? "bg-[color:var(--accent-primary)] text-white"
                  : "bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)]"
              }`}
            >
              Move Points
            </button>
            <button
              onClick={() => setEditMode("moveAll")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                editMode === "moveAll"
                  ? "bg-[color:var(--accent-primary)] text-white"
                  : "bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)]"
              }`}
            >
              Move All
            </button>
            <button
              onClick={() => setEditMode("add")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                editMode === "add"
                  ? "bg-[color:var(--accent-success)] text-white"
                  : "bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)]"
              }`}
            >
              Add Points
            </button>
            <button
              onClick={() => setEditMode("delete")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                editMode === "delete"
                  ? "bg-[color:var(--accent-danger)] text-white"
                  : "bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)]"
              }`}
            >
              Delete Points
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-3 p-2 bg-[color:var(--surface)] rounded-lg">
            <p className="text-xs text-[color:var(--text-secondary)]">
              {editMode === "move" && (
                <>
                  <span className="font-semibold">Hold Ctrl</span> (or Cmd on
                  Mac) and click/drag points to reposition them. Pan the map
                  normally without Ctrl.
                </>
              )}
              {editMode === "moveAll" && (
                <>
                  <span className="font-semibold">Hold Ctrl</span> (or Cmd on
                  Mac) and drag anywhere to move the entire geofence. Pan the
                  map normally without Ctrl.
                </>
              )}
              {editMode === "add" &&
                "Click on the map to add new points to the polygon"}
              {editMode === "delete" &&
                "Click on a point to remove it from the polygon"}
            </p>
            {(editMode === "move" || editMode === "moveAll") && (
              <div className="mt-2 flex items-center gap-2">
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    isCtrlPressed
                      ? "bg-green-500/20 text-green-600 border border-green-500/30"
                      : "bg-gray-500/20 text-gray-600 border border-gray-500/30"
                  }`}
                >
                  {isCtrlPressed
                    ? "✓ Ctrl Active - Ready to drag"
                    : "⊗ Ctrl Not Pressed"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="flex-1 relative" />

        {/* Footer */}
        <div className="border-t border-[color:var(--border)] p-4 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-[color:var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--accent-hover)] transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
