import type { Result } from "@/shared/result";
import { ok } from "@/shared/result";
import type { TaxonomyRepository } from "@/ports/taxonomy-repository";
import type {
  Category,
  Subcategory,
  SightingType,
} from "@/domain/taxonomy/taxonomy";

export type TaxonomyData = {
  categories: Category[];
  subcategories: Subcategory[];
  types: SightingType[];
  tags: string[];
};

export type GetTaxonomy = () => Promise<Result<TaxonomyData, never>>;

type Dependencies = {
  repository: TaxonomyRepository;
};

export const buildGetTaxonomy = ({ repository }: Dependencies): GetTaxonomy => {
  return async () => {
    const [categories, subcategories, types, tags] = await Promise.all([
      repository.getCategories(),
      repository.getSubcategories(),
      repository.getTypes(),
      repository.getAllTags(),
    ]);

    return ok({
      categories,
      subcategories,
      types,
      tags,
    });
  };
};
