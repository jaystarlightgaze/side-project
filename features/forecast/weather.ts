import type { CommuteWeather } from "./rules";

export const NEIGHBORHOODS = [
  { id: "seoul", label: "서울", latitude: 37.5665, longitude: 126.978 },
  { id: "busan", label: "부산", latitude: 35.1796, longitude: 129.0756 },
  { id: "incheon", label: "인천", latitude: 37.4563, longitude: 126.7052 },
  { id: "daegu", label: "대구", latitude: 35.8714, longitude: 128.6014 },
  { id: "daejeon", label: "대전", latitude: 36.3504, longitude: 127.3845 },
  { id: "gwangju", label: "광주", latitude: 35.1595, longitude: 126.8526 },
  { id: "suwon", label: "수원", latitude: 37.2636, longitude: 127.0286 },
  { id: "seongnam", label: "성남(판교)", latitude: 37.3948, longitude: 127.1112 },
] as const;

export type Neighborhood = (typeof NEIGHBORHOODS)[number];

export function findNeighborhood(id: string): Neighborhood | undefined {
  return NEIGHBORHOODS.find((n) => n.id === id);
}

type OpenMeteoHourly = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
};

/** 08:00 temperature, max precipitation probability over 07–09, 08:00 weather code. */
export function pickCommuteWeather({ hourly }: OpenMeteoHourly): CommuteWeather {
  const indexOf = (hour: string) => hourly.time.findIndex((t) => t.endsWith(`T${hour}:00`));
  const commute = ["07", "08", "09"].map(indexOf);
  const at8 = commute[1];
  if (commute.some((i) => i < 0)) throw new Error("Open-Meteo response has no 07–09 hourly data");
  return {
    temperature: hourly.temperature_2m[at8],
    precipitationProbability: Math.max(...commute.map((i) => hourly.precipitation_probability[i])),
    weatherCode: hourly.weather_code[at8],
  };
}

export async function fetchCommuteWeather(neighborhood: Neighborhood): Promise<CommuteWeather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(neighborhood.latitude),
    longitude: String(neighborhood.longitude),
    hourly: "temperature_2m,precipitation_probability,weather_code",
    timezone: "Asia/Seoul",
    forecast_days: "1",
  }).toString();
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  return pickCommuteWeather(await res.json());
}
