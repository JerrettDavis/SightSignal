import { requireAuth } from "@/shared/auth-helpers";
import { sightingTypes, categories } from "@/data/taxonomy";
import { jsonOk, jsonBadRequest, jsonNotFound } from "@/shared/http";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateTypeSchema = z.object({
  label: z.string().min(1, "Label is required"),
  categoryId: z.string().min(1, "Category is required"),
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

  const parsed = UpdateTypeSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest({
      message: "Invalid payload.",
      details: parsed.error.flatten(),
    });
  }

  const index = sightingTypes.findIndex((t) => t.id === id);
  if (index === -1) {
    return jsonNotFound("Type not found.");
  }

  // Check if category exists
  if (!categories.some((c) => c.id === parsed.data.categoryId)) {
    return jsonBadRequest({
      message: "Category does not exist.",
    });
  }

  // Update the type
  sightingTypes[index] = {
    id,
    label: parsed.data.label,
    categoryId: parsed.data.categoryId,
  };

  return jsonOk({ data: sightingTypes[index] });
};

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireAuth();

  const { id } = await params;

  const index = sightingTypes.findIndex((t) => t.id === id);
  if (index === -1) {
    return jsonNotFound("Type not found.");
  }

  // Remove the type
  sightingTypes.splice(index, 1);

  return jsonOk({ success: true });
};
