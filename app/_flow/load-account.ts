import { todayInSeoul } from "@/features/forecast/server";
import { loadInput, loadToday } from "@/features/journal/server";
import { getSignedIn } from "@/lib/supabase/server";

import type { AccountState } from "./flow";

/** The signed-in user's saved input and today's forecast. account is null when signed out. */
export async function loadAccount(): Promise<{ userId: string | null; account: AccountState }> {
  const auth = await getSignedIn();
  if (!auth) return { userId: null, account: null };
  try {
    const [input, today] = await Promise.all([loadInput(auth.supabase), loadToday(auth.supabase, todayInSeoul())]);
    return { userId: auth.userId, account: { input, today } };
  } catch (error) {
    console.error("[flow] journal failed", error);
    return { userId: auth.userId, account: { input: null, today: null } };
  }
}
