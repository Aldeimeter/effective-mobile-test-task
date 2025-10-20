import { z } from "zod";

export const getUserByIdSchema = z.object({
  id: z.string().uuid("Invalid user ID format"),
});

export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;

export const blockUserSchema = z.object({
  id: z.string().uuid("Invalid user ID format"),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;
