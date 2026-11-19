import type { HomeSession } from "@/app/_home/session";
import { createForecast, forecastInputSchema, todayInSeoul } from "@/features/forecast/server";
import { latestMemory, saveForecast, saveInput } from "@/features/journal/server";
import { getSignedIn } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = forecastInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "입력값을 다시 확인해 주세요." }, { status: 400 });
  }
  const input = parsed.data;
  const auth = await getSignedIn();
  const today = todayInSeoul();

  try {
    const memory = auth ? await latestMemory(auth.supabase, today).catch(logAndNull) : null;
    const forecast = await createForecast(input, memory);
    let session: HomeSession = { forecast, forecastId: null, messages: [], recallPending: false };
    if (auth) {
      // A failed save must not take the forecast away from the user.
      const saved = await Promise.all([
        saveInput(auth.supabase, auth.userId, input),
        saveForecast(auth.supabase, today, input, forecast),
      ]).catch(logAndNull);
      if (saved) session = { forecast, ...saved[1] };
    }
    return Response.json(session);
  } catch (error) {
    console.error("[forecast] failed", error);
    return Response.json({ error: "예보를 만들지 못했습니다." }, { status: 502 });
  }
}

function logAndNull(error: unknown) {
  console.error("[forecast] journal failed", error);
  return null;
}
