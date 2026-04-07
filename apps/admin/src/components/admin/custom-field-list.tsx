"use client";

import { useState } from "react";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Badge } from "@crinity/ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crinity/ui/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@crinity/ui/components/ui/dropdown-menu";
import { MoreVertical, Plus, Pencil, Trash2 } from "lucide-react";
import { CustomFieldDialog } from "./custom-field-dialog";
import { toast } from "sonner";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface CustomField {
  id: string;
  key: string;
  name: string;
  description: string | null;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT";
  options: any;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface CustomFieldListProps {
  fields: CustomField[];
}

export function CustomFieldList({ fields }: CustomFieldListProps) {
  const copy = useAdminCopy();
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeFields = fields.filter(f => f.isActive);
  const inactiveFields = fields.filter(f => !f.isActive);
  const fieldTypeLabels: Record<string, string> = {
    TEXT: copyText(copy, "customFieldTypeText", "텍스트"),
    NUMBER: copyText(copy, "customFieldTypeNumber", "숫자"),
    DATE: copyText(copy, "customFieldTypeDate", "날짜"),
    BOOLEAN: copyText(copy, "customFieldTypeBoolean", "체크박스"),
    SELECT: copyText(copy, "customFieldTypeSelect", "단일 선택"),
    MULTI_SELECT: copyText(copy, "customFieldTypeMultiSelect", "다중 선택"),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{copyText(copy, "commonActiveFields", "활성 필드")}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {copyText(copy, "customFieldNoActive", "활성화된 커스텀 필드가 없습니다.")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copyText(copy, "commonName", "이름")}</TableHead>
                  <TableHead>{copyText(copy, "commonKey", "키")}</TableHead>
                  <TableHead>{copyText(copy, "commonType", "타입")}</TableHead>
                  <TableHead>{copyText(copy, "commonRequired", "필수")}</TableHead>
                  <TableHead>{copyText(copy, "commonDescription", "설명")}</TableHead>
                  <TableHead className="text-right">{copyText(copy, "commonActions", "작업")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell className="font-mono text-sm">{field.key}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{fieldTypeLabels[field.fieldType] || field.fieldType}</Badge>
                    </TableCell>
                    <TableCell>
                      {field.isRequired ? <Badge variant="default">{copyText(copy, "commonRequired", "필수")}</Badge> : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {field.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingField(field); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {copy.commonEdit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(field.id, !field.isActive)}
                          >
                            {copyText(copy, "commonDeactivate", "비활성화")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(field.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {copy.commonDelete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inactiveFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">{copyText(copy, "commonInactiveFields", "비활성 필드")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copyText(copy, "commonName", "이름")}</TableHead>
                  <TableHead>{copyText(copy, "commonKey", "키")}</TableHead>
                  <TableHead>{copyText(copy, "commonType", "타입")}</TableHead>
                  <TableHead className="text-right">{copyText(copy, "commonActions", "작업")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveFields.map((field) => (
                  <TableRow key={field.id} className="opacity-60">
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell className="font-mono text-sm">{field.key}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{fieldTypeLabels[field.fieldType] || field.fieldType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingField(field); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {copy.commonEdit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(field.id, !field.isActive)}
                          >
                            {copyText(copy, "commonActivate", "활성화")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(field.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {copy.commonDelete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CustomFieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        field={editingField}
        onSave={handleSave}
      />
    </div>
  );

  async function handleSave(field: any) {
    try {
      const response = await fetch("/api/admin/custom-fields" + (editingField ? `/${editingField.id}` : ""), {
        method: editingField ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field),
      });

      if (!response.ok) throw new Error();

      toast.success(
        editingField
          ? copyText(copy, "customFieldSaveSuccess", "필드가 수정되었습니다.")
          : copyText(copy, "customFieldSaveSuccess", "필드가 생성되었습니다.")
      );
      setDialogOpen(false);
      setEditingField(null);
      window.location.reload();
    } catch {
      toast.error(copyText(copy, "customFieldSaveError", "저장 중 오류가 발생했습니다."));
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/custom-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) throw new Error();

      toast.success(
        isActive
          ? copyText(copy, "customFieldActivateSuccess", "필드가 활성화되었습니다.")
          : copyText(copy, "customFieldDeactivateSuccess", "필드가 비활성화되었습니다.")
      );
      window.location.reload();
    } catch {
      toast.error(copyText(copy, "customFieldStatusError", "상태 변경 중 오류가 발생했습니다."));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(copyText(copy, "commonDeleteConfirm", "이 필드를 삭제하시겠습니까?"))) return;

    try {
      const response = await fetch(`/api/admin/custom-fields/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      toast.success(copyText(copy, "customFieldDeleteSuccess", "필드가 삭제되었습니다."));
      window.location.reload();
    } catch {
      toast.error(copyText(copy, "customFieldDeleteError", "삭제 중 오류가 발생했습니다."));
    }
  }
}
