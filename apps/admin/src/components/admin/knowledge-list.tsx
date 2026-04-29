"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@suppo/ui/components/ui/select";
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
import { Plus, Search, Pencil, Trash2, ExternalLink, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { CategoryManager } from "./category-manager";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { PaginationNav } from "@/components/ui/pagination-nav";

interface KnowledgeListProps {
  articles: any[];
  categories: any[];
  currentUserId: string;
  isAdmin: boolean;
  publicBaseUrl: string;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  status?: string;
}

export function KnowledgeList({
  articles,
  categories,
  currentUserId,
  isAdmin,
  publicBaseUrl,
  page,
  totalPages,
  totalCount,
  pageSize,
  search,
  categoryId,
  status,
}: KnowledgeListProps) {
  const copy = useAdminCopy() as unknown as Record<string, string>;
  const t = (key: string, fallback: string) => copy[key] ?? fallback;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search ?? "");
  useDebouncedSearchParam(searchInput);
  const selectedCategory = categoryId ?? "all";
  const selectedStatus = status ?? "all";
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      const response = await fetch(`/api/admin/knowledge/articles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete article");
      }

      toast.success("문서가 삭제되었습니다");
      router.refresh();
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다");
    } finally {
      setIsDeleting(null);
    }
  };

  const canEdit = (article: any) => {
    return isAdmin || article.authorId === currentUserId;
  };

  const canDelete = (article: any) => {
    return isAdmin || article.authorId === currentUserId;
  };

  const canOpenPublicLink = (article: any) => {
    return article.isPublished && article.isPublic;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t("knowledgeSearchPlaceholder", "문서 검색...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={(value) => updateParam("categoryId", value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("knowledgeCategoryPlaceholder", "카테고리")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("commonAll", "전체")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={(value) => updateParam("status", value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("knowledgeStatus", "상태")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("commonAll", "전체")}</SelectItem>
              <SelectItem value="published">{t("knowledgeStatusPublished", "게시됨")}</SelectItem>
              <SelectItem value="draft">{t("knowledgeStatusDraft", "초안")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/knowledge/contributors">
              <BarChart3 className="h-4 w-4 mr-2" />
              기여자 통계
            </Link>
          </Button>
          <CategoryManager categories={categories} />
          <Button asChild>
            <Link href="/admin/knowledge/new">
              <Plus className="h-4 w-4 mr-2" />
              새 문서
            </Link>
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>조회수</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead>수정일</TableHead>
              <TableHead className="w-[150px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  문서가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-xs truncate" title={article.title}>
                      {article.title}
                    </div>
                    {article.excerpt && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {article.excerpt}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{article.category?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    {article.isPublished ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        게시됨
                      </Badge>
                    ) : (
                      <Badge variant="secondary">초안</Badge>
                    )}
                    {!article.isPublic && article.isPublished && (
                      <Badge variant="outline" className="ml-1">
                        내부
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{article.viewCount.toLocaleString()}</TableCell>
                  <TableCell>{article.author?.name}</TableCell>
                  <TableCell>
                    {new Date(article.updatedAt).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canOpenPublicLink(article) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="공개 링크"
                          asChild
                        >
                          <a
                            href={`${publicBaseUrl}/knowledge/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="공개 링크"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          공개 안 됨
                        </Badge>
                      )}
                      {canEdit(article) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="수정"
                        >
                          <Link href={`/admin/knowledge/${article.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {canDelete(article) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>문서 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                &quot;{article.title}&quot; 문서를 삭제하시겠습니까?
                                이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(article.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={isDeleting === article.id}
                              >
                                {isDeleting === article.id ? "삭제 중..." : "삭제"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationNav
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
