import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getSignedIn, isSupabaseConfigured } from "@/lib/supabase/server";

import { SignOutButton } from "./sign-out-button";

/** The app title, then only a sign-in link (signed out) or a sign-out button (signed in). No email at any width. */
export async function AccountHeader() {
  const configured = isSupabaseConfigured();
  const signedIn = configured && (await getSignedIn());
  return (
    // Same width as the page body: 3xl by default, 6xl on pages whose <main> carries `data-wide` (the chat page).
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-5 sm:px-6 [body:has([data-wide])_&]:max-w-6xl">
      <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
        운수 좋은 출근길
      </Link>
      {configured &&
        (signedIn ? (
          <SignOutButton />
        ) : (
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            로그인
          </Link>
        ))}
    </header>
  );
}
