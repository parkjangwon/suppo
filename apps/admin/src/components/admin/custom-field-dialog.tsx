"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@crinity/ui/components/ui/dialog";
import { Button } from "@crinity/ui/components/ui/button";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Textarea } from "@crinity/ui/components/ui/textarea";
import { Switch } from "@crinity/ui/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";

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
      newErrors.key = "키는 필수입니다.";
    } else if (!/^[a-z_][a-z0-9_]*$/i.test(key)) {
      newErrors.key = "키는 영문, 숫자, 언더스코어만 사용 가능합니다.";
    }

    if (!name.trim()) {
      newErrors.name = "이름은 필수입니다.";
    }

    if (isSelectType && !options.trim()) {
      newErrors.options = "옵션은 필수입니다.";
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
            {field ? "커스텀 필드 수정" : "새 커스텀 필드"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="key">
              키 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="key"
              placeholder="예: order_id, product_type"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={!!field}
            />
            {errors.key && <p className="text-sm text-destructive">{errors.key}</p>}
            <p className="text-xs text-muted-foreground">
              시스템 내부에서 사용하는 식별자입니다. 수정할 수 없습니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="예: 주문 번호, 제품 유형"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fieldType">필드 타입</Label>
            <Select value={fieldType} onValueChange={(value: any) => setFieldType(value)}>
              <SelectTrigger id="fieldType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">텍스트</SelectItem>
                <SelectItem value="NUMBER">숫자</SelectItem>
                <SelectItem value="DATE">날짜</SelectItem>
                <SelectItem value="BOOLEAN">체크박스</SelectItem>
                <SelectItem value="SELECT">단일 선택</SelectItem>
                <SelectItem value="MULTI_SELECT">다중 선택</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSelectType && (
            <div className="space-y-2">
              <Label htmlFor="options">
                옵션 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="options"
                placeholder="옵션1, 옵션2, 옵션3 (쉼표로 구분)"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={3}
              />
              {errors.options && <p className="text-sm text-destructive">{errors.options}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="필드에 대한 추가 설명"
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
              필수 필드
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit}>
            {field ? "수정" : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
