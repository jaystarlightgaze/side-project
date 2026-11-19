/** Rule-based saju (四柱) reading from a birthday only: today's day pillar against the birthday's day pillar. */

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

export const ELEMENTS = ["목", "화", "토", "금", "수"] as const;
export type Element = (typeof ELEMENTS)[number];

// Index = stem / 2 (갑을 목, 병정 화, 무기 토, 경신 금, 임계 수).
const STEM_ELEMENT: Element[] = ["목", "화", "토", "금", "수"];
const BRANCH_ELEMENT: Element[] = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];

export type SajuRelation = "비화" | "인성" | "식상" | "재성" | "관성";

export type SajuToday = {
  /** 일간: the birthday's day stem, e.g. "갑목" */
  dayMaster: string;
  /** Today's day pillar, e.g. "병오" */
  todayPillar: string;
  relation: SajuRelation;
  /** True when today's branch clashes (충) with the birthday's day branch. */
  clash: boolean;
  /** The element missing from the four characters (both day pillars). */
  lacking: Element;
  /** Work-hour periods that carry the lacking element or the element that feeds the day master. */
  goodHours: string[];
  /** One thing to be careful about today. */
  avoid: string;
};

/** Index (0–59) of the day pillar; 1900-01-01 was 갑술 (index 10). */
function dayPillarIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86_400_000);
  return (((days + 10) % 60) + 60) % 60;
}

const pillar = (index: number) => ({ stem: index % 10, branch: index % 12 });

/** Elements by "generates" cycle: 목→화→토→금→수→목. */
function relationOf(me: Element, other: Element): SajuRelation {
  const diff = (ELEMENTS.indexOf(other) - ELEMENTS.indexOf(me) + 5) % 5;
  return (["비화", "식상", "재성", "관성", "인성"] as const)[diff];
}

const WORK_BRANCHES = [
  [5, "오전 9–11시"],
  [6, "오전 11시–오후 1시"],
  [7, "오후 1–3시"],
  [8, "오후 3–5시"],
  [9, "오후 5–7시"],
] as const;

const AVOID: Record<SajuRelation, string> = {
  비화: "남과 고집을 겨루는 일, 괜한 비교",
  인성: "받기만 하고 미루는 일, 늘어지는 결정",
  식상: "말이 앞서는 일, 즉흥적인 약속",
  재성: "욕심내서 일을 더 떠안는 것",
  관성: "윗사람과 정면으로 부딪히는 일, 무리한 요구",
};

export function readSaju(birthday: string, today: string): SajuToday {
  const mine = pillar(dayPillarIndex(birthday));
  const now = pillar(dayPillarIndex(today));
  const meElement = STEM_ELEMENT[Math.floor(mine.stem / 2)];
  const todayElement = STEM_ELEMENT[Math.floor(now.stem / 2)];
  const present = new Set<Element>([
    meElement,
    BRANCH_ELEMENT[mine.branch],
    todayElement,
    BRANCH_ELEMENT[now.branch],
  ]);
  const lacking = ELEMENTS.find((e) => !present.has(e))!;
  const feeder = ELEMENTS[(ELEMENTS.indexOf(meElement) + 4) % 5];
  const matching = (wanted: Element) => WORK_BRANCHES.filter(([b]) => BRANCH_ELEMENT[b] === wanted).map(([, label]) => label);
  const goodHours = matching(lacking).length ? matching(lacking) : matching(feeder);
  const relation = relationOf(meElement, todayElement);
  return {
    dayMaster: `${STEMS[mine.stem]}${meElement}`,
    todayPillar: `${STEMS[now.stem]}${BRANCHES[now.branch]}`,
    relation,
    clash: (mine.branch - now.branch + 12) % 12 === 6,
    lacking,
    goodHours: goodHours.length ? goodHours : ["오전 11시–오후 1시"],
    avoid: AVOID[relation],
  };
}

/** Pressure grade from saju: 충 is always 저기압, 오늘이 나를 돕거나 같으면 고기압, 나를 누르면 저기압. */
export function sajuPressure(saju: SajuToday): { grade: string; level: 0 | 1 | 2; facts: string } {
  const facts = `사주: 일간 ${saju.dayMaster}, 오늘 일진 ${saju.todayPillar}, 관계 ${saju.relation}${saju.clash ? ", 일지 충(부딪힘)" : ""}, 오늘 부족한 오행 ${saju.lacking}`;
  if (saju.clash || saju.relation === "관성") return { grade: "저기압", level: 2, facts: `기운이 눌림, ${facts}` };
  if (saju.relation === "인성" || saju.relation === "비화") return { grade: "고기압", level: 0, facts: `기운이 받쳐 줌, ${facts}` };
  return { grade: "기압 보통", level: 1, facts: `기운이 보통, ${facts}` };
}
