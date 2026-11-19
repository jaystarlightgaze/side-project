import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { ForecastResult } from "@/features/forecast";
import { STORAGE_KEY } from "@/features/forecast";

import { HomeApp as Home } from "./home-app";
import type { HomeSession } from "./session";

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
  memory: null,
};

const session = (overrides: Partial<ForecastResult> = {}): HomeSession => ({
  forecast: { ...forecast, ...overrides },
  forecastId: null,
  messages: [],
  recallPending: false,
});

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
  expect(screen.getByText("꼬마 명식을 세우는 중이에요")).toBeInTheDocument();
  fireEvent.click(pending);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => resolve(Response.json(session())));

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
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(session({ alert: null }))));
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
    .mockResolvedValueOnce(Response.json(session()));
  vi.stubGlobal("fetch", fetchMock);
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));
  expect(await screen.findByText("명식을 세우지 못했어요")).toBeInTheDocument();
  expect(screen.queryByLabelText("오늘의 직장 예보")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await waitFor(() => expect(screen.getByLabelText("오늘의 직장 예보")).toBeInTheDocument());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("예보를 요청하면 입력값을 저장한다 (AC8)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(session())));
  render(<Home />);

  fireEvent.change(screen.getByLabelText("오늘의 중요한 일 (선택)"), { target: { value: "보고서 제출" } });
  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));

  await screen.findByLabelText("오늘의 직장 예보");
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).importantTask).toBe("보고서 제출");
});

// --- Forecaster chat and memory (docs/specs/forecaster-chat-memory) ---

function controllableStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  const encoder = new TextEncoder();
  return {
    response: new Response(stream),
    push: (text: string) => controller.enqueue(encoder.encode(text)),
    close: () => controller.close(),
  };
}

async function showForecast(fetchMock: ReturnType<typeof vi.fn>, result = session()) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  fetchMock.mockResolvedValueOnce(Response.json(result));
  vi.stubGlobal("fetch", fetchMock);
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));
  await screen.findByLabelText("오늘의 직장 예보");
}

test("예보 카드 아래 대화창에서 질문하면 답이 흘러나오고, 기다리는 동안 보내기를 누를 수 없다 (AC1)", async () => {
  const fetchMock = vi.fn();
  await showForecast(fetchMock);
  const chat = screen.getByLabelText("예보관에게 묻기");
  expect(chat).toHaveTextContent("재미로 보는 예보입니다");

  const reply = controllableStream();
  fetchMock.mockResolvedValueOnce(reply.response);
  fireEvent.change(screen.getByLabelText("예보관에게 할 질문"), { target: { value: "오늘 회의 어떻게 버티지?" } });
  fireEvent.click(screen.getByRole("button", { name: "보내기" }));

  const waiting = await screen.findByRole("button", { name: "답을 기다리는 중…" });
  expect(waiting).toBeDisabled();

  await act(async () => reply.push("회의 주의보가 발령됐으니 "));
  expect(await screen.findByText(/회의 주의보가 발령됐으니/)).toBeInTheDocument();
  await act(async () => {
    reply.push("메모장을 챙기세요.");
    reply.close();
  });

  expect(await screen.findByRole("button", { name: "보내기" })).toBeInTheDocument();
  expect(chat).toHaveTextContent("회의 주의보가 발령됐으니 메모장을 챙기세요.");
  const body = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(body.messages).toEqual([{ role: "user", content: "오늘 회의 어떻게 버티지?" }]);
  expect(body.context).toContain("회의 주의보");
  expect(body.context).toContain("휴가 결재");
});

test.each([
  ["특보가 있으면", { alert: { task: "휴가 결재", advice: "" }, luck: 50 }, true],
  ["운 지수 30 이하면", { alert: null, luck: 30 }, true],
  ["운 지수 80 이상이면", { alert: null, luck: 80 }, true],
  ["셋 다 아니면", { alert: null, luck: 50 }, false],
])("%s 대화 권유 한 줄이 보이는지 정해진다 (AC3)", async (_, overrides, visible) => {
  await showForecast(vi.fn(), session(overrides));
  expect(screen.queryByTestId("chat-suggestion") !== null).toBe(visible);
});

test("대화 응답이 실패하면 실패 안내와 다시 보내기가 보이고 카드는 남는다 (AC10)", async () => {
  const fetchMock = vi.fn();
  await showForecast(fetchMock);
  fetchMock.mockResolvedValueOnce(Response.json({ error: "x" }, { status: 502 }));

  fireEvent.change(screen.getByLabelText("예보관에게 할 질문"), { target: { value: "언제 말 꺼내지?" } });
  fireEvent.click(screen.getByRole("button", { name: "보내기" }));

  expect(await screen.findByText("예보관의 답을 받지 못했습니다")).toBeInTheDocument();
  expect(screen.getByLabelText("오늘의 직장 예보")).toBeInTheDocument();
  expect(screen.getByText("언제 말 꺼내지?")).toBeInTheDocument();

  const reply = controllableStream();
  fetchMock.mockResolvedValueOnce(reply.response);
  fireEvent.click(screen.getByRole("button", { name: "다시 보내기" }));
  await act(async () => {
    reply.push("오후 2시가 좋아요.");
    reply.close();
  });
  expect(await screen.findByText("오후 2시가 좋아요.")).toBeInTheDocument();
  expect(screen.queryByText("예보관의 답을 받지 못했습니다")).not.toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[2][1].body).messages).toEqual([{ role: "user", content: "언제 말 꺼내지?" }]);
});

test("로그인 사용자는 계정의 입력값과 오늘의 예보·대화를 누르지 않아도 본다 (AC6, AC9)", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...savedInput, importantTask: "다른 사람 입력" }));
  const today: HomeSession = {
    ...session(),
    forecastId: "11111111-1111-4111-8111-111111111111",
    messages: [
      { role: "user", content: "오늘 회의 어떻게 버티지?" },
      { role: "assistant", content: "메모장을 챙기세요." },
    ],
  };
  render(<Home account={{ input: { ...savedInput, meetingDays: ["thu"], importantTask: "계정 입력" }, today }} />);

  expect(screen.getByLabelText("오늘의 중요한 일 (선택)")).toHaveValue("계정 입력");
  expect(screen.getByLabelText("오늘의 직장 예보")).toBeInTheDocument();
  expect(screen.getByText("메모장을 챙기세요.")).toBeInTheDocument();
});

test("계정에 입력값이 없으면 이 브라우저의 다른 입력값을 쓰지 않는다 (AC9)", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  render(<Home account={{ input: null, today: null }} />);
  expect(screen.getByLabelText("오늘의 중요한 일 (선택)")).toHaveValue("");
  expect(screen.queryByLabelText("오늘의 직장 예보")).not.toBeInTheDocument();
});

test("먼저 묻는 질문으로 대화가 시작되고, 첫 답에만 recall 표시를 보낸다 (AC7)", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const today: HomeSession = {
    ...session(),
    forecastId: "11111111-1111-4111-8111-111111111111",
    messages: [{ role: "assistant", content: "11월 18일 예보는 '회의 주의보'였는데, 실제로는 어떠셨어요?" }],
    recallPending: true,
  };
  render(<Home account={{ input: savedInput as never, today }} />);
  expect(screen.getByText(/11월 18일 예보는 '회의 주의보'였는데/)).toBeInTheDocument();

  for (const question of ["회의가 두 시간 늘어졌어요", "오늘은요?"]) {
    const reply = controllableStream();
    fetchMock.mockResolvedValueOnce(reply.response);
    fireEvent.change(screen.getByLabelText("예보관에게 할 질문"), { target: { value: question } });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));
    await act(async () => {
      reply.push("고생 많으셨어요.");
      reply.close();
    });
    await screen.findByRole("button", { name: "보내기" });
  }

  const bodies = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
  expect(bodies.map((b) => b.recall)).toEqual([true, false]);
  expect(bodies[0].forecastId).toBe(today.forecastId);
});

test("지난 기억이 있으면 카드에 날짜와 털어놓은 내용이 한 줄로 보인다 (AC8)", async () => {
  await showForecast(
    vi.fn(),
    session({ memory: { date: "2026-11-18", grade: "회의 주의보", answer: "회의가 두 시간 늘어졌어요" } }),
  );
  const memory = screen.getByTestId("memory");
  expect(memory).toHaveTextContent("지난 기억");
  expect(memory).toHaveTextContent("11월 18일");
  expect(memory).toHaveTextContent("회의가 두 시간 늘어졌어요");
});

test("지난 기억이 없으면 그 줄이 없다 (AC8)", async () => {
  await showForecast(vi.fn());
  expect(screen.queryByTestId("memory")).not.toBeInTheDocument();
});
