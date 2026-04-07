"use client";

import { useState } from "react";
import { Button } from "@crinity/ui/components/ui/button";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Textarea } from "@crinity/ui/components/ui/textarea";
import { Checkbox } from "@crinity/ui/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crinity/ui/components/ui/select";
import { Badge } from "@crinity/ui/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Info, X } from "lucide-react";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

interface Category {
  id: string;
  name: string;
}

interface RequestType {
  id: string;
  name: string;
}

interface Template {
  id: string;
  title: string;
  content: string;
  variables: any;
  isShared: boolean;
  isRecommended: boolean;
  sortOrder: number;
  categoryId: string | null;
  requestTypeId: string | null;
}

interface TemplateFormProps {
  template?: Template;
  categories: Category[];
  requestTypes: RequestType[];
  onSuccess: () => void;
}

const DEFAULT_VARIABLES = [
  { name: "ticket.id", description: "티켓 번호", example: "TKT-001" },
  { name: "ticket.number", description: "티켓 번호", example: "TKT-001" },
  { name: "ticket.subject", description: "티켓 제목", example: "로그인 오류" },
  { name: "ticket.status", description: "티켓 상태", example: "처리 중" },
  { name: "ticket.priority", description: "우선순위", example: "높음" },
  { name: "customer.name", description: "고객 이름", example: "홍길동" },
  { name: "customer.email", description: "고객 이메일", example: "hong@example.com" },
  { name: "category.name", description: "카테고리 이름", example: "기술 지원" },
  { name: "agent.name", description: "담당 상담원 이름", example: "김상담" },
];

export function TemplateForm({
  template,
  categories,
  requestTypes,
  onSuccess,
}: TemplateFormProps) {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(template?.title || "");
  const [content, setContent] = useState(template?.content || "");
  const [categoryId, setCategoryId] = useState(template?.categoryId || "");
  const [requestTypeId, setRequestTypeId] = useState(template?.requestTypeId || "");
  const [isShared, setIsShared] = useState(template?.isShared ?? true);
  const [isRecommended, setIsRecommended] = useState(template?.isRecommended ?? false);
  const [sortOrder, setSortOrder] = useState(template?.sortOrder?.toString() || "0");
  const [variables, setVariables] = useState<string[]>(
    template?.variables?.map((v: any) => v.name) || []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error(t("templatesTitleContentRequired", "제목과 내용을 입력해주세요."));
      return;
    }

    setLoading(true);

    const variableObjects = variables.map((name) => {
      const def = DEFAULT_VARIABLES.find((v) => v.name === name);
      return {
        name,
        description: def?.description || "",
        example: def?.example || "",
      };
    });

    const payload = {
      id: template?.id,
      title: title.trim(),
      content: content.trim(),
      variables: variableObjects,
      categoryId: categoryId || null,
      requestTypeId: requestTypeId || null,
      isShared,
      isRecommended,
      sortOrder: parseInt(sortOrder) || 0,
    };

    try {
      const res = await fetch("/api/templates/template", {
        method: template ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(template ? "템플릿이 수정되었습니다." : "템플릿이 생성되었습니다.");
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || t("templatesSaveError", "저장 중 오류가 발생했습니다."));
      }
    } catch (error) {
      toast.error(t("templatesSaveError", "저장 중 오류가 발생했습니다."));
    } finally {
      setLoading(false);
    }
  }

  function insertVariable(variableName: string) {
    setContent((prev) => prev + `{{${variableName}}}`);
    if (!variables.includes(variableName)) {
      setVariables((prev) => [...prev, variableName]);
    }
  }

  function removeVariable(variableName: string) {
    setVariables((prev) => prev.filter((v) => v !== variableName));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">템플릿 제목 *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 로그인 오류 안내"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">카테고리</Label>
          <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">선택 안 함</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="requestType">추천 문의 유형</Label>
          <Select value={requestTypeId || "none"} onValueChange={(v) => setRequestTypeId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="문의 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">선택 안 함</SelectItem>
              {requestTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>사용 가능한 변수</Label>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
          {DEFAULT_VARIABLES.map((variable) => (
            <button
              key={variable.name}
              type="button"
              onClick={() => insertVariable(variable.name)}
              className="text-xs px-2 py-1 bg-white border rounded hover:border-blue-400 hover:text-blue-600 transition-colors"
              title={`${variable.description} (예: ${variable.example})`}
            >
              {`{{${variable.name}}}`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">템플릿 내용 *</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="템플릿 내용을 입력하세요. 변수를 사용하려면 위의 버튼을 클릭하세요."
          rows={8}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>템플릿에 사용된 변수</Label>
        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-lg">
          {variables.length === 0 ? (
            <span className="text-sm text-gray-400">사용된 변수가 없습니다</span>
          ) : (
            variables.map((variable) => (
              <Badge key={variable} variant="secondary" className="gap-1">
                {`{{${variable}}}`}
                <button
                  type="button"
                  onClick={() => removeVariable(variable)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sortOrder">정렬 순서</Label>
          <Input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
          />
        </div>

        <div className="flex items-end pb-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isShared"
              checked={isShared}
              onCheckedChange={(checked) => setIsShared(checked === true)}
            />
            <Label htmlFor="isShared" className="text-sm cursor-pointer">
              팀원과 공유
            </Label>
          </div>
        </div>

        <div className="flex items-end pb-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecommended"
              checked={isRecommended}
              onCheckedChange={(checked) => setIsRecommended(checked === true)}
            />
            <Label htmlFor="isRecommended" className="text-sm cursor-pointer">
              추천 템플릿으로 표시
            </Label>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">템플릿 사용 방법</p>
          <p className="mt-1">
            템플릿을 저장하면 티켓 응답 작성 시 &quot;템플릿&quot; 버튼을 통해 빠르게 불러올 수 있습니다.
            문의 유형을 지정하면 해당 유형의 티켓에 추천 템플릿으로 표시됩니다.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {template ? "수정하기" : "생성하기"}
        </Button>
      </div>
    </form>
  );
}
