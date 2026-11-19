"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Mode | null>(null);
  const [message, setMessage] = useState<{ title: string; body: string } | null>(null);

  async function submit(mode: Mode) {
    setPending(mode);
    setMessage(null);
    const supabase = createClient();
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setPending(null);

    if (error) {
      setMessage({
        title: mode === "sign-in" ? "로그인하지 못했습니다" : "가입하지 못했습니다",
        body: describeError(error.message),
      });
      return;
    }
    if (!data.session) {
      setMessage({ title: "확인 메일을 보냈습니다", body: "메일의 링크를 누른 뒤 다시 로그인해 주세요." });
      return;
    }
    // Refresh so the server-rendered header and the saved forecast show the signed-in state.
    router.push("/");
    router.refresh();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit("sign-in");
  }

  const disabled = pending !== null || email.trim() === "" || password === "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>
          로그인하면 입력값과 예보, 예보관과 나눈 대화가 계정에 남고, 다음 날 예보관이 지난 예보를 기억합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">이메일</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">비밀번호</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {message && (
              <Alert variant="destructive">
                <WarningIcon />
                <AlertTitle>{message.title}</AlertTitle>
                <AlertDescription>{message.body}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={disabled}>
                {pending === "sign-in" ? "로그인 중…" : "로그인"}
              </Button>
              <Button type="button" variant="outline" disabled={disabled} onClick={() => submit("sign-up")}>
                {pending === "sign-up" ? "가입 중…" : "이 이메일로 가입하기"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function describeError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "이메일이나 비밀번호가 맞지 않아요.";
  if (/already registered/i.test(message)) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (/email not confirmed/i.test(message)) return "이메일 확인이 아직 끝나지 않았어요.";
  if (/password/i.test(message)) return "비밀번호는 6자 이상으로 정해 주세요.";
  return "잠시 후 다시 시도해 주세요.";
}
