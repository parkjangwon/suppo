"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Comment {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: Date | string;
  attachments: { id: string; fileName: string; fileUrl: string }[];
}

interface CommentThreadProps {
  comments: Comment[];
}

export function CommentThread({ comments }: CommentThreadProps) {
  if (!comments || comments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => {
        const isCustomer = comment.authorType === "CUSTOMER";
        const isInternal = comment.isInternal;

        return (
          <Card 
            key={comment.id} 
            className={`
              ${isCustomer ? "mr-12" : "ml-12"} 
              ${isInternal ? "bg-amber-50/50 border-amber-200" : ""}
            `}
          >
            <CardHeader className={`py-3 px-4 ${isInternal ? "bg-amber-100/50" : "bg-muted/30"}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    {comment.authorName}
                  </CardTitle>
                  {isCustomer ? (
                    <Badge variant="outline" className="text-xs">고객</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">상담원</Badge>
                  )}
                  {isInternal && (
                    <Badge variant="destructive" className="text-xs bg-amber-500 hover:bg-amber-600">내부 메모</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="py-4 px-4">
              <div className="whitespace-pre-wrap text-sm">{comment.content}</div>
              
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <ul className="space-y-1">
                    {comment.attachments.map((file) => (
                      <li key={file.id}>
                        <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          {file.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

