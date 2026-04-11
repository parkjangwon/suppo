"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@crinity/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Textarea } from "@crinity/ui/components/ui/textarea";
import { CaptchaWidget } from "@/components/security/captcha-widget";

import { ChatComposer } from "./chat-composer";
import { ChatThread } from "./chat-thread";

interface WidgetSettings {
  widgetKey: string;
  welcomeTitle: string;
  welcomeMessage: string;
  accentColor: string;
}

interface ConversationPayload {
  id: string;
  status: string;
  ticket: {
    id: string;
    ticketNumber: string;
    customerName: string;
    customerEmail: string;
    status: string;
    comments: Array<{
      id: string;
      authorType: string;
      authorName: string;
      content: string;
      createdAt: string;
      attachments: Array<{
        id: string;
        fileName: string;
        fileUrl: string;
      }>;
    }>;
  };
}

type SessionState = {
  conversationId: string;
  token: string;
  lastReadCommentId?: string | null;
};

function getStorageKey(widgetKey: string) {
  return `crinity-chat-session:${widgetKey}`;
}

function writeSession(storageKey: string, session: SessionState) {
  globalThis.localStorage?.setItem(storageKey, JSON.stringify(session));
}

export function ChatWidgetShell({ settings }: { settings: WidgetSettings }) {
  const storageKey = useMemo(() => getStorageKey(settings.widgetKey), [settings.widgetKey]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [conversation, setConversation] = useState<ConversationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const [lastReadCommentId, setLastReadCommentId] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    initialMessage: "",
  });

  async function loadConversation(nextSession: SessionState) {
    const response = await fetch(
      `/api/chat/conversations/${nextSession.conversationId}?token=${encodeURIComponent(nextSession.token)}`
    );

    if (!response.ok) {
      throw new Error("failed to load conversation");
    }

    const data = await response.json();
    setConversation(data);
  }

  useEffect(() => {
    const storedSession = globalThis.localStorage?.getItem(storageKey);
    if (!storedSession) {
      return;
    }

    const parsed = JSON.parse(storedSession) as SessionState;
    setSession(parsed);
    if (parsed.lastReadCommentId) {
      setLastReadCommentId(parsed.lastReadCommentId);
    }
    void loadConversation(parsed).catch(() => {
      globalThis.localStorage.removeItem(storageKey);
      setSession(null);
      setConversation(null);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const eventSource = new EventSource(
      `/api/chat/conversations/${session.conversationId}/stream?token=${encodeURIComponent(session.token)}`
    );

    eventSource.addEventListener("message", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        type: string;
        payload?: { senderType?: string; isTyping?: boolean };
      };

      if (data.type === "typing.updated" && data.payload?.senderType === "AGENT") {
        setAgentTyping(Boolean(data.payload.isTyping));
        return;
      }

      void loadConversation(session).catch(() => undefined);
    });

    return () => {
      eventSource.close();
    };
  }, [session]);

  useEffect(() => {
    if (!session || !conversation) {
      return;
    }

    const lastComment = conversation.ticket.comments[conversation.ticket.comments.length - 1];
    if (!lastComment || lastComment.authorType !== "AGENT" || lastComment.id === lastReadCommentId) {
      return;
    }

    void fetch(`/api/chat/conversations/${session.conversationId}/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: session.token,
        commentId: lastComment.id,
      }),
    }).then(() => {
      setLastReadCommentId(lastComment.id);
      const nextSession = {
        ...session,
        lastReadCommentId: lastComment.id,
      };
      setSession(nextSession);
      writeSession(storageKey, nextSession);
    });
  }, [conversation, lastReadCommentId, session, storageKey]);

  async function startConversation() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          initialMessage: form.initialMessage,
          widgetKey: settings.widgetKey,
          captchaToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "failed to create conversation");
      }

      const data = await response.json();
      const nextSession = {
        conversationId: data.conversationId,
        token: data.customerToken,
        lastReadCommentId: null,
      };

      writeSession(storageKey, nextSession);
      setSession(nextSession);
      await loadConversation(nextSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "채팅을 시작하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(payload: { content: string; files: File[] }) {
    if (!session) {
      return;
    }

    const formData = new FormData();
    formData.append("token", session.token);
    formData.append("content", payload.content);
    payload.files.forEach((file) => formData.append("attachments", file));

    const response = await fetch(`/api/chat/conversations/${session.conversationId}/messages`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("failed to send message");
    }

    await loadConversation(session);
  }

  async function updateTypingState(isTyping: boolean) {
    if (!session) {
      return;
    }

    await fetch(`/api/chat/conversations/${session.conversationId}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: session.token,
        isTyping,
      }),
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden border-none shadow-xl">
          <CardHeader style={{ backgroundColor: settings.accentColor }} className="text-white">
            <CardTitle className="text-2xl">{settings.welcomeTitle}</CardTitle>
            <p className="text-sm text-white/80">{settings.welcomeMessage}</p>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {!session || !conversation ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chat-name">이름</Label>
                  <Input
                    id="chat-name"
                    aria-label="이름"
                    value={form.customerName}
                    onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chat-email">이메일</Label>
                  <Input
                    id="chat-email"
                    aria-label="이메일"
                    value={form.customerEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, customerEmail: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chat-initial-message">메시지</Label>
                  <Textarea
                    id="chat-initial-message"
                    aria-label="메시지"
                    value={form.initialMessage}
                    onChange={(event) => setForm((prev) => ({ ...prev, initialMessage: event.target.value }))}
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>보안 확인</Label>
                  <CaptchaWidget
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    onTokenChange={setCaptchaToken}
                  />
                </div>
                {errorMessage ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {errorMessage}
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button onClick={startConversation} disabled={loading}>
                    {loading ? "시작 중..." : "채팅 시작"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  상담 티켓: <span className="font-medium text-slate-900">{conversation.ticket.ticketNumber}</span>
                </div>
                {agentTyping ? (
                  <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                    상담원이 입력 중...
                  </div>
                ) : null}
                <ChatThread comments={conversation.ticket.comments} />
                {conversation.ticket.status === "RESOLVED" || conversation.ticket.status === "CLOSED" ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-sm font-medium text-emerald-800">상담이 종료되었습니다.</div>
                    <p className="mt-1 text-sm text-emerald-700">상담 경험을 평가해주시면 품질 개선에 큰 도움이 됩니다.</p>
                    <Button asChild className="mt-3">
                      <a href={`/survey/${conversation.ticket.id}`} target="_blank" rel="noreferrer">
                        상담 평가하기
                      </a>
                    </Button>
                  </div>
                ) : (
                  <ChatComposer onSend={sendMessage} onTypingChange={updateTypingState} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
