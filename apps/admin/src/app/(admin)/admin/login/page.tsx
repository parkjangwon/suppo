"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";

import { Button } from "@suppo/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Input } from "@suppo/ui/components/ui/input";
import { BACKOFFICE_DASHBOARD_PATH } from "@suppo/shared/auth/config";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const copy = useAdminCopy();
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getProviders>>>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const hasOAuthProvider = Boolean(providers?.google || providers?.github);

  useEffect(() => {
    let isMounted = true;

    getProviders()
      .then((availableProviders) => {
        if (isMounted) {
          setProviders(availableProviders);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProviders(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
      setErrorMessage(copyText(copy, "loginFailed", "로그인에 실패했습니다"));
      return;
    }

    router.push(BACKOFFICE_DASHBOARD_PATH);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">{copyText(copy, "loginTitle", "관리 콘솔")}</CardTitle>
          <CardDescription>{copyText(copy, "loginDescription", "관리자 계정으로 로그인하세요")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCredentialsLogin}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {copyText(copy, "commonEmail", "이메일")}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={copyText(copy, "loginEmailPlaceholder", "admin@suppo.io")}
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
                {copyText(copy, "commonPassword", "비밀번호")}
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
              {copyText(copy, "loginSubmit", "로그인")}
            </Button>
          </form>

          {hasOAuthProvider ? (
            <div className="mt-4 space-y-2 border-t pt-4">
              {providers?.google ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("google", { callbackUrl: BACKOFFICE_DASHBOARD_PATH })}
                >
                  {copyText(copy, "loginContinueWithGoogle", "Google로 계속하기")}
                </Button>
              ) : null}
              {providers?.github ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("github", { callbackUrl: BACKOFFICE_DASHBOARD_PATH })}
                >
                  {copyText(copy, "loginContinueWithGithub", "GitHub로 계속하기")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          {copyText(copy, "loginOAuthFooter", "OAuth 공급자 설정은 환경변수를 통해 활성화됩니다.")}
        </CardFooter>
      </Card>
    </div>
  );
}
