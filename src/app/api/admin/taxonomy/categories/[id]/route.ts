import { requireAuth } from "@/shared/auth-helpers";
import { categories, sightingTypes } from "@/data/taxonomy";
import { jsonOk, jsonBadRequest, jsonNotFound } from "@/shared/http";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateCategorySchema = z.object({
  label: z.string().min(1, "Label is required"),
});

export const PUT = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireAuth();

  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonBadRequest({ message: "Invalid JSON payload." });
  }

  const parsed = UpdateCategorySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest({
      message: "Invalid payload.",
      details: parsed.error.flatten(),
    });
  }

  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) {
    return jsonNotFound("Category not found.");
  }

  // Update the category
  categories[index] = { id, label: parsed.data.label };

  return jsonOk({ data: categories[index] });
};

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireAuth();

  const { id } = await params;

  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) {
    return jsonNotFound("Category not found.");
  }

  // Check if any types use this category
  const typesUsingCategory = sightingTypes.filter((t) => t.categoryId === id);
  if (typesUsingCategory.length > 0) {
    return jsonBadRequest({
      message: `Cannot delete category: ${typesUsingCategory.length} type(s) are using it.`,
    });
  }

  // Remove the category
  categories.splice(index, 1);

  return jsonOk({ success: true });
};
