import { ForecastApp } from "@/features/forecast";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">직장 기상청</h1>
          <p className="text-muted-foreground">출근 전 30초, 오늘의 직장 예보와 처신 요령을 받아 보세요.</p>
        </header>
        <ForecastApp />
      </div>
    </main>
  );
}
