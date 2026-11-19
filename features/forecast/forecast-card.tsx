"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { formatKoreanDate } from "./chat-context";
import type { ForecastItem, ForecastResult } from "./create-forecast";
import { koreanWeekday } from "./rules";
import { askTimingHour } from "./twelve-hours";

function summarize(text: string, max = 60): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function weatherEmoji(code: number, precipitation: number): { emoji: string; label: string } {
  if (code >= 95) return { emoji: "⛈", label: "뇌우" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { emoji: "🌨", label: "눈" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || precipitation >= 50) return { emoji: "🌧", label: "비" };
  if (code === 45 || code === 48) return { emoji: "🌫", label: "안개" };
  if (code === 3) return { emoji: "☁️", label: "흐림" };
  if (code === 2) return { emoji: "⛅", label: "구름 조금" };
  return { emoji: "☀️", label: "맑음" };
}

/** "1994-03-27" → "1994년 3월 27일생" */
function formatBirthday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일생`;
}

const PILLARS: Record<string, { hanja: string; label: string; face: string; tone: string; ink: string }> = {
  commute: { hanja: "雨", label: "출근길", face: "🌧", tone: "bg-water", ink: "text-water-ink" },
  pressure: { hanja: "低", label: "개인 기압", face: "🫧", tone: "bg-earth", ink: "text-earth-ink" },
  meeting: { hanja: "雷", label: "회의", face: "⚡", tone: "bg-wood", ink: "text-wood-ink" },
  overheat: { hanja: "炎", label: "과열", face: "🔥", tone: "bg-fire", ink: "text-fire-ink" },
};

/** The worst of the three rule levels gets the accent. */
const WORST_LEVEL = 2;

type Props = {
  forecast: ForecastResult;
  /** The birthday the forecast was built from, for the header line. */
  birthday?: string;
  /** Go back to the input form ("명식 다시 세우기"). */
  onRebuild?: () => void;
};

export function ForecastCard({ forecast, birthday, onRebuild }: Props) {
  const { weather } = forecast;
  const sky = weatherEmoji(weather.weatherCode, weather.precipitationProbability);
  const hour = askTimingHour(forecast.askTiming);
  const header = [
    birthday ? formatBirthday(birthday) : null,
    `${formatKoreanDate(forecast.date)} ${koreanWeekday(forecast.date)}`,
    forecast.neighborhood,
  ]
    .filter(Boolean)
    .join(" · ");

  const todos: Todo[] = [
    { tag: "처신", tone: "bg-lilac", text: forecast.tip },
    {
      tag: "길한 시각",
      tone: "bg-earth",
      text: hour ? `${hour.time}에 부탁할 말 꺼내기` : "길한 시각에 부탁할 말 꺼내기",
    },
    ...(forecast.alert ? [{ tag: "특보", tone: "bg-fire", text: forecast.alert.task }] : []),
  ];

  return (
    <article aria-label="오늘의 직장 예보" className="@container paper break-keep rounded-[28px] border-2 border-dashed border-paper-line font-cute">
      <div className="grid grid-cols-1 gap-4 px-4 py-5 @min-[40rem]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @min-[40rem]:items-start @min-[40rem]:gap-x-6 @min-[40rem]:p-8">
        <header className="relative col-span-full grid justify-items-center gap-1 px-12 text-center @min-[40rem]:px-0">
          <span aria-hidden className="font-hanja text-[13px] font-extrabold tracking-[0.4em] text-hot">
            職 場 命 式
          </span>
          <h2 className="text-[22px] leading-snug">오늘의 직장 명식</h2>
          <p className="text-xs text-ink-soft">{header}</p>
          <LuckStamp luck={forecast.luck} />
        </header>

        {forecast.memory && (
          <p
            data-testid="memory"
            className="col-span-full flex items-start gap-2.5 rounded-[18px] border-[1.5px] border-dashed border-lilac-line bg-white px-3 py-2.5 text-[13px]"
          >
            <span aria-hidden className="text-xl leading-none">🐾</span>
            <span>
              <b className="text-lilac-ink">지난 기억</b> · {formatKoreanDate(forecast.memory.date)} &lsquo;
              {forecast.memory.grade}&rsquo; 예보 때 &ldquo;{summarize(forecast.memory.answer)}&rdquo;
            </span>
          </p>
        )}

        <div className="flex flex-col gap-3.5">
          <section data-testid="chart" aria-label="오늘의 네 기둥" className="grid gap-3 rounded-[26px] border-2 border-fire/60 bg-white px-3 py-3.5">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-ink-soft">
              <span>오늘의 네 기둥</span>
              <span>
                <span role="img" aria-label={sky.label}>{sky.emoji}</span>{" "}
                <b data-testid="temperature" className="tabular-nums">{weather.temperature}°C</b> · 강수확률{" "}
                <b data-testid="precipitation" className="tabular-nums">{weather.precipitationProbability}%</b> (7–9시)
              </span>
            </div>
            <ol className="grid grid-cols-4 gap-2">
              {forecast.items.map((item, index) => (
                <Pillar key={item.key} item={item} index={index} />
              ))}
            </ol>
            <p data-testid="headline" className="rounded-[18px] bg-verdict px-3 py-2.5 text-center text-base font-extrabold text-balance">
              <small className="block text-[11px] tracking-[0.2em] text-verdict-ink">총 평</small>
              {forecast.headline}
            </p>
          </section>

          <ul aria-label="기둥 풀이" className="grid grid-cols-2 gap-2">
            {forecast.items.map((item) => {
              const pillar = PILLARS[item.key];
              return (
                <li key={item.key} data-testid={`item-${item.key}`} className={cn("grid content-start gap-0.5 rounded-[18px] px-3 py-2.5 text-xs", pillar?.tone)}>
                  <b className="text-[13px]">
                    <span aria-hidden>{pillar?.hanja} </span>
                    {pillar?.label ?? item.title}
                  </b>
                  {item.text}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-3.5">
          {forecast.alert ? (
            <section
              data-testid="item-alert"
              aria-label="오늘의 특보 부적"
              className="relative mt-3 rotate-[0.6deg] rounded-[10px] border-2 border-charm-line bg-charm px-3.5 pt-4 pb-3.5 shadow-[0_4px_0_var(--charm-shadow)]"
            >
              <span aria-hidden className="absolute -top-3.5 left-1/2 grid size-7.5 -translate-x-1/2 place-items-center rounded-full bg-hot font-hanja font-extrabold text-white">
                符
              </span>
              <p className="text-center text-xs font-extrabold tracking-[0.2em] text-charm-ink">오늘의 특보 부적</p>
              <h3 className="mt-1 mb-0.5 text-center text-base text-balance">{forecast.alert.task}</h3>
              <p className="mb-2.5 text-center text-[13px]">{forecast.alert.advice}</p>
              <TodoList todos={todos} rowClassName="bg-white/75" />
            </section>
          ) : (
            <section data-testid="todo" aria-label="오늘 할 일" className="rounded-[22px] border-2 border-fire/60 bg-white p-3.5">
              <h3 className="mb-2.5 text-[15px]">오늘 할 일 ✏️</h3>
              <TodoList todos={todos} rowClassName="bg-paper" />
            </section>
          )}

          <section data-testid="ask-timing" aria-label="부탁하기 좋은 타이밍" className="flex items-center gap-3 rounded-[20px] bg-lilac px-3.5 py-3">
            {hour && (
              <div aria-label={`${hour.reading} ${hour.time}`} role="img" className="flex-none text-center font-hanja text-2xl leading-none font-extrabold text-lilac-ink">
                {hour.hanja}
                <small className="mt-1 block font-cute text-xs">{hour.time}</small>
              </div>
            )}
            <div>
              <p className="text-xs font-extrabold text-lilac-ink">말 꺼내기 길한 시각</p>
              <p className="text-sm">{forecast.askTiming}</p>
            </div>
          </section>

          <p data-testid="tip" className="sr-only">
            행동 요령: {forecast.tip}
          </p>

          <footer className="flex items-center justify-between gap-2 text-xs text-ink-soft">
            <span>재미로 보는 예보입니다.</span>
            {onRebuild && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs tracking-normal normal-case text-ink-soft" onClick={onRebuild}>
                명식 다시 세우기
              </Button>
            )}
          </footer>
        </div>
      </div>
    </article>
  );
}

function LuckStamp({ luck }: { luck: number }) {
  return (
    <div
      role="img"
      aria-label={`오늘의 운 지수 ${luck}`}
      className="absolute -top-1.5 -right-1.5 grid size-13 -rotate-8 place-items-center rounded-full border-3 border-dashed border-hot bg-white text-center leading-none text-hot motion-safe:animate-wiggle @min-[40rem]:-right-0.5 @min-[40rem]:size-16"
    >
      <span>
        <small aria-hidden className="block font-hanja text-xs font-extrabold">運</small>
        <b data-testid="luck" className="text-base tabular-nums @min-[40rem]:text-xl">{luck}</b>
      </span>
    </div>
  );
}

function Pillar({ item, index }: { item: ForecastItem; index: number }) {
  const pillar = PILLARS[item.key];
  const emphasized = item.level === WORST_LEVEL;
  return (
    <li
      data-testid={`pillar-${item.key}`}
      className={cn(
        "grid justify-items-center gap-0.5 rounded-t-full rounded-b-[22px] px-1 pt-3 pb-2.5 text-center shadow-[inset_0_-4px_0_rgb(0_0_0/0.05)]",
        pillar?.tone,
      )}
    >
      <span className="text-[11px] font-extrabold opacity-75">{pillar?.label ?? item.title}</span>
      <span
        aria-hidden
        style={{ animationDelay: `${index * 0.3}s` }}
        className={cn("font-hanja text-[38px] leading-[1.1] font-extrabold motion-safe:animate-bob @min-[40rem]:text-[46px]", pillar?.ink)}
      >
        {pillar?.hanja}
      </span>
      <span aria-hidden className="text-base leading-none">{pillar?.face}</span>
      <Badge
        data-testid="grade"
        data-emphasis={emphasized}
        className={cn(
          "mt-1 h-auto max-w-full rounded-full px-1 py-px text-[11px] leading-tight font-extrabold tracking-normal whitespace-normal normal-case wrap-anywhere break-keep @min-[40rem]:px-1.5",
          emphasized ? "bg-hot text-white" : "bg-white/80 text-ink",
        )}
      >
        {item.grade}
      </Badge>
    </li>
  );
}

type Todo = { tag: string; tone: string; text: string };

function TodoList({ todos, rowClassName }: { todos: Todo[]; rowClassName: string }) {
  const id = useId();
  const [checked, setChecked] = useState<boolean[]>(() => todos.map(() => false));
  const done = checked.filter(Boolean).length;
  const status =
    done === 0 ? "" : done === todos.length ? "오늘 할 일 끝! 퇴근길은 맑음이에요 ☀️" : `${done}/${todos.length} 완료, 기압이 올라가는 중 🌤`;

  return (
    <>
      <ul className="grid gap-2">
        {todos.map((todo, index) => (
          <li key={todo.tag} className={cn("grid grid-cols-[24px_1fr] items-start gap-2.5 rounded-2xl px-2.5 py-2", rowClassName)}>
            <Checkbox
              id={`${id}-${index}`}
              checked={checked[index]}
              onCheckedChange={(value) => setChecked((prev) => prev.map((c, i) => (i === index ? value : c)))}
              className="mt-px size-5.5 rounded-lg border-2 border-hot-line bg-white data-checked:border-hot data-checked:bg-hot data-checked:text-white"
            />
            <label htmlFor={`${id}-${index}`} className={cn("cursor-pointer text-sm", checked[index] && "line-through opacity-50")}>
              <span className={cn("mr-1 inline-block rounded-full px-2 py-px text-[11px] font-extrabold", todo.tone)}>{todo.tag}</span>
              {todo.text}
            </label>
          </li>
        ))}
      </ul>
      <p data-testid="todo-status" aria-live="polite" className="mt-2 min-h-[18px] text-center text-xs text-hot">
        {status}
      </p>
    </>
  );
}
