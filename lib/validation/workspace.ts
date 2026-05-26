import { z } from "zod";

export const organizationTypeSchema = z.enum(["nightclub", "label", "independent_organizer"]);

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  type: organizationTypeSchema,
  locationDisplayText: z.string().trim().optional(),
});

export const createOrganizationFormSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  type: organizationTypeSchema,
  locationDisplayText: z.string().trim().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  type: organizationTypeSchema,
  locationDisplayText: z.string().trim().optional(),
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().trim().min(1),
});

export const createOrganizationStripeAccountSchema = z.object({
  country: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z]{2}$/.test(value), {
      message: "Country must be a 2-letter ISO country code.",
    })
    .optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateOrganizationStripeAccountInput = z.infer<
  typeof createOrganizationStripeAccountSchema
>;
