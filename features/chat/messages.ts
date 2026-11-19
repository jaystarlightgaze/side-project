import { z } from "zod";

export const MAX_QUESTION_LENGTH = 500;

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Messages must end with a non-empty user question of at most 500 characters. */
export const chatMessagesSchema = z
  .array(chatMessageSchema)
  .min(1)
  .max(60)
  .refine((messages) => {
    const last = messages.at(-1)!;
    return last.role === "user" && last.content.trim() !== "" && last.content.length <= MAX_QUESTION_LENGTH;
  });
