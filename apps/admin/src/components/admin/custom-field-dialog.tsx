"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@suppo/ui/components/ui/dialog";
import { Button } from "@suppo/ui/components/ui/button";
import { Input } from "@suppo/ui/components/ui/input";
import { Label } from "@suppo/ui/components/ui/label";
import { Textarea } from "@suppo/ui/components/ui/textarea";
import { Switch } from "@suppo/ui/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@suppo/ui/components/ui/select";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { copyText } from "@/lib/i18n/admin-copy-utils";

interface CustomField {
  id?: string;
  key: string;
  name: string;
  description: string | null;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT";
  options: any;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: CustomField | null;
  onSave: (field: any) => void;
}

export function CustomFieldDialog({ open, onOpenChange, field, onSave }: CustomFieldDialogProps) {
  const copy = useAdminCopy();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldType, setFieldType] = useState<"TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT">("TEXT");
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSelectType = fieldType === "SELECT" || fieldType === "MULTI_SELECT";

  useEffect(() => {
    if (field) {
      setKey(field.key);
      setName(field.name);
      setDescription(field.description || "");
      setFieldType(field.fieldType);
      setIsRequired(field.isRequired);
      setOptions(
        field.options && Array.isArray(field.options)
          ? field.options.join(", ")
          : ""
      );
    } else {
      resetForm();
    }
  }, [field]);

  function resetForm() {
    setKey("");
    setName("");
    setDescription("");
    setFieldType("TEXT");
    setIsRequired(false);
    setOptions("");
    setErrors({});
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!key.trim()) {
      newErrors.key = copyText(copy, "customFieldKeyRequired", "키는 필수입니다.");
    } else if (!/^[a-z_][a-z0-9_]*$/i.test(key)) {
      newErrors.key = copyText(copy, "customFieldKeyInvalid", "키는 영문, 숫자, 언더스코어만 사용 가능합니다.");
    }

    if (!name.trim()) {
      newErrors.name = copyText(copy, "customFieldNameRequired", "이름은 필수입니다.");
    }

    if (isSelectType && !options.trim()) {
      newErrors.options = copyText(copy, "customFieldOptionsRequired", "옵션은 필수입니다.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const fieldData: any = {
      key,
      name,
      description: description || null,
      fieldType,
      isRequired,
      isActive: true,
      sortOrder: 0,
    };

    if (isSelectType) {
      fieldData.options = options
        .split(",")
        .map(o => o.trim())
        .filter(o => o.length > 0);
    }

    onSave(fieldData);
    resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {field
              ? copyText(copy, "customFieldEditTitle", "커스텀 필드 수정")
              : copyText(copy, "customFieldNewTitle", "새 커스텀 필드")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="key">
              {copyText(copy, "commonName", "키")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="key"
              placeholder={copyText(copy, "customFieldKeyExamplePlaceholder", "예: order_id, product_type")}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={!!field}
            />
            {errors.key && <p className="text-sm text-destructive">{errors.key}</p>}
            <p className="text-xs text-muted-foreground">
              {copyText(copy, "categoriesSlugReadonly", "시스템 내부에서 사용하는 식별자입니다. 수정할 수 없습니다.")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {copyText(copy, "commonName", "이름")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={copyText(copy, "customFieldNamePlaceholder", "예: 주문 번호, 제품 유형")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fieldType">{copyText(copy, "commonType", "필드 타입")}</Label>
            <Select value={fieldType} onValueChange={(value: any) => setFieldType(value)}>
              <SelectTrigger id="fieldType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">{copyText(copy, "customFieldTypeText", "텍스트")}</SelectItem>
                <SelectItem value="NUMBER">{copyText(copy, "customFieldTypeNumber", "숫자")}</SelectItem>
                <SelectItem value="DATE">{copyText(copy, "customFieldTypeDate", "날짜")}</SelectItem>
                <SelectItem value="BOOLEAN">{copyText(copy, "customFieldTypeBoolean", "체크박스")}</SelectItem>
                <SelectItem value="SELECT">{copyText(copy, "customFieldTypeSelect", "단일 선택")}</SelectItem>
                <SelectItem value="MULTI_SELECT">{copyText(copy, "customFieldTypeMultiSelect", "다중 선택")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSelectType && (
            <div className="space-y-2">
              <Label htmlFor="options">
                {copyText(copy, "commonOptions", "옵션")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="options"
                placeholder={copyText(copy, "customFieldOptionPlaceholder", "옵션1, 옵션2, 옵션3 (쉼표로 구분)")}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={3}
              />
              {errors.options && <p className="text-sm text-destructive">{errors.options}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">{copyText(copy, "commonDescription", "설명")}</Label>
            <Textarea
              id="description"
              placeholder={copyText(copy, "customFieldDescriptionPlaceholder", "필드에 대한 추가 설명")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isRequired"
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
            <Label htmlFor="isRequired" className="cursor-pointer">
              {copyText(copy, "commonRequiredField", "필수 필드")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.commonCancel}
          </Button>
          <Button onClick={handleSubmit}>
            {field ? copy.commonEdit : copy.commonCreate}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
