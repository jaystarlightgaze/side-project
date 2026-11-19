"use client";

import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { EMPTY_INPUT, ForecastForm } from "@/features/forecast";
import { cn } from "@/lib/utils";

import { freshDay, useForecastFlow } from "./flow";

const STEPS = ["① 명식 재료", "② 오늘 명식", "③ 예보관"];

export function SetupView() {
  const flow = useForecastFlow();
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="sr-only">명식 재료</h1>
      <ol aria-label="단계" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden>›</span>}
            <span aria-current={index === 0 ? "step" : undefined} className={cn(index === 0 && "font-semibold text-foreground")}>
              {step}
            </span>
          </li>
        ))}
      </ol>
      {flow.input === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ForecastForm
          initialInput={freshDay(flow.input ?? EMPTY_INPUT)}
          pending={flow.state.status === "loading"}
          onSubmit={(input) => {
            flow.requestForecast(input);
            router.push("/today");
          }}
        />
      )}
    </main>
  );
}
