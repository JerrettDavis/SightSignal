import { z } from "zod";
import { LatLngSchema } from "@/contracts/geo";

export const SightingImportanceSchema = z.enum([
  "low",
  "normal",
  "high",
  "critical",
]);
export const SightingStatusSchema = z.enum(["active", "resolved"]);

export const CustomFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const CreateSightingRequestSchema = z.object({
  typeId: z.string().min(1),
  categoryId: z.string().min(1),
  location: LatLngSchema,
  description: z.string().min(1).max(1000),
  details: z.string().max(2000).optional(),
  importance: SightingImportanceSchema.optional(),
  observedAt: z.string().datetime(),
  fields: z.record(z.string(), CustomFieldValueSchema).optional(),
  reporterId: z.string().optional(),
});

export const UpdateSightingRequestSchema = z.object({
  typeId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  location: LatLngSchema.optional(),
  description: z.string().min(1).max(1000).optional(),
  details: z.string().max(2000).optional(),
  importance: SightingImportanceSchema.optional(),
  status: SightingStatusSchema.optional(),
  observedAt: z.string().datetime().optional(),
  fields: z.record(z.string(), CustomFieldValueSchema).optional(),
  reporterId: z.string().optional(),
});

export const SightingSchema = CreateSightingRequestSchema.extend({
  id: z.string(),
  status: SightingStatusSchema,
  createdAt: z.string().datetime(),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
  confirmations: z.number().default(0),
  disputes: z.number().default(0),
  spamReports: z.number().default(0),
  score: z.number().default(0),
  hotScore: z.number().default(0),
});

export type CreateSightingRequest = z.infer<typeof CreateSightingRequestSchema>;
export type SightingResponse = z.infer<typeof SightingSchema>;
