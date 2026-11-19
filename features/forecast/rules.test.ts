import { describe, expect, test } from "vitest";

import {
  applyLuckAdjustment,
  gradeForecast,
  type CommuteWeather,
  type ForecastInput,
} from "./rules";

const mildWeather: CommuteWeather = { temperature: 15, precipitationProbability: 10, weatherCode: 1 };

function input(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    birthday: "1990-05-15",
    neighborhood: "seoul",
    meetingDays: [],
    claudeUsage: 5,
    importantTask: "",
    ...overrides,
  };
}

// 2026-11-19 is a Thursday in Asia/Seoul.
const thursday = "2026-11-19";

describe("과열 지수 (AC4)", () => {
  test("사용량 최대면 폭염주의보", () => {
    const result = gradeForecast(input({ claudeUsage: 10 }), mildWeather, thursday);
    expect(result.items.overheat.grade).toBe("폭염주의보");
  });

  test("사용량 최소면 폭염주의보가 아니다", () => {
    const result = gradeForecast(input({ claudeUsage: 0 }), mildWeather, thursday);
    expect(result.items.overheat.grade).not.toBe("폭염주의보");
  });
});

describe("회의 강수확률 (AC5)", () => {
  test("오늘 요일에 회의가 있으면 회의 주의보", () => {
    const result = gradeForecast(input({ meetingDays: ["thu"] }), mildWeather, thursday);
    expect(result.items.meeting.grade).toBe("회의 주의보");
  });

  test("다른 요일에만 회의가 있으면 회의 주의보가 아니다", () => {
    const result = gradeForecast(input({ meetingDays: ["mon", "fri"] }), mildWeather, thursday);
    expect(result.items.meeting.grade).not.toBe("회의 주의보");
  });
});

describe("출근길 날씨 (AC2)", () => {
  test("강수확률이 높으면 비 등급", () => {
    const result = gradeForecast(input(), { ...mildWeather, precipitationProbability: 70 }, thursday);
    expect(result.items.commute.grade).toBe("출근길 비 소식");
    expect(result.items.commute.facts).toContain("비");
  });

  test("영하면 한파 등급", () => {
    const result = gradeForecast(input(), { ...mildWeather, temperature: -3 }, thursday);
    expect(result.items.commute.grade).toBe("출근길 한파주의");
  });

  test("덥고 맑으면 더위 등급", () => {
    const result = gradeForecast(input(), { ...mildWeather, temperature: 31 }, thursday);
    expect(result.items.commute.grade).toBe("출근길 무더위");
  });

  test("온화하고 맑으면 쾌청", () => {
    const result = gradeForecast(input(), mildWeather, thursday);
    expect(result.items.commute.grade).toBe("출근길 쾌청");
  });
});

describe("오늘의 특보 (AC6)", () => {
  test("중요한 일을 적으면 그 내용 그대로 특보가 생긴다", () => {
    const result = gradeForecast(input({ importantTask: "  팀장님께 휴가 결재  " }), mildWeather, thursday);
    expect(result.alert).toBe("팀장님께 휴가 결재");
  });

  test("비우면 특보가 없다", () => {
    const result = gradeForecast(input({ importantTask: "   " }), mildWeather, thursday);
    expect(result.alert).toBeNull();
  });
});

describe("결정성과 운 지수 (AC7, 제약)", () => {
  test("같은 입력이면 같은 등급과 기준 운 지수", () => {
    const a = gradeForecast(input({ meetingDays: ["thu"] }), mildWeather, thursday);
    const b = gradeForecast(input({ meetingDays: ["thu"] }), mildWeather, thursday);
    expect(a).toEqual(b);
  });

  test("기준 운 지수는 0–100 정수", () => {
    for (const usage of [0, 5, 10]) {
      const { baseLuck } = gradeForecast(input({ claudeUsage: usage }), mildWeather, thursday);
      expect(Number.isInteger(baseLuck)).toBe(true);
      expect(baseLuck).toBeGreaterThanOrEqual(0);
      expect(baseLuck).toBeLessThanOrEqual(100);
    }
  });

  test("나쁜 조건이 많을수록 기준 운 지수가 낮다", () => {
    const good = gradeForecast(input({ claudeUsage: 0 }), mildWeather, thursday);
    const bad = gradeForecast(
      input({ claudeUsage: 10, meetingDays: ["thu"] }),
      { ...mildWeather, precipitationProbability: 90 },
      thursday,
    );
    expect(bad.baseLuck).toBeLessThan(good.baseLuck);
  });

  test("개인 기압은 생일에 따라 정해진다", () => {
    const a = gradeForecast(input({ birthday: "1990-05-15" }), mildWeather, thursday);
    expect(["고기압", "기압 보통", "저기압"]).toContain(a.items.pressure.grade);
  });
});

describe("운 지수 조정 클램프", () => {
  test("±10 안의 조정은 그대로 더한다", () => {
    expect(applyLuckAdjustment(50, 7)).toBe(57);
    expect(applyLuckAdjustment(50, -10)).toBe(40);
  });

  test("±10을 넘는 조정은 잘라낸다", () => {
    expect(applyLuckAdjustment(50, 30)).toBe(60);
    expect(applyLuckAdjustment(50, -25)).toBe(40);
  });

  test("결과는 0–100 정수로 자른다", () => {
    expect(applyLuckAdjustment(95, 10)).toBe(100);
    expect(applyLuckAdjustment(3, -10)).toBe(0);
    expect(applyLuckAdjustment(50, 2.6)).toBe(53);
  });
});
