import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message cannot exceed 2000 characters"),
  conversationId: z.string().optional().nullable(),
  farmId: z.string().optional().nullable(),
  language: z.string().max(10).optional().default("en"),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().min(1, "Valid conversation ID required"),
});

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
