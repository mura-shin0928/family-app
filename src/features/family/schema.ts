import { z } from "zod";

export const memberIdSchema = z.object({
  memberId: z.string().uuid(),
});

export const deleteFamilySchema = z.object({
  confirmName: z.string().trim().min(1).max(200),
});
