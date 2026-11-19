import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import Home from "@/app/page";
import type { ForecastResult } from "@/features/forecast/create-forecast";
import { STORAGE_KEY } from "@/features/forecast/storage";

const savedInput = {
  birthday: "1990-05-15",
  neighborhood: "seoul",
  meetingDays: ["thu"],
  claudeUsage: 10,
  importantTask: "휴가 결재",
};

const forecast: ForecastResult = {
  date: "2026-11-19",
  neighborhood: "서울",
  weather: { temperature: 3.4, precipitationProbability: 20, weatherCode: 1 },
  luck: 42,
  headline: "오늘은 회의 전선이 다가옵니다",
  items: [
    { key: "commute", title: "출근길 날씨", grade: "출근길 쌀쌀함", level: 1, facts: "", text: "목도리를 챙기세요." },
    { key: "pressure", title: "개인 기압", grade: "기압 보통", level: 1, facts: "", text: "무난합니다." },
    { key: "meeting", title: "회의 강수확률", grade: "회의 주의보", level: 2, facts: "", text: "우산 같은 메모장을." },
    { key: "overheat", title: "과열 지수", grade: "폭염주의보", level: 2, facts: "", text: "머리를 식히세요." },
  ],
  alert: { task: "휴가 결재", advice: "점심 직후를 노리세요." },
  tip: "물을 자주 마시세요.",
  askTiming: "오후 2시, 커피 한 잔 후가 좋습니다.",
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

test("저장된 입력값이 폼에 채워진다 (AC8)", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  render(<Home />);

  expect(screen.getByLabelText("생일")).toHaveValue("1990-05-15");
  expect(screen.getByLabelText("오늘의 중요한 일 (선택)")).toHaveValue("휴가 결재");
  expect(screen.getByRole("checkbox", { name: "목 회의 있음" })).toBeChecked();
  expect(screen.getByText("어제 Claude 사용량: 10")).toBeInTheDocument();
});

test("필수값이 없으면 요청하지 않고 안내한다", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));

  expect(screen.getByText("생일을 알려 주세요.")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("준비 중에는 버튼을 누를 수 없고, 응답이 오면 카드가 나온다 (AC1, AC3, AC6)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  let resolve!: (res: Response) => void;
  const fetchMock = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
  vi.stubGlobal("fetch", fetchMock);
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));
  const pending = await screen.findByRole("button", { name: "예보 준비 중…" });
  expect(pending).toBeDisabled();
  expect(screen.getByText(/분석하고 있습니다/)).toBeInTheDocument();
  fireEvent.click(pending);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => resolve(Response.json(forecast)));

  const card = await screen.findByLabelText("오늘의 직장 예보");
  expect(card).toHaveTextContent("3.4°C");
  expect(card).toHaveTextContent("20%");
  expect(card).toHaveTextContent("42");
  expect(card).toHaveTextContent("폭염주의보");
  expect(card).toHaveTextContent("회의 주의보");
  expect(card).toHaveTextContent("오늘의 특보");
  expect(card).toHaveTextContent("휴가 결재");
  expect(card).toHaveTextContent("물을 자주 마시세요.");
  expect(card).toHaveTextContent("오후 2시");
  expect(card).toHaveTextContent("재미로 보는 예보입니다");
});

test("특보가 없으면 특보 항목이 없다 (AC6)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...savedInput, importantTask: "" }));
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...forecast, alert: null })));
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));

  const card = await screen.findByLabelText("오늘의 직장 예보");
  expect(card).not.toHaveTextContent("오늘의 특보");
});

test("실패하면 실패 안내와 다시 시도 버튼이 보이고, 다시 시도하면 카드가 나온다 (AC9)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: "x" }, { status: 502 }))
    .mockResolvedValueOnce(Response.json(forecast));
  vi.stubGlobal("fetch", fetchMock);
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));
  expect(await screen.findByText("예보를 받지 못했습니다")).toBeInTheDocument();
  expect(screen.queryByLabelText("오늘의 직장 예보")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await waitFor(() => expect(screen.getByLabelText("오늘의 직장 예보")).toBeInTheDocument());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("예보를 요청하면 입력값을 저장한다 (AC8)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(forecast)));
  render(<Home />);

  fireEvent.change(screen.getByLabelText("오늘의 중요한 일 (선택)"), { target: { value: "보고서 제출" } });
  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));

  await screen.findByLabelText("오늘의 직장 예보");
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).importantTask).toBe("보고서 제출");
});
