"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@suppo/ui/components/ui/button";
import { Input } from "@suppo/ui/components/ui/input";
import { Label } from "@suppo/ui/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@suppo/ui/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@suppo/ui/components/ui/alert-dialog";
import { FolderTree, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: {
    articles: number;
  };
}

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "" });
    setIsEditing(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleEdit = (category: Category) => {
    setIsEditing(category.id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: isEditing ? prev.slug : generateSlug(name),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t("categoriesNameRequired", "카테고리 이름을 입력하세요"));
      return;
    }

    try {
      const url = isEditing
        ? `/api/admin/knowledge/categories/${isEditing}`
        : "/api/admin/knowledge/categories";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save category");
      }

      toast.success(isEditing ? "카테고리가 수정되었습니다" : "카테고리가 생성되었습니다");
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("categoriesError", "오류가 발생했습니다"));
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      const response = await fetch(`/api/admin/knowledge/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete category");
      }

      toast.success("카테고리가 삭제되었습니다");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("categoriesError", "오류가 발생했습니다"));
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderTree className="h-4 w-4" />
          카테고리 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>카테고리 관리</DialogTitle>
          <DialogDescription>
            지식 문서의 카테고리를 관리합니다. 문서가 있는 카테고리는 삭제할 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg divide-y">
            {categories.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                카테고리가 없습니다
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-gray-500">
                        {category._count.articles}개 문서
                        {category.description && ` · ${category.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {category._count.articles === 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            disabled={isDeleting === category.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              &quot;{category.name}&quot; 카테고리를 삭제하시겠습니까?
                              이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(category.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isDeleting === category.id ? "삭제 중..." : "삭제"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-sm">
              {isEditing ? "카테고리 수정" : "새 카테고리"}
            </h4>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">
                이름
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="카테고리 이름"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm">
                슬러그 (URL)
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="category-slug"
                disabled={!!isEditing}
              />
              <p className="text-xs text-gray-500">
                {isEditing
                  ? "슬러그는 수정할 수 없습니다"
                  : "자동으로 생성됩니다 (수정 가능)"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">
                설명 (선택사항)
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="카테고리 설명"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {isEditing ? "수정" : "추가"}
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={resetForm}>
                  취소
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
