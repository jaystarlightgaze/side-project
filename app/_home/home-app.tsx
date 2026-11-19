"use client";

import { ChatCircleDotsIcon, WarningIcon } from "@phosphor-icons/react";
import { useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatPanel, type ChatMessage } from "@/features/chat";
import {
  describeForecastForChat,
  EMPTY_INPUT,
  ForecastCard,
  ForecastForm,
  parseSavedInput,
  saveInput,
  shouldSuggestChat,
  STORAGE_KEY,
  type ForecastInput,
} from "@/features/forecast";

import type { HomeSession } from "./session";

/** What a signed-in user's account already holds. null means signed out. */
export type AccountState = { input: ForecastInput | null; today: HomeSession | null } | null;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; session: HomeSession; key: number }
  | { status: "error" };

const subscribe = () => () => {};

export function HomeApp({ account = null }: { account?: AccountState }) {
  // undefined on the server, string | null in the browser.
  const saved = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => undefined,
  );
  const [state, setState] = useState<State>(
    account?.today ? { status: "success", session: account.today, key: 0 } : { status: "idle" },
  );
  const [lastInput, setLastInput] = useState<ForecastInput | null>(null);

  async function requestForecast(input: ForecastInput) {
    // Signed-in users keep their input in the account, not in this browser.
    if (!account) saveInput(input);
    setLastInput(input);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`forecast ${res.status}`);
      setState({ status: "success", session: await res.json(), key: Date.now() });
    } catch {
      setState({ status: "error" });
    }
  }

  const initialInput = account ? (account.input ?? EMPTY_INPUT) : saved == null ? EMPTY_INPUT : parseSavedInput(saved);

  return (
    <div className="flex flex-col gap-10">
      {!account && saved === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ForecastForm initialInput={initialInput} pending={state.status === "loading"} onSubmit={requestForecast} />
      )}

      <section aria-live="polite" className="flex flex-col gap-6">
        {state.status === "loading" && (
          <Card aria-busy="true">
            <CardHeader>
              <p className="text-sm font-medium">예보관이 오늘의 직장 기상을 분석하고 있습니다…</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        )}
        {state.status === "success" && <ForecastSession key={state.key} session={state.session} />}
        {state.status === "error" && (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertTitle>예보를 받지 못했습니다</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>기상 관측소와 연결이 잠시 끊겼어요. 잠시 후 다시 시도해 주세요.</span>
              <Button variant="outline" onClick={() => lastInput && requestForecast(lastInput)}>
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}

function ForecastSession({ session }: { session: HomeSession }) {
  const { forecast, forecastId, recallPending } = session;
  const extraBody = (history: ChatMessage[]) => ({
    forecastId,
    recall: recallPending && !history.some((message) => message.role === "user"),
  });

  return (
    <>
      <ForecastCard forecast={forecast} />
      {shouldSuggestChat(forecast) && (
        <p data-testid="chat-suggestion" className="flex items-center gap-2 text-sm font-medium">
          <ChatCircleDotsIcon className="size-5 shrink-0" aria-hidden />
          오늘은 예보관과 얘기해 보세요. 마음 쓰이는 일이 있으면 아래에 물어보세요.
        </p>
      )}
      <ChatPanel
        context={describeForecastForChat(forecast)}
        initialMessages={session.messages}
        extraBody={extraBody}
      />
    </>
  );
}
