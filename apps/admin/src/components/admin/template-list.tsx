"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@suppo/ui/components/ui/table";
import { Button } from "@suppo/ui/components/ui/button";
import { Badge } from "@suppo/ui/components/ui/badge";
import { Input } from "@suppo/ui/components/ui/input";
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
} from "@suppo/ui/components/ui/alert-dialog";
import { TemplateForm } from "./template-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Sparkles, Users, Search } from "lucide-react";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { PaginationNav } from "@/components/ui/pagination-nav";

interface Template {
  id: string;
  title: string;
  content: string;
  variables: any;
  isShared: boolean;
  isRecommended: boolean;
  sortOrder: number;
  category: { id: string; name: string } | null;
  categoryId: string | null;
  requestTypeId: string | null;
  createdBy: { id: string; name: string };
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Category {
  id: string;
  name: string;
}

interface RequestType {
  id: string;
  name: string;
}

interface TemplateListProps {
  templates: Template[];
  categories: Category[];
  requestTypes: RequestType[];
  currentUserId: string;
  isAdmin: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  search?: string;
}

export function TemplateList({
  templates,
  categories,
  requestTypes,
  currentUserId,
  isAdmin,
  page,
  totalPages,
  totalCount,
  pageSize,
  search,
}: TemplateListProps) {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search ?? "");
  useDebouncedSearchParam(searchInput);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  async function handleDelete(template: Template) {
    try {
      const res = await fetch(`/api/templates/template?id=${template.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("템플릿이 삭제되었습니다.");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || t("templatesDeleteError", "삭제 중 오류가 발생했습니다."));
      }
    } catch (error) {
      toast.error(t("templatesDeleteError", "삭제 중 오류가 발생했습니다."));
    }
    setDeletingTemplate(null);
  }

  function canEdit(template: Template): boolean {
    return isAdmin || template.createdById === currentUserId;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="템플릿 검색"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
              {t("commonCreate", "생성")}
          </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("commonCreate", "생성")} {t("templatesTitle", "템플릿")}</DialogTitle>
              <DialogDescription>
                자주 사용하는 응답 템플릿을 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              categories={categories}
              requestTypes={requestTypes}
              onSuccess={() => {
                setIsFormOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">제목</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>문의 유형</TableHead>
              <TableHead>공유</TableHead>
              <TableHead>추천</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>등록된 템플릿이 없습니다</p>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.title}</span>
                      {template.isRecommended && (
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {template.content.slice(0, 60)}...
                    </p>
                  </TableCell>
                  <TableCell>
                    {template.category ? (
                      <Badge variant="outline">{template.category.name}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {template.requestTypeId ? (
                      <Badge variant="secondary">
                        {requestTypes.find((rt) => rt.id === template.requestTypeId)?.name ||
                          "알 수 없음"}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {template.isShared ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">공유</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">개인</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {template.isRecommended ? (
                      <Badge variant="default" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        추천
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {template.createdBy.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit(template) && (
                        <>
                          <Dialog
                            open={editingTemplate?.id === template.id}
                            onOpenChange={(open) =>
                              setEditingTemplate(open ? template : null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>템플릿 수정</DialogTitle>
                              <DialogDescription>
                                템플릿 정보를 수정합니다.
                              </DialogDescription>
                            </DialogHeader>
                              {editingTemplate && (
                                <TemplateForm
                                  template={editingTemplate}
                                  categories={categories}
                                  requestTypes={requestTypes}
                                  onSuccess={() => {
                                    setEditingTemplate(null);
                                    router.refresh();
                                  }}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationNav page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} />

      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={() => setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingTemplate?.title}&quot; 템플릿을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && handleDelete(deletingTemplate)}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
