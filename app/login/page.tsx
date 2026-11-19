import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/account";
import { getSignedIn } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (await getSignedIn()) redirect("/");
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← 오늘의 예보로
        </Link>
        <LoginForm />
      </div>
    </main>
  );
}
