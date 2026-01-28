export type Reaction = {
  label: string;
  count: number;
};

export type SightingCard = {
  id: string;
  title: string;
  category: string;
  type: string;
  description: string;
  importance: "low" | "normal" | "high" | "critical";
  status: "active" | "resolved";
  observedAtLabel: string;
  location: {
    lat: number;
    lng: number;
  };
  reactions: Reaction[];
  score?: number;
  hotScore?: number;
};

export const mockSightings: SightingCard[] = [
  {
    id: "sighting-001",
    title: "Blue heron by the inlet",
    category: "Nature",
    type: "Birds",
    description: "Spotted near the reeds just north of the footbridge.",
    importance: "low",
    status: "active",
    observedAtLabel: "15 min ago",
    location: { lat: 37.8066, lng: -122.4066 },
    reactions: [
      { label: "Heart", count: 12 },
      { label: "Wow", count: 3 },
    ],
  },
  {
    id: "sighting-002",
    title: "Construction detour",
    category: "Hazards",
    type: "Roadwork",
    description: "Two lanes closed. Expect slow traffic until evening.",
    importance: "high",
    status: "active",
    observedAtLabel: "30 min ago",
    location: { lat: 37.8037, lng: -122.4112 },
    reactions: [
      { label: "Thumbs", count: 24 },
      { label: "Alert", count: 6 },
    ],
  },
  {
    id: "sighting-003",
    title: "Pop-up jazz set",
    category: "Community",
    type: "Events",
    description: "Small quartet set on the pier. Ends at sunset.",
    importance: "normal",
    status: "active",
    observedAtLabel: "1 hr ago",
    location: { lat: 37.8089, lng: -122.4158 },
    reactions: [
      { label: "Heart", count: 40 },
      { label: "Clap", count: 18 },
    ],
  },
  {
    id: "sighting-004",
    title: "Pothole near 4th St",
    category: "Public Safety",
    type: "Road Hazards",
    description: "Deep pothole just before the intersection. Use caution.",
    importance: "high",
    status: "active",
    observedAtLabel: "2 hr ago",
    location: { lat: 37.8001, lng: -122.4091 },
    reactions: [
      { label: "Alert", count: 9 },
      { label: "Sad", count: 4 },
    ],
  },
  {
    id: "sighting-005",
    title: "Geocache refreshed",
    category: "Community",
    type: "Geocache",
    description: "New container placed with updated hints.",
    importance: "normal",
    status: "resolved",
    observedAtLabel: "Yesterday",
    location: { lat: 37.8124, lng: -122.4035 },
    reactions: [
      { label: "Thumbs", count: 7 },
      { label: "Heart", count: 5 },
    ],
  },
];
