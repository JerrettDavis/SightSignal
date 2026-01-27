import { err, ok, type DomainError, type Result } from "@/shared/result";

export type CategoryId = string & { readonly __brand: "CategoryId" };
export type SubcategoryId = string & { readonly __brand: "SubcategoryId" };
export type SightingTypeId = string & { readonly __brand: "SightingTypeId" };

export type Category = {
  id: CategoryId;
  label: string;
  icon?: string;
  description: string;
};

export type Subcategory = {
  id: SubcategoryId;
  label: string;
  categoryId: CategoryId;
  description?: string;
};

export type SightingType = {
  id: SightingTypeId;
  label: string;
  categoryId: CategoryId;
  subcategoryId?: SubcategoryId;
  tags: string[];
  icon?: string;
};

export type TaxonomyFilters = {
  categoryId?: CategoryId;
  subcategoryId?: SubcategoryId;
  tags?: string[];
};

// Validation functions
export const validateCategoryId = (
  id: string
): Result<CategoryId, DomainError> => {
  if (!id || id.trim().length === 0) {
    return err({
      code: "taxonomy.invalid_category_id",
      message: "Category ID is required",
      field: "categoryId",
    });
  }

  return ok(id as CategoryId);
};

export const validateSubcategoryId = (
  id: string
): Result<SubcategoryId, DomainError> => {
  if (!id || id.trim().length === 0) {
    return err({
      code: "taxonomy.invalid_subcategory_id",
      message: "Subcategory ID is required",
      field: "subcategoryId",
    });
  }

  return ok(id as SubcategoryId);
};

export const validateSightingTypeId = (
  id: string
): Result<SightingTypeId, DomainError> => {
  if (!id || id.trim().length === 0) {
    return err({
      code: "taxonomy.invalid_type_id",
      message: "Sighting type ID is required",
      field: "typeId",
    });
  }

  return ok(id as SightingTypeId);
};

// Helper functions
export const filterTypesByCategory = (
  types: SightingType[],
  categoryId: CategoryId
): SightingType[] => {
  return types.filter((type) => type.categoryId === categoryId);
};

export const filterTypesBySubcategory = (
  types: SightingType[],
  subcategoryId: SubcategoryId
): SightingType[] => {
  return types.filter((type) => type.subcategoryId === subcategoryId);
};

export const filterTypesByTags = (
  types: SightingType[],
  tags: string[]
): SightingType[] => {
  return types.filter((type) => tags.some((tag) => type.tags.includes(tag)));
};

export const filterSubcategoriesByCategory = (
  subcategories: Subcategory[],
  categoryId: CategoryId
): Subcategory[] => {
  return subcategories.filter((sub) => sub.categoryId === categoryId);
};

// Get all unique tags from types
export const extractAllTags = (types: SightingType[]): string[] => {
  const tagSet = new Set<string>();
  types.forEach((type) => {
    type.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
};

// Find category by ID
export const findCategoryById = (
  categories: Category[],
  id: CategoryId
): Category | null => {
  return categories.find((cat) => cat.id === id) || null;
};

// Find subcategory by ID
export const findSubcategoryById = (
  subcategories: Subcategory[],
  id: SubcategoryId
): Subcategory | null => {
  return subcategories.find((sub) => sub.id === id) || null;
};

// Find type by ID
export const findTypeById = (
  types: SightingType[],
  id: SightingTypeId
): SightingType | null => {
  return types.find((type) => type.id === id) || null;
};
