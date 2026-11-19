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
};

export function ChatPanel({ context, initialMessages = [], extraBody }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
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
    <Card aria-label="예보관에게 묻기">
      <CardHeader>
        <CardTitle>예보관에게 묻기</CardTitle>
        <CardDescription>오늘 예보를 바탕으로 처신을 물어보세요.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {messages.length > 0 && (
          <ol aria-live="polite" className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <li
                key={index}
                data-role={message.role}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted",
                )}
              >
                <span className="sr-only">{message.role === "user" ? "나: " : "예보관: "}</span>
                {message.content}
              </li>
            ))}
            {waitingForFirstToken && (
              <li className="self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                예보관이 답을 쓰고 있습니다…
              </li>
            )}
          </ol>
        )}

        {failed && (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertTitle>예보관의 답을 받지 못했습니다</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>통신이 잠시 끊겼거나 질문이 몰렸어요. 잠시 후 다시 보내 주세요.</span>
              <Button variant="outline" onClick={retry} disabled={pending}>
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
              value={draft}
              maxLength={MAX_QUESTION_LENGTH}
              rows={2}
              placeholder="예: 오늘 회의 어떻게 버티지?"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <FieldDescription className="text-right text-xs">
              {draft.length}/{MAX_QUESTION_LENGTH}
            </FieldDescription>
          </Field>
          <Button type="submit" disabled={pending || draft.trim() === ""} className="self-end">
            {pending ? "답을 기다리는 중…" : "보내기"}
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <p className="text-xs text-muted-foreground">재미로 보는 예보입니다. 실제 예언이나 전문 상담이 아니에요.</p>
      </CardFooter>
    </Card>
  );
}
