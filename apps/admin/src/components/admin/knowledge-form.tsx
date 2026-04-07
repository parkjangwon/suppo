"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Badge } from "@crinity/ui/components/ui/badge";
import { X, Plus, Eye, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";

interface KnowledgeFormProps {
  article?: any;
  categories: any[];
}

export function KnowledgeForm({ article, categories }: KnowledgeFormProps) {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const isEditing = !!article;

  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [content, setContent] = useState(article?.content || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [categoryId, setCategoryId] = useState(article?.categoryId || "");
  const [tags, setTags] = useState<string[]>(() => {
    const raw = article?.tags;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  });
  const [newTag, setNewTag] = useState("");
  const [isPublic, setIsPublic] = useState(article?.isPublic ?? true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isPublished = article?.isPublished ?? false;

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 100);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing) {
      setSlug(generateSlug(value));
    }
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error(t("knowledgeTitleRequired", "제목을 입력해주세요"));
      return false;
    }
    if (!slug.trim()) {
      toast.error(t("knowledgeSlugRequired", "슬러그를 입력해주세요"));
      return false;
    }
    if (!content.trim()) {
      toast.error(t("knowledgeContentRequired", "내용을 입력해주세요"));
      return false;
    }
    if (!categoryId) {
      toast.error(t("knowledgeCategoryRequired", "카테고리를 선택해주세요"));
      return false;
    }
    return true;
  };

  const saveArticle = async (publish: boolean = false) => {
    if (!validateForm()) return;

    const data = {
      title: title.trim(),
      slug: slug.trim(),
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      categoryId,
      tags,
      isPublic,
      isPublished: publish,
    };

    try {
      const url = isEditing
        ? `/api/admin/knowledge/articles/${article.id}`
        : "/api/admin/knowledge/articles";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save article");
      }

      const savedArticle = await response.json();

      toast.success(publish ? "문서가 게시되었습니다" : "문서가 저장되었습니다");

      if (!isEditing) {
        router.push(`/admin/knowledge/${savedArticle.id}/edit`);
      } else {
        router.refresh();
      }

      return savedArticle;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("knowledgeSaveError", "저장 중 오류가 발생했습니다"));
      return null;
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await saveArticle(false);
    setIsSaving(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await saveArticle(true);
    setIsPublishing(false);
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      .replace(/`([^`]+)`/gim, "<code>$1</code>")
      .replace(/\n/gim, "<br />");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={showPreview ? "outline" : "default"}
            onClick={() => setShowPreview(false)}
          >
            편집
          </Button>
          <Button
            variant={showPreview ? "default" : "outline"}
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            미리보기
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/knowledge">{t("commonCancel", "취소")}</Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "저장 중..." : t("commonSaveDraft", "초안 저장")}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
          >
            <Send className="h-4 w-4 mr-2" />
            {isPublishing ? "게시 중..." : t("commonPublish", "게시하기")}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle>{title || "제목 없음"}</CardTitle>
          </CardHeader>
          <CardContent>
            {excerpt && (
              <p className="text-gray-600 mb-4 italic">{excerpt}</p>
            )}
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="문서 제목을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">슬러그 (URL) *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="문서-url-slug"
                />
                <p className="text-xs text-gray-500">
                  /knowledge/{slug || "문서-url"} 에서 접근할 수 있습니다
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                {isPublished && isPublic
                  ? "현재 게시된 공개 문서입니다. 고객 포털에서 공개 링크로 접근할 수 있습니다."
                  : isPublished && !isPublic
                    ? "현재 게시된 내부 문서입니다. 상담원/관리자용으로만 유지되며 고객 포털에는 노출되지 않습니다."
                    : isPublic
                      ? "현재 초안 상태입니다. 게시하면 고객 포털에서 공개 링크로 접근할 수 있습니다."
                      : "현재 초안 상태의 내부 문서입니다. 게시 전까지 고객 포털에는 노출되지 않습니다."}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">요약</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="문서 내용을 간략히 요약해주세요 (선택사항)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>태그</Label>
                <div className="flex gap-2 flex-wrap">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="새 태그 입력"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>내용</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="마크다운 형식으로 내용을 작성하세요..."
                rows={20}
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-2">
                **굵게**, *기울임*, `코드`, ### 제목 등 마크다운 문법을 사용할 수 있습니다
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>공개 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                />
                <Label htmlFor="isPublic" className="font-normal">
                  고객 포털에 공개
                </Label>
              </div>
              <p className="text-sm text-gray-500">
                체크 해제 시 상담원만 볼 수 있는 내부 문서가 됩니다
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
