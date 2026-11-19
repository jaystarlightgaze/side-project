import {
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  SunIcon,
  type Icon,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { ForecastResult } from "./create-forecast";

function weatherIcon(code: number, precipitation: number): { icon: Icon; label: string } {
  if (code >= 95) return { icon: CloudLightningIcon, label: "뇌우" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: CloudSnowIcon, label: "눈" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || precipitation >= 50)
    return { icon: CloudRainIcon, label: "비" };
  if (code === 45 || code === 48) return { icon: CloudFogIcon, label: "안개" };
  if (code === 3) return { icon: CloudIcon, label: "흐림" };
  if (code === 2) return { icon: CloudSunIcon, label: "구름 조금" };
  return { icon: SunIcon, label: "맑음" };
}

const LEVEL_VARIANT = ["secondary", "default", "destructive"] as const;

export function ForecastCard({ forecast }: { forecast: ForecastResult }) {
  const { weather } = forecast;
  const { icon: WeatherIcon, label: weatherLabel } = weatherIcon(weather.weatherCode, weather.precipitationProbability);

  return (
    <Card aria-label="오늘의 직장 예보">
      <CardHeader>
        <CardDescription>
          {forecast.date} · {forecast.neighborhood} 직장 기상청 발표
        </CardDescription>
        <CardTitle className="text-xl text-balance">{forecast.headline}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <WeatherIcon className="size-10 shrink-0" aria-label={weatherLabel} />
            <dl className="text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">기온(8시)</dt>
                <dd data-testid="temperature" className="font-semibold">{weather.temperature}°C</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">강수확률(7–9시)</dt>
                <dd data-testid="precipitation" className="font-semibold">{weather.precipitationProbability}%</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end justify-center">
            <span className="text-xs text-muted-foreground">오늘의 운 지수</span>
            <span data-testid="luck" className="font-heading text-4xl font-semibold tabular-nums">
              {forecast.luck}
            </span>
          </div>
        </div>

        <Separator />

        <ul className="flex flex-col gap-4">
          {forecast.items.map((item) => (
            <li key={item.key} data-testid={`item-${item.key}`} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{item.title}</span>
                <Badge variant={LEVEL_VARIANT[item.level]}>{item.grade}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </li>
          ))}
          {forecast.alert && (
            <li data-testid="item-alert" className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">오늘의 특보</span>
                <Badge variant="destructive">특보</Badge>
              </div>
              <p className="text-sm font-medium">{forecast.alert.task}</p>
              <p className="text-sm text-muted-foreground">{forecast.alert.advice}</p>
            </li>
          )}
        </ul>

        <Separator />

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="font-medium">행동 요령</dt>
            <dd data-testid="tip" className="text-muted-foreground">{forecast.tip}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-medium">부탁하기 좋은 타이밍</dt>
            <dd data-testid="ask-timing" className="text-muted-foreground">{forecast.askTiming}</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter>
        <p className="text-xs text-muted-foreground">재미로 보는 예보입니다.</p>
      </CardFooter>
    </Card>
  );
}
