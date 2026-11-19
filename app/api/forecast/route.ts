import { createForecast, forecastInputSchema } from "@/features/forecast/server";

export async function POST(request: Request) {
  const parsed = forecastInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "입력값을 다시 확인해 주세요." }, { status: 400 });
  }
  try {
    return Response.json(await createForecast(parsed.data));
  } catch (error) {
    console.error("[forecast] failed", error);
    return Response.json({ error: "예보를 만들지 못했습니다." }, { status: 502 });
  }
}
