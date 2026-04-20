"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@suppo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

interface AdminOnlyPageStateProps {
  title: string;
  description: string;
}

export function AdminOnlyPageState({
  title,
  description,
}: AdminOnlyPageStateProps) {
  const copy = useAdminCopy();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">관리자 전용 페이지</p>
            <CardTitle className="text-2xl">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          <Button asChild>
            <Link href="/admin/dashboard">{copy.navDashboard}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
