import { streamText } from "ai";

import { type ChatMessage } from "./messages";


export const CHAT_MODEL = process.env.CHAT_MODEL ?? process.env.FORECAST_MODEL ?? "google/gemini-2.5-flash-lite";
const SYSTEM = `너는 '직장 기상청'의 예보관이다. 회사원이 오늘 받은 직장 예보를 바탕으로 처신을 상담해 준다.
규칙:
- 항상 한국어로, 기상청 예보관 말투를 살짝 섞어 3–5문장 안으로 답한다.
- 아래 '오늘의 예보'의 등급, 문구, 특보, 운 지수를 근거로 구체적으로 조언한다. 사용자가 묻는 주제(회의, 업무량, 특보에 적은 일 등)와 관련된 예보 항목을 꼭 짚는다.
- 등급이 나빠도 대안이나 다독임으로 끝낸다.
- 사용자가 예보가 빗나갔다거나 하루가 힘들었다고 하면 변명하거나 사용자를 탓하지 않는다. 먼저 다독이고, 그다음 오늘 할 수 있는 행동을 하나 제안한다.
- 재미로 보는 예보의 캐릭터다. 실제 예언이나 심리·법률·의료 전문 상담인 척하지 않는다. 그런 도움이 필요해 보이면 전문가를 찾아보라고 부드럽게 권한다.`;

const RECALL_HINT = `지금 사용자는 예보관이 먼저 물어본 지난 예보의 실제 결과를 털어놓고 있다. 고맙다고 하고 먼저 다독인 뒤, 그 경험을 오늘 예보와 이어서 한 가지 제안을 한다.`;

type ReplyOptions = {
  context: string;
  messages: ChatMessage[];
  recallAnswer?: boolean;
  /** Called once with the full reply when the stream finished without error. */
  onComplete?: (text: string) => Promise<void> | void;
};

/**
 * Streams the forecaster's reply as UTF-8 text.
 * Resolves to null when the model fails before producing any text, so the caller can answer with an error status.
 */
export async function streamForecasterReply({
  context,
  messages,
  recallAnswer = false,
  onComplete,
}: ReplyOptions): Promise<ReadableStream<Uint8Array> | null> {
  let failed = false;
  const result = streamText({
    model: CHAT_MODEL,
    system: [SYSTEM, `오늘의 예보:\n${context}`, recallAnswer ? RECALL_HINT : ""].filter(Boolean).join("\n\n"),
    messages: messages.slice(-20),
    abortSignal: AbortSignal.timeout(30_000),
    onError({ error }) {
      failed = true;
      console.error("[chat] model failed", error);
    },
  });

  const iterator = result.textStream[Symbol.asyncIterator]();
  let first: IteratorResult<string>;
  try {
    do first = await iterator.next();
    while (!first.done && first.value === "");
  } catch (error) {
    console.error("[chat] model failed", error);
    return null;
  }
  if (first.done || failed) return null;

  const encoder = new TextEncoder();
  let text = first.value;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first.value as string));
    },
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) {
          if (failed) return controller.error(new Error("model stream failed"));
          await Promise.resolve(onComplete?.(text)).catch((error) => console.error("[chat] save failed", error));
          controller.close();
          return;
        }
        text += next.value;
        controller.enqueue(encoder.encode(next.value));
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      void iterator.return?.();
    },
  });
}
