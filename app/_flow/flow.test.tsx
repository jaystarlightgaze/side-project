import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { ForecastInput, ForecastResult } from "@/features/forecast";
import { STORAGE_KEY } from "@/features/forecast";

import { ChatView } from "./chat-view";
import { ForecastFlowProvider, type AccountState } from "./flow";
import type { HomeSession } from "./session";
import { SetupView } from "./setup-view";
import { TodayView } from "./today-view";

// A tiny in-memory router: the three pages share one provider, as they share one layout in the app.
const nav = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = {
    path: "/",
    go(path: string) {
      state.path = path;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return state;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.go, replace: nav.go }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        event.preventDefault();
        nav.go(href);
      }}
    >
      {children}
    </a>
  ),
}));

function Pages() {
  const path = useSyncExternalStore(nav.subscribe, () => nav.path);
  if (path === "/setup") return <SetupView />;
  if (path === "/today") return <TodayView />;
  if (path === "/today/chat") return <ChatView />;
  return null;
}

function renderFlow(path: string, account: AccountState = null) {
  nav.path = path;
  return render(
    <ForecastFlowProvider account={account}>
      <Pages />
    </ForecastFlowProvider>,
  );
}

const savedInput: ForecastInput = {
  birthday: "1990-05-15",
  neighborhood: "seoul",
  meetingDays: ["thu"],
  leaveTime: "last",
  sleepHours: 5,
  weeklyClaudeUsage: 60,
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

const calm = { alert: null, luck: 50 };

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

async function ask(fetchMock: ReturnType<typeof vi.fn>, question: string, answer: string) {
  const reply = controllableStream();
  fetchMock.mockResolvedValueOnce(reply.response);
  fireEvent.change(screen.getByLabelText("예보관에게 할 질문"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "보내기" }));
  await act(async () => {
    reply.push(answer);
    reply.close();
  });
  await screen.findByRole("button", { name: "보내기" });
}

/** Signed out, saved input: fill nothing, press "예보 보기" on /setup and land on today's card. */
async function showForecast(fetchMock: ReturnType<typeof vi.fn>, result = session()) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  fetchMock.mockResolvedValueOnce(Response.json(result));
  vi.stubGlobal("fetch", fetchMock);
  renderFlow("/setup");
  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));
  await screen.findByLabelText("오늘의 직장 예보");
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

// --- /setup ---

test("/setup에는 단계 표시가 있고, 저장된 입력값이 채워지되 오늘의 중요한 일은 비어 있다 (AC1, AC5)", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  renderFlow("/setup");

  expect(screen.getByRole("list", { name: "단계" })).toHaveTextContent("① 명식 재료›② 오늘 명식›③ 예보관");
  expect(screen.getByLabelText("생일")).toHaveValue("1990-05-15");
  expect(screen.getByRole("checkbox", { name: "목 회의 있음" })).toBeChecked();
  expect(screen.getByRole("combobox", { name: "어제 퇴근 시각" })).toHaveTextContent("막차 (22시 이후)");
  expect(screen.getByText("어젯밤 수면: 5시간")).toBeInTheDocument();
  expect(screen.getByLabelText("이번 주 Claude 사용량 (선택)")).toHaveValue(60);
  expect(screen.getByLabelText("오늘의 중요한 일 (선택)")).toHaveValue("");
});

test("예전에 저장된 입력(claudeUsage)도 오류 없이 새 칸은 기본값으로 채운다", () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ birthday: "1990-05-15", neighborhood: "seoul", meetingDays: [], claudeUsage: 9, importantTask: "" }),
  );
  renderFlow("/setup");

  expect(screen.getByLabelText("생일")).toHaveValue("1990-05-15");
  expect(screen.getByRole("combobox", { name: "어제 퇴근 시각" })).toHaveTextContent("보통 (20시 전)");
  expect(screen.getByText("어젯밤 수면: 7시간")).toBeInTheDocument();
  expect(screen.getByLabelText("이번 주 Claude 사용량 (선택)")).toHaveValue(null);
});

test("필수값이 없으면 요청하지 않고 안내한다", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  renderFlow("/setup");

  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));

  expect(screen.getByText("생일을 알려 주세요.")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("예보 보기를 누르면 /today에서 준비 중을 거쳐 카드가 나오고, 준비 중에는 다시 요청할 버튼이 없다 (AC2)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  let resolve!: (res: Response) => void;
  const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>((r) => (resolve = r)));
  vi.stubGlobal("fetch", fetchMock);
  renderFlow("/setup");

  fireEvent.change(screen.getByLabelText("오늘의 중요한 일 (선택)"), { target: { value: "휴가 결재" } });
  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));

  expect(nav.path).toBe("/today");
  expect(await screen.findByText("꼬마 명식을 세우는 중이에요")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).importantTask).toBe("휴가 결재");

  await act(async () => resolve(Response.json(session())));

  const card = await screen.findByLabelText("오늘의 직장 예보");
  expect(card).toHaveTextContent("3.4°C");
  expect(card).toHaveTextContent("폭염주의보");
  expect(card).toHaveTextContent("오늘의 특보");
  expect(card).toHaveTextContent("휴가 결재");
  expect(card).toHaveTextContent("재미로 보는 예보입니다");
  expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).importantTask).toBe("휴가 결재");
});

test("실패하면 /today에 실패 안내와 다시 시도가 보이고, 다시 시도하면 같은 입력으로 카드가 나온다 (AC13)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: "x" }, { status: 502 }))
    .mockResolvedValueOnce(Response.json(session()));
  vi.stubGlobal("fetch", fetchMock);
  renderFlow("/setup");

  fireEvent.click(screen.getByRole("button", { name: "예보 보기" }));
  expect(await screen.findByText("명식을 세우지 못했어요")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await waitFor(() => expect(screen.getByLabelText("오늘의 직장 예보")).toBeInTheDocument());
  expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
});

// --- /today ---

test("저장된 입력이 없으면 /today는 /setup으로 보낸다", async () => {
  renderFlow("/today");
  await waitFor(() => expect(nav.path).toBe("/setup"));
});

test("다시 온 사람의 /today에는 오늘 예보 받기와 명식 다시 세우기만 있고, 누르기 전엔 요청하지 않는다 (AC3)", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json(session({ alert: null })));
  vi.stubGlobal("fetch", fetchMock);
  renderFlow("/today");

  expect(screen.getByRole("button", { name: "오늘 예보 받기" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "명식 다시 세우기" })).toHaveAttribute("href", "/setup");
  expect(screen.queryByLabelText("오늘의 직장 예보")).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "오늘 예보 받기" }));
  await screen.findByLabelText("오늘의 직장 예보");
  const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
  expect(body.importantTask).toBe("");
  expect(body.birthday).toBe("1990-05-15");
});

test("카드의 명식 다시 세우기는 /setup으로 간다 (AC5)", async () => {
  await showForecast(vi.fn());
  fireEvent.click(screen.getByRole("button", { name: "명식 다시 세우기" }));
  expect(nav.path).toBe("/setup");
});

test.each([
  ["특보가 있으면", { alert: { task: "휴가 결재", advice: "" }, luck: 50 }, true],
  ["운 지수 30 이하면", { alert: null, luck: 30 }, true],
  ["운 지수 80 이상이면", { alert: null, luck: 80 }, true],
  ["셋 다 아니면", calm, false],
])("%s 권유 한 줄과 진한 버튼, 아니면 끝줄 옆 작은 링크만 (AC6)", async (_, overrides, invited) => {
  await showForecast(vi.fn(), session(overrides));
  const links = screen.getAllByRole("link", { name: "예보관에게 묻기 →" });
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute("href", "/today/chat");
  const invitation = screen.queryByTestId("chat-invitation");
  expect(invitation !== null).toBe(invited);
  if (invited) expect(invitation).toContainElement(links[0]);
  else expect(screen.getByLabelText("오늘의 직장 예보")).toContainElement(links[0]);
});

// --- /today/chat ---

test("대화 페이지에서 질문하면 답이 흘러나오고, 기다리는 동안 보내기를 누를 수 없다 (AC8)", async () => {
  const fetchMock = vi.fn();
  await showForecast(fetchMock);
  fireEvent.click(screen.getByRole("link", { name: "예보관에게 묻기 →" }));
  expect(nav.path).toBe("/today/chat");
  expect(screen.getByRole("link", { name: "← 오늘 명식" })).toHaveAttribute("href", "/today");
  const chat = screen.getByLabelText("예보관에게 묻기");
  expect(chat).toHaveTextContent("재미로 보는 예보입니다");

  const reply = controllableStream();
  fetchMock.mockResolvedValueOnce(reply.response);
  fireEvent.change(screen.getByLabelText("예보관에게 할 질문"), { target: { value: "오늘 회의 어떻게 버티지?" } });
  fireEvent.click(screen.getByRole("button", { name: "보내기" }));
  expect(await screen.findByRole("button", { name: "답을 기다리는 중…" })).toBeDisabled();

  await act(async () => {
    reply.push("메모장을 챙기세요.");
    reply.close();
  });
  expect(await screen.findByText("메모장을 챙기세요.")).toBeInTheDocument();
  const body = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(body.messages).toEqual([{ role: "user", content: "오늘 회의 어떻게 버티지?" }]);
  expect(body.context).toContain("회의 주의보");
});

test("대화 페이지에는 줄인 카드와 한 줄 요약이 있고, 줄인 카드는 /today의 체크를 읽기 전용으로 비춘다 (AC8, AC9)", async () => {
  await showForecast(vi.fn());
  const [first] = within(screen.getByTestId("item-alert")).getAllByRole("checkbox");
  fireEvent.click(first);

  fireEvent.click(screen.getByRole("link", { name: "예보관에게 묻기 →" }));
  const card = screen.getByLabelText("오늘의 직장 예보");
  expect(within(card).queryByLabelText("기둥 풀이")).not.toBeInTheDocument();
  expect(within(card).queryByTestId("ask-timing")).not.toBeInTheDocument();
  const [mirrored, second] = within(card).getAllByRole("checkbox");
  expect(mirrored).toBeChecked();
  fireEvent.click(second);
  expect(second).not.toBeChecked();
  expect(screen.getByLabelText("오늘 명식 요약")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "펼쳐 보기" })).toHaveAttribute("href", "/today");
});

test("로그인 전 대화와 체크는 /today, /setup을 오가도 남는다 (AC10)", async () => {
  const fetchMock = vi.fn();
  await showForecast(fetchMock);
  fireEvent.click(within(screen.getByTestId("item-alert")).getAllByRole("checkbox")[0]);
  fireEvent.click(screen.getByRole("link", { name: "예보관에게 묻기 →" }));
  await ask(fetchMock, "언제 말 꺼내지?", "오후 2시가 좋아요.");

  fireEvent.click(screen.getByRole("link", { name: "← 오늘 명식" }));
  expect(within(screen.getByTestId("item-alert")).getAllByRole("checkbox")[0]).toBeChecked();
  act(() => nav.go("/setup"));
  act(() => nav.go("/today"));
  fireEvent.click(screen.getByRole("link", { name: "예보관에게 묻기 →" }));

  expect(screen.getByText("언제 말 꺼내지?")).toBeInTheDocument();
  expect(screen.getByText("오후 2시가 좋아요.")).toBeInTheDocument();
});

test("화면에 예보가 없으면 대화 페이지는 /today로 보낸다", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  renderFlow("/today/chat");
  await waitFor(() => expect(nav.path).toBe("/today"));
  expect(screen.getByRole("button", { name: "오늘 예보 받기" })).toBeInTheDocument();
});

test("대화 응답이 실패하면 실패 안내와 다시 보내기가 보이고 카드는 남는다", async () => {
  const fetchMock = vi.fn();
  await showForecast(fetchMock);
  fireEvent.click(screen.getByRole("link", { name: "예보관에게 묻기 →" }));
  fetchMock.mockResolvedValueOnce(Response.json({ error: "x" }, { status: 502 }));

  fireEvent.change(screen.getByLabelText("예보관에게 할 질문"), { target: { value: "언제 말 꺼내지?" } });
  fireEvent.click(screen.getByRole("button", { name: "보내기" }));

  expect(await screen.findByText("예보관의 답을 받지 못했습니다")).toBeInTheDocument();
  expect(screen.getByLabelText("오늘의 직장 예보")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "다시 보내기" })).toBeInTheDocument();
});

// --- signed in ---

const recallToday: HomeSession = {
  ...session(calm),
  forecastId: "11111111-1111-4111-8111-111111111111",
  messages: [{ role: "assistant", content: "11월 18일 예보는 '회의 주의보'였는데, 실제로는 어떠셨어요?" }],
  recallPending: true,
};

test("로그인 사용자는 계정의 오늘 예보와 대화를 누르지 않아도 /today와 /today/chat에서 본다 (AC4, AC11)", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...savedInput, importantTask: "다른 사람 입력" }));
  const today: HomeSession = {
    ...session(),
    forecastId: "11111111-1111-4111-8111-111111111111",
    messages: [
      { role: "user", content: "오늘 회의 어떻게 버티지?" },
      { role: "assistant", content: "메모장을 챙기세요." },
    ],
  };
  renderFlow("/today", { input: { ...savedInput, meetingDays: ["thu"], importantTask: "계정 입력" }, today });
  expect(screen.getByLabelText("오늘의 직장 예보")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("link", { name: "예보관에게 묻기 →" }));
  expect(screen.getByText("메모장을 챙기세요.")).toBeInTheDocument();
});

test("계정에 오늘 예보가 없으면 같은 버튼이 보인다 (AC4)", () => {
  renderFlow("/today", { input: savedInput as never, today: null });
  expect(screen.getByRole("button", { name: "오늘 예보 받기" })).toBeInTheDocument();
});

test("계정에 입력값이 없으면 브라우저 입력이 있어도 /setup으로 가고 그 입력을 쓰지 않는다", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInput));
  renderFlow("/today", { input: null, today: null });
  await waitFor(() => expect(nav.path).toBe("/setup"));
  expect(screen.getByLabelText("생일")).toHaveValue("");
});

test("먼저 묻는 질문이 있으면 권유하고 첫 말풍선이 그 질문이며, 답한 뒤에는 작은 링크로 바뀐다 (AC7)", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  renderFlow("/today", { input: savedInput as never, today: recallToday });
  expect(screen.getByTestId("chat-invitation")).toHaveTextContent("예보관이 어제 일을 묻고 있어요");

  fireEvent.click(screen.getByRole("link", { name: "예보관에게 묻기 →" }));
  expect(within(screen.getByLabelText("예보관에게 묻기")).getAllByRole("listitem")[0]).toHaveTextContent(
    "11월 18일 예보는 '회의 주의보'였는데",
  );

  await ask(fetchMock, "회의가 두 시간 늘어졌어요", "고생 많으셨어요.");
  await ask(fetchMock, "오늘은요?", "오늘은 맑아요.");
  const bodies = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
  expect(bodies.map((b) => b.recall)).toEqual([true, false]);
  expect(bodies[0].forecastId).toBe(recallToday.forecastId);

  fireEvent.click(screen.getByRole("link", { name: "← 오늘 명식" }));
  expect(screen.queryByTestId("chat-invitation")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "예보관에게 묻기 →" })).toBeInTheDocument();
});

test("지난 기억이 있으면 카드에 날짜와 털어놓은 내용이 한 줄로 보인다", async () => {
  await showForecast(
    vi.fn(),
    session({ memory: { date: "2026-11-18", grade: "회의 주의보", answer: "회의가 두 시간 늘어졌어요" } }),
  );
  const memory = screen.getByTestId("memory");
  expect(memory).toHaveTextContent("11월 18일");
  expect(memory).toHaveTextContent("회의가 두 시간 늘어졌어요");
});
