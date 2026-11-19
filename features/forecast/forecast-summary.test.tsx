import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { ForecastResult } from "./create-forecast";
import { ForecastSummary } from "./forecast-summary";

const forecast: ForecastResult = {
  date: "2026-11-19",
  neighborhood: "서울",
  weather: { temperature: 3, precipitationProbability: 20, weatherCode: 1 },
  luck: 42,
  headline: "회의 전선 접근",
  items: [
    { key: "commute", title: "출근길 날씨", grade: "출근길 쌀쌀함", level: 1, facts: "", text: "" },
    { key: "pressure", title: "개인 기압", grade: "기압 보통", level: 1, facts: "", text: "" },
    { key: "meeting", title: "회의 강수확률", grade: "회의 주의보", level: 2, facts: "", text: "" },
    { key: "overheat", title: "과열 지수", grade: "폭염주의보", level: 2, facts: "", text: "" },
  ],
  alert: null,
  tip: "",
  askTiming: "",
  memory: null,
};

test("한 줄 요약에 운 지수, 네 기둥 한자, 가장 나쁜 등급 이름, 넘겨받은 펼쳐 보기가 있다 (step-pages-layout AC9)", () => {
  render(<ForecastSummary forecast={forecast} action={<a href="/today">펼쳐 보기</a>} />);
  const summary = screen.getByLabelText("오늘 명식 요약");
  expect(screen.getByLabelText("오늘의 운 지수 42")).toBeInTheDocument();
  for (const hanja of ["雨", "低", "雷", "炎"]) expect(summary).toHaveTextContent(hanja);
  expect(summary).toHaveTextContent("회의 주의보");
  expect(summary).toHaveTextContent("폭염주의보");
  expect(screen.getByText("개인 기압 기압 보통")).toHaveClass("sr-only");
  expect(screen.getByRole("link", { name: "펼쳐 보기" })).toHaveAttribute("href", "/today");
});
