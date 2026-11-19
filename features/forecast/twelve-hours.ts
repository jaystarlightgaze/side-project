/** The twelve two-hour periods, starting with 子 at 23:00. */
const BRANCHES = [
  ["子", "자시"],
  ["丑", "축시"],
  ["寅", "인시"],
  ["卯", "묘시"],
  ["辰", "진시"],
  ["巳", "사시"],
  ["午", "오시"],
  ["未", "미시"],
  ["申", "신시"],
  ["酉", "유시"],
  ["戌", "술시"],
  ["亥", "해시"],
] as const;

export type TwelveHour = { hanja: string; reading: string; time: string };

const CLOCK = /(\d{1,2}):(\d{2})/;
// "오후 2시 40분", "2시 반", "밤 11시" — but not durations like "2시간".
const KOREAN = /(오전|오후|아침|새벽|낮|저녁|밤)?\s*(\d{1,2})\s*시(?!간)\s*(?:(\d{1,2})\s*분|(반))?/;

function to24h(period: string | undefined, hour: number): number {
  switch (period) {
    case "오전":
    case "아침":
    case "새벽":
      return hour === 12 ? 0 : hour;
    case "오후":
    case "저녁":
    case "밤":
      return hour === 12 ? (period === "밤" ? 0 : 12) : hour + 12;
    case "낮":
      return hour <= 6 ? hour + 12 : hour;
    default:
      // No 오전/오후: within a workday, 1–6시 means the afternoon.
      return hour >= 1 && hour <= 6 ? hour + 12 : hour;
  }
}

function readTime(text: string): { hour: number; minute: number } | null {
  const clock = CLOCK.exec(text);
  const korean = KOREAN.exec(text);
  if (clock && (!korean || clock.index <= korean.index)) {
    return { hour: Number(clock[1]), minute: Number(clock[2]) };
  }
  if (korean) {
    const minute = korean[4] ? 30 : korean[3] ? Number(korean[3]) : 0;
    return { hour: to24h(korean[1], Number(korean[2])), minute };
  }
  return null;
}

/** The first time mentioned in the ask-timing copy, named by its twelve-hour period. */
export function askTimingHour(text: string): TwelveHour | null {
  const parsed = readTime(text);
  if (!parsed || parsed.hour > 23 || parsed.minute > 59) return null;
  const { hour, minute } = parsed;
  const [hanja, reading] = BRANCHES[Math.floor(((hour + 1) % 24) / 2)];
  const pad = (n: number) => String(n).padStart(2, "0");
  return { hanja: `${hanja}時`, reading, time: `${pad(hour)}:${pad(minute)}` };
}
