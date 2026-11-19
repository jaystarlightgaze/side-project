"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { MAX_QUESTION_LENGTH, type ChatMessage } from "./messages";

type Props = {
  /** Plain-text forecast the forecaster answers from. */
  context: string;
  initialMessages?: ChatMessage[];
  /** Extra fields sent with each request, computed from the history before the new question. */
  extraBody?: (history: ChatMessage[]) => Record<string, unknown>;
  /** Called with every change, including answers that keep streaming after the panel is gone. */
  onMessagesChange?: (messages: ChatMessage[]) => void;
  className?: string;
};

export function ChatPanel({ context, initialMessages = [], extraBody, onMessagesChange, className }: Props) {
  const [messages, setOwnMessages] = useState<ChatMessage[]>(initialMessages);
  const setMessages = (next: ChatMessage[]) => {
    setOwnMessages(next);
    onMessagesChange?.(next);
  };
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(history: ChatMessage[], question: ChatMessage) {
    const withQuestion = [...history, question];
    setMessages(withQuestion);
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, messages: withQuestion, ...extraBody?.(history) }),
      });
      if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += value;
        setMessages([...withQuestion, { role: "assistant", content: answer }]);
      }
      if (answer.trim() === "") throw new Error("empty reply");
    } catch {
      setMessages(withQuestion);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (pending || content === "") return;
    setDraft("");
    void send(messages, { role: "user", content });
  }

  function retry() {
    const question = messages.at(-1);
    if (pending || question?.role !== "user") return;
    void send(messages.slice(0, -1), question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const waitingForFirstToken = pending && messages.at(-1)?.role === "user";

  return (
    <Card
      aria-label="예보관에게 묻기"
      className={cn("paper break-keep rounded-[28px] border-2 border-dashed border-paper-line font-cute ring-0", className)}
    >
      <CardHeader>
        <CardTitle className="text-xl normal-case">예보관에게 묻기</CardTitle>
        <CardDescription className="text-[13px] text-ink-soft">오늘 예보를 바탕으로 처신을 물어보세요.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {messages.length > 0 && (
          <ol aria-live="polite" className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <li
                key={index}
                data-role={message.role}
                className={cn(
                  "max-w-[85%] rounded-[18px] border-[1.5px] px-3.5 py-2.5 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]",
                  message.role === "user"
                    ? "self-end rounded-br-md border-hot-line bg-fire text-ink"
                    : "self-start rounded-bl-md border-charm-line/60 bg-verdict text-ink",
                )}
              >
                <span className="sr-only">{message.role === "user" ? "나: " : "예보관: "}</span>
                {message.content}
              </li>
            ))}
            {waitingForFirstToken && (
              <li className="self-start rounded-[18px] rounded-bl-md border-[1.5px] border-dashed border-charm-line/60 bg-verdict px-3.5 py-2.5 text-sm text-ink-soft">
                예보관이 답을 쓰는 중…
              </li>
            )}
          </ol>
        )}

        {failed && (
          <Alert className="paper bg-paper after:hidden rounded-[22px] border-2 border-dashed border-paper-line *:data-[slot=alert-description]:text-ink-soft">
            <WarningIcon className="text-hot" />
            <AlertTitle className="font-extrabold text-ink">예보관의 답을 받지 못했습니다</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>통신이 잠시 끊겼거나 질문이 몰렸어요. 잠시 후 다시 보내 주세요.</span>
              <Button
                variant="outline"
                className="h-10 rounded-full border-[1.5px] border-hot-line bg-white px-4 font-extrabold tracking-normal normal-case text-ink"
                onClick={retry}
                disabled={pending}
              >
                다시 보내기
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="chat-question" className="sr-only">
              예보관에게 할 질문
            </FieldLabel>
            <Textarea
              id="chat-question"
              className="min-h-16 rounded-[14px] border-[1.5px] border-hot-line bg-white px-3.5 py-2.5 focus-visible:border-hot"
              value={draft}
              maxLength={MAX_QUESTION_LENGTH}
              rows={2}
              placeholder="예: 오늘 회의 어떻게 버티지?"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <FieldDescription className="text-right text-xs text-ink-soft">
              {draft.length}/{MAX_QUESTION_LENGTH}
            </FieldDescription>
          </Field>
          <Button type="submit" disabled={pending || draft.trim() === ""} className="h-11 self-end rounded-full px-6 font-extrabold tracking-normal normal-case">
            {pending ? "답을 기다리는 중…" : "보내기"}
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <p className="text-xs text-ink-soft">재미로 보는 예보입니다. 실제 예언이나 전문 상담이 아니에요.</p>
      </CardFooter>
    </Card>
  );
}
