"use client";

import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ForecastCard } from "@/features/forecast";
import { cn } from "@/lib/utils";

import { freshDay, useForecastFlow } from "./flow";
import { chatInvitation } from "./invitation";

export function TodayView() {
  const flow = useForecastFlow();
  const router = useRouter();
  const { input, state } = flow;

  useEffect(() => {
    if (input === null) router.replace("/setup");
  }, [input, router]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="sr-only">오늘 명식</h1>
      <section aria-live="polite" className="flex flex-col gap-6">
        {input == null ? (
          <Skeleton className="h-96 w-full" />
        ) : state.status === "idle" ? (
          <div className="paper grid justify-items-center gap-3 rounded-[28px] border-2 border-dashed border-paper-line px-4 py-12 text-center font-cute">
            <Button
              size="lg"
              className="h-12 w-full max-w-72 rounded-full text-base font-extrabold tracking-normal normal-case"
              onClick={() => flow.requestForecast(freshDay(input))}
            >
              오늘 예보 받기
            </Button>
            <Link href="/setup" className="text-xs text-ink-soft underline-offset-4 hover:underline">
              명식 다시 세우기
            </Link>
          </div>
        ) : state.status === "loading" ? (
          <div
            role="status"
            aria-busy="true"
            className="paper grid justify-items-center gap-3 rounded-[28px] border-2 border-dashed border-paper-line px-4 py-10 text-center font-cute"
          >
            <span aria-hidden className="text-[54px] leading-none motion-safe:animate-spin-slow">☯</span>
            <p className="font-extrabold">꼬마 명식을 세우는 중이에요</p>
            <p className="text-[13px] text-ink-soft">생일이랑 동네 하늘, 오늘 회의 기운을 맞춰 보고 있어요.</p>
          </div>
        ) : state.status === "error" ? (
          <Alert className="paper bg-paper after:hidden grid justify-items-center gap-2.5 rounded-[28px] border-2 border-dashed border-paper-line px-4 py-8 text-center font-cute *:data-[slot=alert-description]:text-ink-soft">
            <span aria-hidden className="text-5xl leading-none">🌫</span>
            <AlertTitle className="font-extrabold">명식을 세우지 못했어요</AlertTitle>
            <AlertDescription className="flex flex-col items-center gap-3 text-[13px]">
              <span>기상 관측소와 연결이 잠시 끊겼어요. 잠시 후 다시 시도해 주세요.</span>
              <Button
                variant="outline"
                className="h-11 w-full max-w-60 rounded-full border-[1.5px] border-hot-line bg-white font-extrabold tracking-normal normal-case text-ink"
                onClick={flow.retry}
              >
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <TodayCard />
        )}
      </section>
    </main>
  );
}

function TodayCard() {
  const flow = useForecastFlow();
  const router = useRouter();
  if (flow.state.status !== "success") return null;
  const { session } = flow.state;
  const recallOpen = session.recallPending && !flow.messages.some((message) => message.role === "user");
  const invitation = chatInvitation(session.forecast, recallOpen);

  return (
    <>
      <ForecastCard
        forecast={session.forecast}
        birthday={flow.input?.birthday || undefined}
        onRebuild={() => router.push("/setup")}
        checked={flow.checked}
        onCheckedChange={flow.setChecked}
        footerAction={
          invitation ? undefined : (
            <Link href="/today/chat" className="font-semibold text-ink underline-offset-4 hover:underline">
              예보관에게 묻기 →
            </Link>
          )
        }
      />
      {invitation && (
        <div
          data-testid="chat-invitation"
          className="flex flex-col items-center gap-2 bg-background/95 py-3 max-lg:sticky max-lg:bottom-0 max-lg:-mx-4 max-lg:border-t max-lg:px-4 max-lg:backdrop-blur"
        >
          <p className="flex items-center gap-2 text-sm font-medium">
            <ChatCircleDotsIcon className="size-5 shrink-0" aria-hidden />
            {invitation}
          </p>
          <Link href="/today/chat" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full max-w-80 rounded-full text-base font-extrabold")}>
            예보관에게 묻기 →
          </Link>
        </div>
      )}
    </>
  );
}
