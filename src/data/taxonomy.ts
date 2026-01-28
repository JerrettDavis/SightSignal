export type Category = {
  id: string;
  label: string;
};

export type SightingType = {
  id: string;
  label: string;
  categoryId: string;
};

// Make arrays mutable so they can be edited through the admin API
export const categories: Category[] = [
  { id: "cat-nature", label: "Nature" },
  { id: "cat-public-safety", label: "Public Safety" },
  { id: "cat-community", label: "Community" },
  { id: "cat-hazards", label: "Hazards" },
  { id: "cat-infrastructure", label: "Infrastructure" },
  { id: "cat-events", label: "Events" },
];

export const sightingTypes: SightingType[] = [
  { id: "type-birds", label: "Birds", categoryId: "cat-nature" },
  { id: "type-wildlife", label: "Wildlife", categoryId: "cat-nature" },
  { id: "type-roadwork", label: "Construction", categoryId: "cat-hazards" },
  {
    id: "type-road-hazards",
    label: "Road Hazards",
    categoryId: "cat-public-safety",
  },
  { id: "type-events", label: "Community Events", categoryId: "cat-community" },
  { id: "type-geocache", label: "Geocache", categoryId: "cat-community" },
  {
    id: "type-public-safety",
    label: "Safety Alert",
    categoryId: "cat-public-safety",
  },
];

export const categoryLabelById = (id: string) =>
  categories.find((category) => category.id === id)?.label ?? id;

export const typeLabelById = (id: string) =>
  sightingTypes.find((type) => type.id === id)?.label ?? id;
