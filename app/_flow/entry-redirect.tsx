"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { STORAGE_KEY } from "@/features/forecast";

/** Signed-out visitors: returning ones go straight to today's card, first-timers to the form. */
export function EntryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(localStorage.getItem(STORAGE_KEY) ? "/today" : "/setup");
  }, [router]);
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Skeleton className="h-96 w-full" />
    </main>
  );
}
