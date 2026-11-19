"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { ForecastResult } from "./create-forecast";
import { ForecastCard } from "./forecast-card";
import { ForecastForm } from "./forecast-form";
import type { ForecastInput } from "./rules";
import { parseSavedInput, saveInput, STORAGE_KEY } from "./storage";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; forecast: ForecastResult }
  | { status: "error" };

const subscribe = () => () => {};

export function ForecastApp() {
  // undefined on the server, string | null in the browser.
  const saved = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => undefined,
  );
  const [state, setState] = useState<State>({ status: "idle" });
  const [lastInput, setLastInput] = useState<ForecastInput | null>(null);

  async function requestForecast(input: ForecastInput) {
    saveInput(input);
    setLastInput(input);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`forecast ${res.status}`);
      setState({ status: "success", forecast: await res.json() });
    } catch {
      setState({ status: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {saved === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ForecastForm
          initialInput={parseSavedInput(saved)}
          pending={state.status === "loading"}
          onSubmit={requestForecast}
        />
      )}

      <section aria-live="polite" className="flex flex-col">
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
        {state.status === "success" && <ForecastCard forecast={state.forecast} />}
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
