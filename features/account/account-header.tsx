import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getSignedIn, isSupabaseConfigured } from "@/lib/supabase/server";

import { SignOutButton } from "./sign-out-button";

/** The app title, then only a sign-in link (signed out) or a sign-out button (signed in). No email at any width. */
export async function AccountHeader() {
  const configured = isSupabaseConfigured();
  const signedIn = configured && (await getSignedIn());
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-6">
      <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
        직장 기상청
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
