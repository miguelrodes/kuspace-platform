import { z } from "zod";

export const authActorRoleSchema = z.object({
  role: z.enum(["consumer", "recruiter"]),
});

export type AuthActorRoleInput = z.infer<typeof authActorRoleSchema>;
