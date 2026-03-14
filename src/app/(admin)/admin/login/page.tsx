"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BACKOFFICE_DASHBOARD_PATH } from "@/lib/auth/config";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleCredentialsLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsPending(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: BACKOFFICE_DASHBOARD_PATH
    });

    setIsPending(false);

    if (!result || result.error) {
      setErrorMessage("로그인에 실패했습니다");
      return;
    }

    router.push(BACKOFFICE_DASHBOARD_PATH);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">상담원 로그인</CardTitle>
          <CardDescription>관리자 계정으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCredentialsLogin}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                이메일
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@crinity.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <Button type="submit" className="w-full" disabled={isPending}>
              로그인
            </Button>
          </form>

          <div className="mt-4 space-y-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn("google", { callbackUrl: BACKOFFICE_DASHBOARD_PATH })}
            >
              Google로 계속하기
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn("github", { callbackUrl: BACKOFFICE_DASHBOARD_PATH })}
            >
              GitHub로 계속하기
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          OAuth 공급자 설정은 환경변수를 통해 활성화됩니다.
        </CardFooter>
      </Card>
    </div>
  );
}
