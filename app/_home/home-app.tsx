"use client";

import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import { useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
          <div
            role="status"
            aria-busy="true"
            className="paper grid justify-items-center gap-3 rounded-[28px] border-2 border-dashed border-paper-line px-4 py-10 text-center font-cute"
          >
            <span aria-hidden className="text-[54px] leading-none motion-safe:animate-spin-slow">☯</span>
            <p className="font-extrabold">꼬마 명식을 세우는 중이에요</p>
            <p className="text-[13px] text-ink-soft">생일이랑 동네 하늘, 오늘 회의 기운을 맞춰 보고 있어요.</p>
          </div>
        )}
        {state.status === "success" && (
          <ForecastSession
            key={state.key}
            session={state.session}
            birthday={(lastInput ?? initialInput).birthday || undefined}
          />
        )}
        {state.status === "error" && (
          <Alert className="paper bg-paper after:hidden grid justify-items-center gap-2.5 rounded-[28px] border-2 border-dashed border-paper-line px-4 py-8 text-center font-cute *:data-[slot=alert-description]:text-ink-soft">
            <span aria-hidden className="text-5xl leading-none">🌫</span>
            <AlertTitle className="font-extrabold">명식을 세우지 못했어요</AlertTitle>
            <AlertDescription className="flex flex-col items-center gap-3 text-[13px]">
              <span>기상 관측소와 연결이 잠시 끊겼어요. 잠시 후 다시 시도해 주세요.</span>
              <Button
                variant="outline"
                className="h-11 w-full max-w-60 rounded-full border-[1.5px] border-hot-line bg-white font-extrabold tracking-normal normal-case text-ink"
                onClick={() => lastInput && requestForecast(lastInput)}
              >
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}

/** "명식 다시 세우기": the form sits above the card on this page, so take the user back to it. */
function rebuild() {
  const form = document.getElementById("forecast-form");
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("birthday")?.focus({ preventScroll: true });
}

function ForecastSession({ session, birthday }: { session: HomeSession; birthday?: string }) {
  const { forecast, forecastId, recallPending } = session;
  const extraBody = (history: ChatMessage[]) => ({
    forecastId,
    recall: recallPending && !history.some((message) => message.role === "user"),
  });

  return (
    <>
      <ForecastCard forecast={forecast} birthday={birthday} onRebuild={rebuild} />
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
