import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getSignedIn, isSupabaseConfigured } from "@/lib/supabase/server";

import { SignOutButton } from "./sign-out-button";

/** Signed out: only a sign-in link. Signed in: only a sign-out button. */
export async function AccountHeader() {
  if (!isSupabaseConfigured()) return null;
  const signedIn = await getSignedIn();
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-end px-6 pt-6">
      {signedIn ? (
        <SignOutButton />
      ) : (
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          로그인
        </Link>
      )}
    </header>
  );
}
