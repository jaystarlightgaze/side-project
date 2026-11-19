import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { ForecastResult } from "./create-forecast";
import { PILLARS, WORST_LEVEL } from "./forecast-card";

type Props = {
  forecast: ForecastResult;
  /** Where "펼쳐 보기" leads; the caller owns the route. */
  action: ReactNode;
  className?: string;
};

/** One-line digest of today's chart for narrow screens: luck stamp, the four pillars, worst grades named. */
export function ForecastSummary({ forecast, action, className }: Props) {
  return (
    <section
      aria-label="오늘 명식 요약"
      className={cn("paper flex items-center gap-2.5 rounded-[20px] border-2 border-dashed border-paper-line px-3 py-2 font-cute", className)}
    >
      <span
        role="img"
        aria-label={`오늘의 운 지수 ${forecast.luck}`}
        className="grid size-11 flex-none -rotate-8 place-items-center rounded-full border-2 border-dashed border-hot bg-white leading-none text-hot"
      >
        <span>
          <small aria-hidden className="block font-hanja text-[10px] font-extrabold">運</small>
          <b className="text-sm tabular-nums">{forecast.luck}</b>
        </span>
      </span>
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {forecast.items.map((item) => {
          const pillar = PILLARS[item.key];
          const worst = item.level === WORST_LEVEL;
          return (
            <li key={item.key} className="flex min-w-0 items-center gap-1">
              <span aria-hidden className={cn("font-hanja text-base font-extrabold", pillar?.ink)}>{pillar?.hanja}</span>
              <span className={worst ? "truncate font-extrabold text-hot" : "sr-only"}>
                {worst ? item.grade : `${pillar?.label ?? item.title} ${item.grade}`}
              </span>
            </li>
          );
        })}
      </ul>
      <span className="flex-none text-xs">{action}</span>
    </section>
  );
}
