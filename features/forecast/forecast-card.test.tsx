import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { ForecastResult } from "./create-forecast";
import { ForecastCard } from "./forecast-card";

const base: ForecastResult = {
  date: "2026-11-19",
  neighborhood: "성남(판교)",
  weather: { temperature: 3, precipitationProbability: 60, weatherCode: 61 },
  luck: 47,
  headline: "오전 회의 소나기 뒤 오후 갬",
  items: [
    { key: "commute", title: "출근길 날씨", grade: "출근길 비 소식", level: 2, facts: "", text: "우산을 챙기세요." },
    { key: "pressure", title: "개인 기압", grade: "기압 보통", level: 1, facts: "", text: "무난해요." },
    { key: "meeting", title: "회의 강수확률", grade: "회의 주의보", level: 2, facts: "", text: "숫자 질문 대비." },
    { key: "overheat", title: "과열 지수", grade: "쾌적", level: 0, facts: "", text: "머리가 맑아요." },
  ],
  alert: { task: "오후 3시 휴가 결재 받기", advice: "결재 전선이 오후에 북상해요." },
  tip: "숫자 세 개만 다시 확인하기.",
  askTiming: "주간보고가 끝난 14:40, 커피 들고 온 직후.",
  memory: null,
};

const renderCard = (overrides: Partial<ForecastResult> = {}) =>
  render(<ForecastCard forecast={{ ...base, ...overrides }} birthday="1994-03-27" />);

test("머리에 날짜·동네·생일, 운 지수 도장, 실제 기온과 강수확률, 총평, 끝줄이 있다 (AC1)", () => {
  renderCard();
  const card = screen.getByLabelText("오늘의 직장 예보");
  expect(card).toHaveTextContent("오늘의 운수");
  expect(card).toHaveTextContent("1994년 3월 27일생 · 11월 19일 목요일 · 성남(판교)");
  expect(screen.getByLabelText("오늘의 운 지수 47")).toBeInTheDocument();
  expect(screen.getByTestId("temperature")).toHaveTextContent("3°C");
  expect(screen.getByTestId("precipitation")).toHaveTextContent("60%");
  expect(screen.getByTestId("headline")).toHaveTextContent("오전 회의 소나기 뒤 오후 갬");
  expect(card).toHaveTextContent("재미로 보는 예보입니다.");
});

test("네 기둥은 雨 출근길, 低 개인 기압, 雷 회의, 炎 과열 순서이고 가장 나쁜 등급만 강조한다 (AC2)", () => {
  renderCard();
  const pillars = screen.getAllByTestId(/^pillar-/);
  expect(pillars.map((p) => p.textContent)).toEqual([
    expect.stringMatching(/^출근길雨.*출근길 비 소식$/),
    expect.stringMatching(/^개인 기압低.*기압 보통$/),
    expect.stringMatching(/^회의雷.*회의 주의보$/),
    expect.stringMatching(/^과열炎.*쾌적$/),
  ]);
  const emphasis = pillars.map((p) => within(p).getByTestId("grade").dataset.emphasis);
  expect(emphasis).toEqual(["true", "false", "true", "false"]);

  const readings = ["commute", "pressure", "meeting", "overheat"].map((key) => screen.getByTestId(`item-${key}`));
  expect(readings.map((r) => r.textContent)).toEqual([
    "雨 출근길우산을 챙기세요.",
    "低 개인 기압무난해요.",
    "雷 회의숫자 질문 대비.",
    "炎 과열머리가 맑아요.",
  ]);
});

test("특보가 있으면 부적에 중요한 일·조언과 할 일 세 개가 있다 (AC3)", () => {
  renderCard();
  const charm = screen.getByTestId("item-alert");
  expect(charm).toHaveTextContent("오늘의 특보 부적");
  expect(charm).toHaveTextContent("오후 3시 휴가 결재 받기");
  expect(charm).toHaveTextContent("결재 전선이 오후에 북상해요.");
  expect(within(charm).getAllByRole("checkbox")).toHaveLength(3);
  expect(within(charm).getByRole("checkbox", { name: /^처신/ })).toBeInTheDocument();
  expect(within(charm).getByRole("checkbox", { name: /^길한 시각/ })).toBeInTheDocument();
  expect(within(charm).getByRole("checkbox", { name: /^특보/ })).toBeInTheDocument();
});

test("특보가 없으면 부적 없이 오늘 할 일 두 개(처신, 길한 시각)만 있다 (AC3)", () => {
  renderCard({ alert: null });
  expect(screen.queryByTestId("item-alert")).not.toBeInTheDocument();
  const todo = screen.getByTestId("todo");
  expect(todo).toHaveTextContent("오늘 할 일");
  const boxes = within(todo).getAllByRole("checkbox");
  expect(boxes).toHaveLength(2);
  expect(within(todo).getByRole("checkbox", { name: /^처신/ })).toBeInTheDocument();
  expect(within(todo).getByRole("checkbox", { name: /^길한 시각/ })).toBeInTheDocument();
});

test("할 일을 체크하면 취소선과 진행 문구가, 모두 체크하면 다독임이 나오고, 하나 풀면 돌아간다 (AC4)", () => {
  renderCard();
  const charm = screen.getByTestId("item-alert");
  const [first, second, third] = within(charm).getAllByRole("checkbox");
  const status = screen.getByTestId("todo-status");
  expect(status).toHaveTextContent("");

  fireEvent.click(first);
  expect(within(charm).getByText(/숫자 세 개만/)).toHaveClass("line-through");
  expect(status).toHaveTextContent("1/3 완료, 기압이 올라가는 중 🌤");

  fireEvent.click(second);
  fireEvent.click(third);
  expect(status).toHaveTextContent("오늘 할 일 끝! 퇴근길은 맑음이에요 ☀️");

  fireEvent.click(second);
  expect(status).toHaveTextContent("2/3 완료, 기압이 올라가는 중 🌤");
  expect(within(charm).getByText(/숫자 세 개만/)).toHaveClass("line-through");
});

test("부탁 타이밍에 시각이 있으면 길한 시각 상자에 십이시 이름과 시각이 보인다 (AC5)", () => {
  renderCard();
  const box = screen.getByTestId("ask-timing");
  expect(box).toHaveTextContent("未時");
  expect(box).toHaveTextContent("14:40");
  expect(within(box).getByLabelText("미시 14:40")).toBeInTheDocument();
  expect(box).toHaveTextContent("주간보고가 끝난 14:40, 커피 들고 온 직후.");
});

test("부탁 타이밍에 시각이 없으면 십이시 이름 없이 문구만 보인다 (AC5)", () => {
  renderCard({ askTiming: "주간보고가 끝나고 팀장님이 커피를 들고 돌아온 직후." });
  const box = screen.getByTestId("ask-timing");
  expect(box).not.toHaveTextContent("時");
  expect(box).toHaveTextContent("주간보고가 끝나고 팀장님이 커피를 들고 돌아온 직후.");
});

test("지난 기억은 운 지수 도장 아래, 명식 상자 위에 한 줄로 보인다 (AC6)", () => {
  renderCard({ memory: { date: "2026-11-18", grade: "회의 주의보", answer: "회의는 짧았는데 팀장님 기분이 별로" } });
  const memory = screen.getByTestId("memory");
  expect(memory).toHaveTextContent("지난 기억 · 11월 18일 ‘회의 주의보’ 예보 때 “회의는 짧았는데 팀장님 기분이 별로”");
  const stamp = screen.getByLabelText("오늘의 운 지수 47");
  const chart = screen.getByTestId("chart");
  expect(stamp.compareDocumentPosition(memory) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(memory.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("줄인 카드는 머리·네 기둥·총평·부적만 있고 기둥 풀이와 길한 시각은 없다 (step-pages-layout AC8)", () => {
  render(<ForecastCard forecast={base} variant="compact" />);
  expect(screen.getByLabelText("오늘의 운 지수 47")).toBeInTheDocument();
  expect(screen.getByTestId("chart")).toBeInTheDocument();
  expect(screen.getByTestId("headline")).toBeInTheDocument();
  expect(screen.getByTestId("item-alert")).toBeInTheDocument();
  expect(screen.queryByLabelText("기둥 풀이")).not.toBeInTheDocument();
  expect(screen.queryByTestId("ask-timing")).not.toBeInTheDocument();
});

test("특보가 없으면 줄인 카드에 오늘 할 일 상자가 있다 (step-pages-layout AC8)", () => {
  render(<ForecastCard forecast={{ ...base, alert: null }} variant="compact" />);
  expect(screen.getByTestId("todo")).toBeInTheDocument();
});

test("바깥에서 받은 체크 상태를 비춰 보이고, 바뀌면 알린다 (step-pages-layout AC8)", () => {
  const changes: boolean[][] = [];
  render(<ForecastCard forecast={base} checked={[true, false, false]} onCheckedChange={(next) => changes.push(next)} />);
  const [first, second] = within(screen.getByTestId("item-alert")).getAllByRole("checkbox");
  expect(first).toBeChecked();
  expect(screen.getByTestId("todo-status")).toHaveTextContent("1/3 완료");
  fireEvent.click(second);
  expect(changes).toEqual([[true, true, false]]);
});

test("읽기 전용이면 체크를 눌러도 바뀌지 않는다 (step-pages-layout AC8)", () => {
  const changes: boolean[][] = [];
  render(
    <ForecastCard forecast={base} variant="compact" readOnly checked={[true, false, false]} onCheckedChange={(next) => changes.push(next)} />,
  );
  const [first, second] = within(screen.getByTestId("item-alert")).getAllByRole("checkbox");
  fireEvent.click(second);
  expect(first).toBeChecked();
  expect(second).not.toBeChecked();
  expect(changes).toEqual([]);
});

test("끝줄 옆에 넘겨받은 작은 링크를 둔다 (step-pages-layout AC6)", () => {
  render(<ForecastCard forecast={base} footerAction={<a href="/today/chat">예보관에게 묻기 →</a>} />);
  expect(screen.getByRole("link", { name: "예보관에게 묻기 →" })).toBeInTheDocument();
});
