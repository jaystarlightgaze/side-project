import { z } from "zod";

import { chatMessagesSchema, streamForecasterReply } from "@/features/chat/server";
import { todayInSeoul } from "@/features/forecast/server";
import { saveMessages, saveRecollection } from "@/features/journal/server";
import { getSignedIn } from "@/lib/supabase/server";

const bodySchema = z.object({
  context: z.string().min(1).max(8000),
  messages: chatMessagesSchema,
  forecastId: z.uuid().nullish(),
  recall: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "질문을 다시 확인해 주세요." }, { status: 400 });
  }
  const { context, messages, forecastId, recall = false } = parsed.data;
  const auth = forecastId ? await getSignedIn() : null;
  const question = messages.at(-1)!;

  const stream = await streamForecasterReply({
    context,
    messages,
    recallAnswer: recall,
    async onComplete(answer) {
      if (!auth || !forecastId) return;
      await saveMessages(auth.supabase, forecastId, [question, { role: "assistant", content: answer }]);
      if (recall) await saveRecollection(auth.supabase, todayInSeoul(), question.content);
    },
  });
  if (!stream) {
    return Response.json({ error: "예보관이 답하지 못했습니다." }, { status: 502 });
  }
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
