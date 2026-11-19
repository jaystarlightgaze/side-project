"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await createClient().auth.signOut();
    // The header and the home page are server-rendered; refresh them for the signed-out state.
    router.push("/");
    router.refresh();
    setPending(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut} disabled={pending}>
      로그아웃
    </Button>
  );
}
