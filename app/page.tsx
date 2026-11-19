import { HomeApp, type AccountState } from "@/app/_home/home-app";
import { todayInSeoul } from "@/features/forecast/server";
import { loadInput, loadToday } from "@/features/journal/server";
import { getSignedIn } from "@/lib/supabase/server";

async function loadAccount(): Promise<{ userId: string | null; account: AccountState }> {
  const auth = await getSignedIn();
  if (!auth) return { userId: null, account: null };
  try {
    const [input, today] = await Promise.all([loadInput(auth.supabase), loadToday(auth.supabase, todayInSeoul())]);
    return { userId: auth.userId, account: { input, today } };
  } catch (error) {
    console.error("[home] journal failed", error);
    return { userId: auth.userId, account: { input: null, today: null } };
  }
}

export default async function Home() {
  const { userId, account } = await loadAccount();
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">직장 기상청</h1>
          <p className="text-muted-foreground">출근 전 30초, 오늘의 직장 예보와 처신 요령을 받아 보세요.</p>
        </header>
        {/* Remount on sign-in/out so one account's forecast never stays on screen for another. */}
        <HomeApp key={userId ?? "signed-out"} account={account} />
      </div>
    </main>
  );
}
