import { expect, test } from "vitest";

import { pickCommuteWeather } from "./weather";

const hours = Array.from({ length: 24 }, (_, h) => `2026-11-19T${String(h).padStart(2, "0")}:00`);

test("오전 8시 기온과 7–9시 최대 강수확률, 8시 날씨 코드를 고른다", () => {
  const temperature = hours.map((_, h) => h);
  const precipitation = hours.map((_, h) => (h === 7 ? 40 : h === 9 ? 65 : h === 12 ? 99 : 5));
  const codes = hours.map((_, h) => (h === 8 ? 61 : 0));

  const weather = pickCommuteWeather({
    hourly: {
      time: hours,
      temperature_2m: temperature,
      precipitation_probability: precipitation,
      weather_code: codes,
    },
  });

  expect(weather).toEqual({ temperature: 8, precipitationProbability: 65, weatherCode: 61 });
});

test("출근 시간대 값이 없으면 예외를 던진다", () => {
  expect(() =>
    pickCommuteWeather({
      hourly: { time: [], temperature_2m: [], precipitation_probability: [], weather_code: [] },
    }),
  ).toThrow();
});
