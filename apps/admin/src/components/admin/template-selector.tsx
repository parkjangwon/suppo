"use client";

import { useState, useEffect } from "react";
import { Button } from "@suppo/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@suppo/ui/components/ui/dialog";

import { Badge } from "@suppo/ui/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@suppo/ui/components/ui/tabs";
import { FileText, Sparkles, History, Star, Loader2 } from "lucide-react";
import { renderTemplate, TemplateContext } from "@/lib/templates/renderer";

interface Template {
  id: string;
  title: string;
  content: string;
  category?: { id: string; name: string } | null;
  requestType?: { id: string; name: string } | null;
  isRecommended?: boolean;
}

interface TemplateSelectorProps {
  requestTypeId?: string | null;
  onSelect: (content: string) => void;
  disabled?: boolean;
  templateContext?: TemplateContext;
}

interface GroupedTemplates {
  recommended: Template[];
  general: Template[];
  recent: Template[];
}

export function TemplateSelector({
  requestTypeId,
  onSelect,
  disabled,
  templateContext,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<GroupedTemplates>({
    recommended: [],
    general: [],
    recent: [],
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, requestTypeId]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      let url = "/api/templates/recommended";
      if (requestTypeId) {
        url += `?requestTypeId=${requestTypeId}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTemplates({
          recommended: data.recommended || [],
          general: data.general || [],
          recent: data.recent || [],
        });
      } else {
        const fallbackRes = await fetch("/api/templates");
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setTemplates({
            recommended: [],
            general: data.templates || [],
            recent: [],
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(template: Template) {
    const content = templateContext
      ? renderTemplate(template.content, templateContext)
      : template.content;
    onSelect(content);
    setOpen(false);

    fetch("/api/templates/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: template.id }),
    }).catch(() => {});
  }

  function TemplateCard({ template }: { template: Template }) {
    const preview = template.content.slice(0, 100) + (template.content.length > 100 ? "..." : "");

    return (
      <button
        onClick={() => handleSelect(template)}
        className="w-full text-left p-4 rounded-lg border hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors">
            {template.title}
          </h4>
          {template.isRecommended && (
            <Badge variant="secondary" className="text-xs shrink-0">
              <Sparkles className="h-3 w-3 mr-1" />
              추천
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{preview}</p>
        {template.category && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {template.category.name}
            </Badge>
          </div>
        )}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          템플릿
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            응답 템플릿 선택
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="recommended" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recommended" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                추천
                {templates.recommended.length > 0 && (
                  <span className="ml-1 text-xs">({templates.recommended.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="general" className="gap-1">
                <Star className="h-3.5 w-3.5" />
                일반
                {templates.general.length > 0 && (
                  <span className="ml-1 text-xs">({templates.general.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-1">
                <History className="h-3.5 w-3.5" />
                최근 사용
                {templates.recent.length > 0 && (
                  <span className="ml-1 text-xs">({templates.recent.length})</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommended" className="flex-1 min-h-0 mt-4">
              <div className="h-[400px] overflow-y-auto pr-4">
                {templates.recommended.length > 0 ? (
                  <div className="space-y-3">
                    {templates.recommended.map((template) => (
                      <TemplateCard key={template.id} template={template} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>추천 템플릿이 없습니다</p>
                    <p className="text-sm mt-1">
                      문의 유형에 맞는 템플릿을 설정할 수 있습니다
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="general" className="flex-1 min-h-0 mt-4">
              <div className="h-[400px] overflow-y-auto pr-4">
                {templates.general.length > 0 ? (
                  <div className="space-y-3">
                    {templates.general.map((template) => (
                      <TemplateCard key={template.id} template={template} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>공유 템플릿이 없습니다</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="recent" className="flex-1 min-h-0 mt-4">
              <div className="h-[400px] overflow-y-auto pr-4">
                {templates.recent.length > 0 ? (
                  <div className="space-y-3">
                    {templates.recent.map((template) => (
                      <TemplateCard key={template.id} template={template} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>최근 사용한 템플릿이 없습니다</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
