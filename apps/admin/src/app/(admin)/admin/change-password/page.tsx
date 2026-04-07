"use client";

import { FormEvent, useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Input } from "@crinity/ui/components/ui/input";
import { BACKOFFICE_LOGIN_PATH } from "@crinity/shared/auth/config";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

const handleSignOut = () => signOut({ callbackUrl: BACKOFFICE_LOGIN_PATH });

export default function ChangePasswordPage() {
  const copy = useAdminCopy();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage(copyText(copy, "changePasswordMismatch", "새 비밀번호와 확인 비밀번호가 일치하지 않습니다."));
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(copyText(copy, "changePasswordTooShort", "새 비밀번호는 최소 8자 이상이어야 합니다."));
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || copyText(copy, "changePasswordError", "비밀번호 변경 중 오류가 발생했습니다."));
        return;
      }

      setSuccessMessage(copyText(copy, "changePasswordSuccess", "비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요."));

      await signOut({ callbackUrl: BACKOFFICE_LOGIN_PATH });
    } catch {
      setErrorMessage(copyText(copy, "changePasswordError", "비밀번호 변경 중 오류가 발생했습니다."));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">{copyText(copy, "changePasswordTitle", "비밀번호 변경")}</CardTitle>
          <CardDescription>
            {copyText(copy, "changePasswordDescription", "최초 로그인을 환영합니다! 보안을 위해 새로운 비밀번호를 설정해주세요.")}
          </CardDescription>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground mt-1"
          >
            {copyText(copy, "changePasswordSwitchAccount", "다른 계정으로 로그인")}
          </button>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="currentPassword"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {copyText(copy, "changePasswordCurrentPassword", "현재 비밀번호")}
              </label>
              <Input
                id="currentPassword"
                type="password"
                placeholder={copyText(copy, "changePasswordCurrentPasswordPlaceholder", "현재 비밀번호를 입력하세요")}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {copyText(copy, "changePasswordNewPassword", "새 비밀번호")}
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder={copyText(copy, "changePasswordNewPasswordPlaceholder", "새 비밀번호 (최소 8자)")}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {copyText(copy, "changePasswordConfirmPassword", "새 비밀번호 확인")}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={copyText(copy, "changePasswordConfirmPasswordPlaceholder", "새 비밀번호를 다시 입력하세요")}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className="text-sm text-green-600">{successMessage}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? copyText(copy, "commonSaving", "변경 중...") : copyText(copy, "changePasswordSubmit", "비밀번호 변경")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
