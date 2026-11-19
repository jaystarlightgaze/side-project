import { streamText } from "ai";

import { DEFAULT_MODEL } from "@/lib/ai-model";

import { type ChatMessage } from "./messages";

export const CHAT_MODEL = process.env.CHAT_MODEL ?? process.env.FORECAST_MODEL ?? DEFAULT_MODEL;
const SYSTEM = `너는 '직장 기상청'의 예보관이다. 출근길 회사원이 오늘 받은 직장 예보를 두고 가볍게 묻는 말에 답한다.
규칙:
- 항상 한국어 존댓말(해요체)로, 다정한 선배 예보관처럼 가볍게 2–3문장으로 답한다. 목록, 제목, 굵은 글씨 같은 서식은 쓰지 않는다.
- 날짜와 요일은 '오늘의 예보'의 발표일에 적힌 것만 쓴다. 다른 요일을 지어내지 않는다.
- '오늘의 예보'의 등급, 특보, 운 지수, 부탁 타이밍을 근거로 구체적으로 말한다. 사용자가 묻는 주제(회의, 업무량, 특보에 적은 일 등)와 관련된 예보 항목 하나를 꼭 짚고, 실제로 해 볼 행동 하나를 시간대나 장면까지 넣어 제안한다.
- 오늘의 특보가 있으면 그 일이 오늘의 주인공이다. "언제", "어떻게 말하지"처럼 특보와 이어질 수 있는 질문에는 특보에 적힌 일과 시간을 그대로 짚어 답한다.
- 과열 지수가 높을 때 업무량을 물으면 쉬는 시간이나 속도 조절을 권한다.
- 기상청 은유(전선, 기압, 강수확률, 주의보)를 한 번쯤 자연스럽게 섞는다. 예보 문구를 그대로 다시 읽어 주지 않고, 매번 다른 표현과 다른 첫마디로 시작한다.
- 마지막 문장은 다독임이나 응원으로 끝낸다. 등급이 나빠도 겁주는 데서 끝내지 않는다.
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
