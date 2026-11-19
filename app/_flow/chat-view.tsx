"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ChatPanel, type ChatMessage } from "@/features/chat";
import { describeForecastForChat, ForecastCard, ForecastSummary } from "@/features/forecast";

import { useForecastFlow } from "./flow";

export function ChatView() {
  const flow = useForecastFlow();
  const router = useRouter();
  const { input, state } = flow;

  useEffect(() => {
    // The chat opens only next to today's card; without one, go back a step.
    if (input === null) router.replace("/setup");
    else if (input !== undefined && state.status !== "success") router.replace("/today");
  }, [input, state.status, router]);

  if (state.status !== "success") {
    return (
      <main data-wide className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  const { session, key } = state;
  const extraBody = (history: ChatMessage[]) => ({
    forecastId: session.forecastId,
    recall: session.recallPending && !history.some((message) => message.role === "user"),
  });

  return (
    <main data-wide className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="sr-only">예보관에게 묻기</h1>
      <Link href="/today" className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← 오늘 명식
      </Link>
      <div className="grid flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="hidden lg:sticky lg:top-6 lg:block">
          <ForecastCard forecast={session.forecast} birthday={input?.birthday || undefined} variant="compact" checked={flow.checked} readOnly />
        </aside>
        <ForecastSummary
          forecast={session.forecast}
          className="lg:hidden"
          action={
            <Link href="/today" className="font-semibold underline-offset-4 hover:underline">
              펼쳐 보기
            </Link>
          }
        />
        <ChatPanel
          key={key}
          context={describeForecastForChat(session.forecast)}
          initialMessages={flow.messages}
          onMessagesChange={flow.setMessages}
          extraBody={extraBody}
          className="max-lg:min-h-[calc(100dvh-13rem)]"
        />
      </div>
    </main>
  );
}
