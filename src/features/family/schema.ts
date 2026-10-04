import { z } from "zod";

export const memberIdSchema = z.object({
  memberId: z.string().uuid(),
});
